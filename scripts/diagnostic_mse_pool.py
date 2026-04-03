"""
Architecture diagnostic: 4 configs to isolate loss vs pooling effect.

  1. baseline:    Huber + 0.5*ranking + AvgPool    (current)
  2. mse_only:    MSE + AvgPool                    (loss fix only)
  3. concat_pool: Huber + 0.5*ranking + concat(avg,max) (pool fix only)
  4. mse_concat:  MSE + concat(avg,max)            (both fixes)

All use CNN+RNA-FM, seed 42, Phase 1 only (efficiency).
"""
import time
import logging
import numpy as np
import torch
import torch.nn as nn
from scipy.stats import spearmanr
from torch.utils.data import DataLoader

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger()

from compass_net.compass_ml import CompassML
from compass_net.data.embedding_cache import EmbeddingCache
from compass_net.data.loaders.load_kim2018 import load_kim2018_domains
from compass_net.data.paired_loader import SingleTargetDataset
from compass_net.training.train_compass_ml import collate_single_target, _get_batch_embeddings
from compass_net.training.reproducibility import seed_everything
from compass_net.losses.multitask_loss import MultiTaskLoss


class ConcatPoolCompassML(CompassML):
    """CompassML with concat(avg, max) pooling instead of avg-only."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Figure out fused_dim from the existing architecture
        # Default: cnn_out=64 + rnafm_proj=64 = 128
        fused_dim = 128  # CNN 64 + RNA-FM 64
        dense_dim = fused_dim * 2  # avg + max concatenated = 256

        # Replace efficiency head with wider input
        self.efficiency_head = nn.Sequential(
            nn.Linear(dense_dim, 64),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Dropout(0.21),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def _pool_and_append_scalars(self, fused, scalar_features=None):
        # fused: (batch, seq_len, fused_dim)
        x = fused.permute(0, 2, 1)  # (batch, fused_dim, seq_len)
        avg = x.mean(dim=-1)  # (batch, fused_dim)
        mx = x.max(dim=-1).values  # (batch, fused_dim)
        pooled = torch.cat([avg, mx], dim=-1)  # (batch, fused_dim*2)
        if scalar_features is not None:
            pooled = torch.cat([pooled, scalar_features], dim=-1)
        return pooled


def make_loaders(data):
    """Create train/val/test dataloaders with raw/100 normalization."""
    train_d = data['train_domains'][0]

    def norm(acts):
        return (np.clip(np.array(acts), 0, 100) / 100.0).tolist()

    train_ds = SingleTargetDataset(train_d['sequences'], norm(train_d['activities']))
    val_ds = SingleTargetDataset(data['val_sequences'], norm(data['val_activities']))
    test_ds = SingleTargetDataset(data['test_sequences'], norm(data['test_activities']))

    kw = dict(collate_fn=collate_single_target, num_workers=0)
    train_loader = DataLoader(train_ds, batch_size=256, shuffle=True, **kw)
    val_loader = DataLoader(val_ds, batch_size=512, shuffle=False, **kw)
    test_loader = DataLoader(test_ds, batch_size=512, shuffle=False, **kw)
    return train_loader, val_loader, test_loader


def train_and_eval(model, loss_type, name, train_loader, val_loader, test_loader,
                   cache, test_acts_raw, train_acts_raw, seed=42):
    seed_everything(seed)
    device = torch.device('cpu')
    model = model.to(device)

    if loss_type == 'mse':
        criterion = nn.MSELoss()
    else:
        criterion = MultiTaskLoss(lambda_disc=0.0, lambda_rank=0.5)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=50, T_mult=2, eta_min=1e-6
    )

    best_val_rho = -1.0
    patience_counter = 0
    best_state = None
    n_epochs = 200
    patience = 20

    t0 = time.time()
    for epoch in range(n_epochs):
        # Anneal spearman strength for multitask loss
        if loss_type != 'mse' and hasattr(criterion, 'set_spearman_strength'):
            s = max(0.1, 1.0 - 0.9 * epoch / n_epochs)
            criterion.set_spearman_strength(s)

        model.train()
        for batch in train_loader:
            target_oh = batch['target_onehot'].to(device)
            eff = batch['efficiency'].to(device)
            crrna_emb = _get_batch_embeddings(batch['crrna_spacer'], cache, device)

            out = model(target_onehot=target_oh, crrna_rnafm_emb=crrna_emb)
            pred = out['efficiency'].squeeze(-1)

            if loss_type == 'mse':
                loss = criterion(pred, eff)
            else:
                loss = criterion(pred_eff=out['efficiency'], true_eff=eff)['total']

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        scheduler.step()

        # Validate
        model.eval()
        val_preds, val_targets = [], []
        with torch.no_grad():
            for batch in val_loader:
                crrna_emb = _get_batch_embeddings(batch['crrna_spacer'], cache, device)
                out = model(target_onehot=batch['target_onehot'].to(device), crrna_rnafm_emb=crrna_emb)
                val_preds.extend(out['efficiency'].squeeze(-1).cpu().tolist())
                val_targets.extend(batch['efficiency'].tolist())

        val_rho = spearmanr(val_preds, val_targets).statistic
        if np.isnan(val_rho):
            val_rho = 0.0

        if val_rho > best_val_rho:
            best_val_rho = val_rho
            patience_counter = 0
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1

        if (epoch + 1) % 10 == 0 or epoch == 0:
            logger.info(f"  [{name}] Epoch {epoch+1:3d} | Val rho: {val_rho:.4f} | Best: {best_val_rho:.4f} | Patience: {patience_counter}/{patience}")

        if patience_counter >= patience:
            logger.info(f"  [{name}] Early stop at epoch {epoch+1}")
            break

    elapsed = time.time() - t0

    # Load best and evaluate
    model.load_state_dict(best_state)
    model.eval()

    def predict(loader):
        preds = []
        with torch.no_grad():
            for batch in loader:
                crrna_emb = _get_batch_embeddings(batch['crrna_spacer'], cache, device)
                out = model(target_onehot=batch['target_onehot'].to(device), crrna_rnafm_emb=crrna_emb)
                preds.extend(out['efficiency'].squeeze(-1).cpu().tolist())
        return np.array(preds)

    test_preds = predict(test_loader)
    train_preds = predict(train_loader)

    test_rho = spearmanr(test_preds, test_acts_raw).statistic
    train_rho = spearmanr(train_preds, train_acts_raw).statistic

    return {
        'name': name,
        'train_rho': round(float(train_rho), 4),
        'val_rho': round(float(best_val_rho), 4),
        'test_rho': round(float(test_rho), 4),
        'gap_val_test': round(float(best_val_rho - test_rho), 4),
        'epochs': epoch + 1,
        'time_s': round(elapsed, 1),
        'pred_std': round(float(test_preds.std()), 4),
    }


def main():
    logger.info("Loading data...")
    data = load_kim2018_domains()
    cache = EmbeddingCache('compass/data/embeddings/rnafm')
    train_loader, val_loader, test_loader = make_loaders(data)

    train_d = data['train_domains'][0]
    train_acts_raw = np.array(train_d['activities'])
    test_acts_raw = np.array(data['test_activities'])

    configs = [
        ("baseline",    CompassML,          'huber_rank'),
        ("mse_only",    CompassML,          'mse'),
        ("concat_pool", ConcatPoolCompassML, 'huber_rank'),
        ("mse_concat",  ConcatPoolCompassML, 'mse'),
    ]

    results = []
    for name, model_cls, loss_type in configs:
        logger.info(f"\n{'='*60}")
        logger.info(f"Config: {name} (loss={loss_type}, pool={'concat' if model_cls == ConcatPoolCompassML else 'avg'})")
        logger.info(f"{'='*60}")

        model = model_cls(use_rnafm=True, use_rloop_attention=False, multitask=False)
        n_params = sum(p.numel() for p in model.parameters())
        logger.info(f"  Parameters: {n_params:,}")

        result = train_and_eval(
            model, loss_type, name,
            train_loader, val_loader, test_loader,
            cache, test_acts_raw, train_acts_raw,
        )
        results.append(result)
        logger.info(f"  RESULT: train={result['train_rho']:.4f} val={result['val_rho']:.4f} test={result['test_rho']:.4f} gap={result['gap_val_test']:.4f}")

    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("DIAGNOSTIC SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"{'Config':<15} {'Train':>8} {'Val':>8} {'Test':>8} {'Gap':>8} {'PredStd':>8} {'Time':>6}")
    logger.info("-" * 70)
    for r in results:
        logger.info(f"{r['name']:<15} {r['train_rho']:>8.4f} {r['val_rho']:>8.4f} {r['test_rho']:>8.4f} {r['gap_val_test']:>8.4f} {r['pred_std']:>8.4f} {r['time_s']:>5.0f}s")

    # Analysis
    logger.info("\n--- EFFECT ISOLATION ---")
    baseline = results[0]
    mse = results[1]
    concat = results[2]
    both = results[3]

    loss_effect = mse['test_rho'] - baseline['test_rho']
    pool_effect = concat['test_rho'] - baseline['test_rho']
    combined = both['test_rho'] - baseline['test_rho']
    interaction = combined - (loss_effect + pool_effect)

    logger.info(f"Loss effect (MSE vs Huber+rank):     {loss_effect:+.4f}")
    logger.info(f"Pool effect (concat vs avg):          {pool_effect:+.4f}")
    logger.info(f"Combined effect:                      {combined:+.4f}")
    logger.info(f"Interaction (synergy):                {interaction:+.4f}")


if __name__ == '__main__':
    main()
