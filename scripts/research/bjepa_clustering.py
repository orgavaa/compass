"""B-JEPA clustering analysis on 42 AMR target loci.

Weeks 8-10 experiment: do B-JEPA genomic embeddings capture resistance
mechanism structure beyond GC composition?

Hypothesis: if JEPA learns functional genomic features during masked-
prediction pre-training, target loci should cluster by resistance mechanism
(e.g., RRDR mutations vs topoisomerase QRDR vs ribosomal targets) rather
than by organism (which would indicate mere GC composition learning).

Controls:
  1. GC null model: replace JEPA embeddings with [GC%, 16 dinucleotide freqs]
     → if JEPA ARI ≤ GC-null ARI, JEPA has not learned beyond composition
  2. Random null: random 256-dim vectors → same pipeline

References:
  - Assran et al. "Self-Supervised Learning from Images with a Joint-
    Embedding Predictive Architecture." CVPR 2023.
  - McInnes et al. "UMAP: Uniform Manifold Approximation and Projection
    for Dimension Reduction." arXiv:1802.03426.

Usage:
    python scripts/research/bjepa_clustering.py
    python scripts/research/bjepa_clustering.py --checkpoint compass-net/checkpoints/bjepa/epoch_50.pt

Output:
    results/research/bjepa_clustering/
        embeddings.npz              — raw 256-dim embeddings per target
        clustering_results.json     — ARI, silhouette, Mantel test
        umap_coordinates.csv        — 2D projections for plotting
        figures/                    — UMAP plots coloured by organism/drug/mechanism
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

RESULTS_DIR = Path("results/research/bjepa_clustering")
CONTEXTS_PATH = Path("data/card/target_contexts.json")
METADATA_PATH = Path("data/card/amr_target_metadata.csv")

# Resistance mechanism groupings for ARI evaluation
# Based on molecular target and mechanism of resistance
MECHANISM_LABELS = {
    # RRDR mutations (RNA polymerase beta subunit)
    "rpoB_S531L": "RRDR", "rpoB_H526Y": "RRDR", "rpoB_D516V": "RRDR",
    "rpoB_H481N": "RRDR", "rpoB_S464P": "RRDR",
    # DNA gyrase QRDR
    "gyrA_D94G": "QRDR_gyrA", "gyrA_A90V": "QRDR_gyrA",
    "gyrA_S83L": "QRDR_gyrA", "gyrA_D87N": "QRDR_gyrA",
    "gyrA_S84L": "QRDR_gyrA", "gyrA_S91F": "QRDR_gyrA",
    "gyrA_D95A": "QRDR_gyrA", "gyrA_D95G": "QRDR_gyrA",
    # Topoisomerase IV QRDR
    "parC_S80I": "QRDR_parC", "parC_E84V": "QRDR_parC",
    "grlA_S80F": "QRDR_parC", "grlA_S80Y": "QRDR_parC",
    "parC_D86N": "QRDR_parC", "parC_S87R": "QRDR_parC",
    # Cell wall synthesis (PBP2 mosaic)
    "penA_A501V": "PBP2", "penA_A501T": "PBP2", "penA_G545S": "PBP2",
    "penA_I312M": "PBP2", "penA_V316T": "PBP2", "penA_T483S": "PBP2",
    # Cell wall synthesis (arabinosyltransferase)
    "embB_M306V": "arabinosyl", "embB_M306I": "arabinosyl",
    # Catalase-peroxidase (prodrug activation)
    "katG_S315T": "prodrug_activation",
    # Pyrazinamidase (prodrug activation)
    "pncA_H57D": "prodrug_activation", "pncA_D49N": "prodrug_activation",
    # Ribosomal targets (16S/23S rRNA)
    "rrs_A1401G": "ribosomal", "rrs_C1402T": "ribosomal",
    "23S_rRNA_C2611T": "ribosomal", "23S_rRNA_A2059G": "ribosomal",
    # Promoter mutations (transcriptional regulation)
    "fabG1_C-15T": "promoter", "eis_C-14T": "promoter",
    "ampC_C-42T": "promoter", "mtrR_A-35del": "promoter",
    # Other
    "fusA_L461K": "elongation_factor",
    "dfrB_F99Y": "folate_pathway",
    "mprF_S295L": "membrane_modification",
    "folP_R228S": "folate_pathway",
}


# ======================================================================
# Data loading
# ======================================================================


def load_target_contexts() -> list[dict]:
    """Load target contexts with their genomic sequences."""
    if not CONTEXTS_PATH.exists():
        raise FileNotFoundError(
            f"Target contexts not found at {CONTEXTS_PATH}. "
            "Run: python scripts/research/extract_target_contexts.py"
        )
    with open(CONTEXTS_PATH) as f:
        contexts = json.load(f)
    resolved = [c for c in contexts if c.get("resolved")]
    logger.info("Loaded %d resolved target contexts", len(resolved))
    return resolved


def load_metadata() -> dict[str, dict]:
    """Load target metadata."""
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Metadata not found at {METADATA_PATH}")
    with open(METADATA_PATH) as f:
        return {r["label"]: r for r in csv.DictReader(f)}


# ======================================================================
# Embedding computation
# ======================================================================


def compute_jepa_embeddings(
    contexts: list[dict],
    checkpoint_path: str | None = None,
) -> np.ndarray:
    """Compute B-JEPA embeddings for all target loci.

    Uses the genomic context (±250bp = 500bp) around each mutation as input
    to the B-JEPA encoder, which was pre-trained on masked prediction of
    genomic patches.

    Args:
        contexts: list of target context dicts with 'wildtype_context' key
        checkpoint_path: path to B-JEPA encoder checkpoint (optional)

    Returns:
        (N, 256) embedding matrix
    """
    from compass.scoring.jepa import JEPAScorer, JEPAMode

    # Find encoder checkpoint
    if checkpoint_path:
        encoder_path = Path(checkpoint_path)
    else:
        # Search for latest checkpoint
        ckpt_dir = Path("compass-net/checkpoints/bjepa")
        if ckpt_dir.exists():
            ckpts = sorted(ckpt_dir.glob("epoch_*.pt"), key=lambda p: p.stat().st_mtime)
            if ckpts:
                encoder_path = ckpts[-1]
                logger.info("Using latest B-JEPA checkpoint: %s", encoder_path)
            else:
                raise FileNotFoundError(f"No B-JEPA checkpoints in {ckpt_dir}")
        else:
            raise FileNotFoundError(
                "B-JEPA checkpoints not found. "
                "Train B-JEPA first or provide --checkpoint."
            )

    # Dummy head path (we only need encoder for embeddings)
    head_path = encoder_path  # embed_genomic_context uses encoder only

    scorer = JEPAScorer(
        encoder_path=str(encoder_path),
        head_path=str(head_path),
        mode=JEPAMode.CONTEXT,
        embed_dim=256,
        context_window=512,
    )

    embeddings = []
    for ctx in contexts:
        wt_context = ctx["wildtype_context"]
        # Pad/trim to 512 bp (B-JEPA context window)
        if len(wt_context) < 512:
            wt_context = wt_context.center(512, "N")
        elif len(wt_context) > 512:
            mid = len(wt_context) // 2
            wt_context = wt_context[mid - 256: mid + 256]

        emb = scorer.embed_genomic_context(wt_context)
        embeddings.append(emb)
        logger.info("  %s: emb norm=%.3f", ctx["label"], np.linalg.norm(emb))

    return np.array(embeddings)


def compute_gc_null_features(contexts: list[dict]) -> np.ndarray:
    """GC null model: [GC%, 16 dinucleotide frequencies].

    This is the key control — if B-JEPA clustering is no better than
    dinucleotide composition, the model has not learned functional structure.
    """
    features = []
    dinucs = [a + b for a in "ACGT" for b in "ACGT"]  # 16 dinucleotides

    for ctx in contexts:
        seq = ctx["wildtype_context"].upper()
        n = len(seq)

        # GC content
        gc = (seq.count("G") + seq.count("C")) / n if n > 0 else 0

        # Dinucleotide frequencies
        di_counts = {d: 0 for d in dinucs}
        for i in range(n - 1):
            di = seq[i:i + 2]
            if di in di_counts:
                di_counts[di] += 1
        total_di = max(n - 1, 1)
        di_freqs = [di_counts[d] / total_di for d in dinucs]

        features.append([gc] + di_freqs)

    return np.array(features)  # (N, 17)


def compute_random_null(n_samples: int, dim: int = 256) -> np.ndarray:
    """Random null model: uniform random vectors."""
    rng = np.random.default_rng(42)
    return rng.standard_normal((n_samples, dim))


# ======================================================================
# Clustering and evaluation
# ======================================================================


def run_umap(embeddings: np.ndarray, n_neighbors: int = 15, min_dist: float = 0.1,
             metric: str = "cosine") -> np.ndarray:
    """UMAP dimensionality reduction to 2D."""
    try:
        from umap import UMAP
    except ImportError:
        raise ImportError("UMAP not installed. Install via: pip install umap-learn")

    reducer = UMAP(
        n_components=2,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        metric=metric,
        random_state=42,
    )
    coords = reducer.fit_transform(embeddings)
    return coords


def run_hdbscan(coords: np.ndarray, min_cluster_size: int = 3) -> np.ndarray:
    """HDBSCAN clustering on 2D UMAP coordinates."""
    try:
        from hdbscan import HDBSCAN
    except ImportError:
        # Fallback to sklearn HDBSCAN (available in scikit-learn >= 1.3)
        try:
            from sklearn.cluster import HDBSCAN
        except ImportError:
            raise ImportError("HDBSCAN not available. Install: pip install hdbscan")

    clusterer = HDBSCAN(min_cluster_size=min_cluster_size)
    labels = clusterer.fit_predict(coords)
    return labels


def compute_ari(labels_true: np.ndarray, labels_pred: np.ndarray) -> float:
    """Adjusted Rand Index between two label assignments.

    ARI = 0 for random, 1 for perfect agreement, can be negative.
    Ref: Hubert & Arabie, "Comparing partitions", J Classification 1985.
    """
    from sklearn.metrics import adjusted_rand_score
    return float(adjusted_rand_score(labels_true, labels_pred))


def compute_silhouette(embeddings: np.ndarray, labels: np.ndarray) -> float:
    """Mean silhouette score.

    Ref: Rousseeuw, "Silhouettes: a graphical aid to interpretation",
    J Comp Applied Math 1987.
    """
    from sklearn.metrics import silhouette_score
    unique = np.unique(labels)
    if len(unique) < 2:
        return 0.0
    return float(silhouette_score(embeddings, labels, metric="cosine"))


def compute_mantel_test(
    embeddings: np.ndarray,
    sequences: list[str],
    n_perms: int = 9999,
) -> tuple[float, float]:
    """Mantel test: correlation between embedding distance matrix and
    sequence identity matrix.

    Tests whether embedding distances reflect sequence similarity
    (expected) or capture higher-order functional structure (unexpected).

    Ref: Mantel, "The detection of disease clustering and a generalized
    regression approach", Cancer Research 1967.

    Returns:
        (r_mantel, p_value)
    """
    from scipy.spatial.distance import pdist, squareform

    # Embedding distance matrix (cosine)
    emb_dist = pdist(embeddings, metric="cosine")

    # Sequence distance matrix (1 - identity)
    n = len(sequences)
    seq_dist = np.zeros(n * (n - 1) // 2)
    idx = 0
    for i in range(n):
        for j in range(i + 1, n):
            s1, s2 = sequences[i].upper(), sequences[j].upper()
            min_len = min(len(s1), len(s2))
            if min_len == 0:
                seq_dist[idx] = 1.0
            else:
                # Truncate to equal length for comparison
                matches = sum(a == b for a, b in zip(s1[:min_len], s2[:min_len]))
                seq_dist[idx] = 1.0 - matches / min_len
            idx += 1

    # Observed Pearson correlation
    from scipy.stats import pearsonr
    r_obs, _ = pearsonr(emb_dist, seq_dist)

    # Permutation test
    rng = np.random.default_rng(42)
    n_greater = 0
    for _ in range(n_perms):
        perm_idx = rng.permutation(n)
        # Reconstruct permuted embedding distances
        perm_emb = embeddings[perm_idx]
        perm_dist = pdist(perm_emb, metric="cosine")
        r_perm, _ = pearsonr(perm_dist, seq_dist)
        if abs(r_perm) >= abs(r_obs):
            n_greater += 1

    p_val = (n_greater + 1) / (n_perms + 1)
    return round(float(r_obs), 4), round(float(p_val), 4)


# ======================================================================
# Full analysis pipeline
# ======================================================================


def run_full_analysis(
    embeddings: np.ndarray,
    contexts: list[dict],
    metadata: dict[str, dict],
    model_name: str,
) -> dict:
    """Run complete clustering analysis for one embedding type."""
    n = len(contexts)
    labels = [ctx["label"] for ctx in contexts]

    # Prepare ground-truth label arrays
    organism_labels = np.array([ctx["organism_id"] for ctx in contexts])
    drug_labels = np.array([metadata.get(l, {}).get("drug_class", "UNK") for l in labels])
    mechanism_labels = np.array([MECHANISM_LABELS.get(l, "other") for l in labels])

    # Integer-encode for ARI
    from sklearn.preprocessing import LabelEncoder
    le_org = LabelEncoder().fit(organism_labels)
    le_drug = LabelEncoder().fit(drug_labels)
    le_mech = LabelEncoder().fit(mechanism_labels)

    org_int = le_org.transform(organism_labels)
    drug_int = le_drug.transform(drug_labels)
    mech_int = le_mech.transform(mechanism_labels)

    # UMAP
    logger.info("\n--- %s: UMAP ---", model_name)
    coords = run_umap(embeddings)

    # HDBSCAN
    cluster_labels = run_hdbscan(coords, min_cluster_size=3)
    n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
    n_noise = int(np.sum(cluster_labels == -1))
    logger.info("HDBSCAN: %d clusters, %d noise points", n_clusters, n_noise)

    # ARI against three groupings
    ari_organism = compute_ari(org_int, cluster_labels)
    ari_drug = compute_ari(drug_int, cluster_labels)
    ari_mechanism = compute_ari(mech_int, cluster_labels)

    logger.info("ARI vs organism:  %.3f", ari_organism)
    logger.info("ARI vs drug:      %.3f", ari_drug)
    logger.info("ARI vs mechanism: %.3f", ari_mechanism)

    # Silhouette scores (using embeddings, not UMAP coords)
    sil_org = compute_silhouette(embeddings, org_int)
    sil_drug = compute_silhouette(embeddings, drug_int)
    sil_mech = compute_silhouette(embeddings, mech_int)

    logger.info("Silhouette (organism):  %.3f", sil_org)
    logger.info("Silhouette (drug):      %.3f", sil_drug)
    logger.info("Silhouette (mechanism): %.3f", sil_mech)

    # Mantel test
    sequences = [ctx["wildtype_context"] for ctx in contexts]
    r_mantel, p_mantel = compute_mantel_test(embeddings, sequences, n_perms=9999)
    logger.info("Mantel test: r=%.3f, p=%.4f", r_mantel, p_mantel)

    return {
        "model": model_name,
        "n_targets": n,
        "n_clusters": n_clusters,
        "n_noise": n_noise,
        "ari_organism": ari_organism,
        "ari_drug": ari_drug,
        "ari_mechanism": ari_mechanism,
        "silhouette_organism": sil_org,
        "silhouette_drug": sil_drug,
        "silhouette_mechanism": sil_mech,
        "mantel_r": r_mantel,
        "mantel_p": p_mantel,
        "umap_coords": coords.tolist(),
        "cluster_labels": cluster_labels.tolist(),
    }


# ======================================================================
# GC-residual analysis
# ======================================================================


def compute_gc_residual_embeddings(
    embeddings: np.ndarray,
    contexts: list[dict],
) -> np.ndarray:
    """Remove per-organism mean embedding to control for GC composition.

    If organism clustering is perfect, it likely reflects GC bias. This
    computes GC-residual embeddings = embedding - organism_mean, then
    re-evaluates clustering. If mechanism clustering IMPROVES or persists
    after GC correction, the model captures functional structure.
    """
    by_org = defaultdict(list)
    for i, ctx in enumerate(contexts):
        by_org[ctx["organism_id"]].append(i)

    residuals = embeddings.copy()
    for org_id, indices in by_org.items():
        org_mean = embeddings[indices].mean(axis=0)
        for i in indices:
            residuals[i] -= org_mean
        logger.info("  %s: subtracted mean (n=%d)", org_id, len(indices))

    return residuals


# ======================================================================
# Main
# ======================================================================


def main():
    parser = argparse.ArgumentParser(description="B-JEPA clustering analysis")
    parser.add_argument("--checkpoint", type=str, default=None,
                        help="B-JEPA encoder checkpoint path")
    parser.add_argument("--skip-jepa", action="store_true",
                        help="Skip JEPA (run GC and random null only)")
    args = parser.parse_args()

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "figures").mkdir(exist_ok=True)

    # Save experiment config
    with open(RESULTS_DIR / "experiment_config.json", "w") as f:
        json.dump({
            "experiment": "bjepa_clustering",
            "timestamp": datetime.now().isoformat(),
            "checkpoint": args.checkpoint,
            "umap_params": {"n_neighbors": 15, "min_dist": 0.1, "metric": "cosine"},
            "hdbscan_params": {"min_cluster_size": 3},
            "mantel_perms": 9999,
            "mechanism_groups": len(set(MECHANISM_LABELS.values())),
        }, f, indent=2)

    # Load data
    contexts = load_target_contexts()
    metadata = load_metadata()

    all_results = {}

    # --- 1. B-JEPA embeddings ---
    if not args.skip_jepa:
        try:
            logger.info("\n=== B-JEPA Embeddings ===")
            jepa_emb = compute_jepa_embeddings(contexts, args.checkpoint)
            np.savez(RESULTS_DIR / "embeddings.npz", jepa=jepa_emb)

            jepa_results = run_full_analysis(jepa_emb, contexts, metadata, "B-JEPA")
            all_results["jepa"] = jepa_results

            # GC-residual analysis
            logger.info("\n=== B-JEPA GC-Residual ===")
            jepa_residual = compute_gc_residual_embeddings(jepa_emb, contexts)
            residual_results = run_full_analysis(jepa_residual, contexts, metadata, "B-JEPA (GC-residual)")
            all_results["jepa_gc_residual"] = residual_results

        except (FileNotFoundError, ImportError) as e:
            logger.warning("B-JEPA not available: %s", e)
            logger.info("Running GC null and random null only.")

    # --- 2. GC null model ---
    logger.info("\n=== GC Null Model (17-dim: GC% + dinucleotide freqs) ===")
    gc_features = compute_gc_null_features(contexts)
    gc_results = run_full_analysis(gc_features, contexts, metadata, "GC-null")
    all_results["gc_null"] = gc_results

    # --- 3. Random null ---
    logger.info("\n=== Random Null (256-dim) ===")
    random_emb = compute_random_null(len(contexts), dim=256)
    random_results = run_full_analysis(random_emb, contexts, metadata, "Random-null")
    all_results["random_null"] = random_results

    # --- Save all results ---
    with open(RESULTS_DIR / "clustering_results.json", "w") as f:
        json.dump(all_results, f, indent=2)

    # --- Save UMAP coordinates for plotting ---
    umap_rows = []
    for model_name, results in all_results.items():
        if "umap_coords" in results:
            for i, ctx in enumerate(contexts):
                umap_rows.append({
                    "model": model_name,
                    "label": ctx["label"],
                    "organism_id": ctx["organism_id"],
                    "gene": ctx["gene"],
                    "mechanism": MECHANISM_LABELS.get(ctx["label"], "other"),
                    "umap_x": results["umap_coords"][i][0],
                    "umap_y": results["umap_coords"][i][1],
                    "cluster": results["cluster_labels"][i],
                })
    if umap_rows:
        with open(RESULTS_DIR / "umap_coordinates.csv", "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=umap_rows[0].keys())
            writer.writeheader()
            writer.writerows(umap_rows)

    # --- Summary ---
    logger.info("\n" + "=" * 70)
    logger.info("CLUSTERING ANALYSIS SUMMARY")
    logger.info("=" * 70)
    logger.info("")
    logger.info("%-25s %8s %8s %8s %8s",
                "Model", "ARI-org", "ARI-drug", "ARI-mech", "Mantel-r")
    logger.info("-" * 70)
    for name, r in all_results.items():
        logger.info("%-25s %8.3f %8.3f %8.3f %8.3f",
                    r["model"],
                    r["ari_organism"], r["ari_drug"],
                    r["ari_mechanism"], r["mantel_r"])

    # Decision gate
    logger.info("\n=== DECISION GATE ===")
    if "jepa" in all_results:
        jepa = all_results["jepa"]
        gc = all_results["gc_null"]

        if jepa["ari_mechanism"] > 0.3:
            logger.info("POSITIVE: B-JEPA ARI(mechanism)=%.3f > 0.3", jepa["ari_mechanism"])
            logger.info("  → JEPA captures functional structure")
        else:
            logger.info("NEGATIVE: B-JEPA ARI(mechanism)=%.3f ≤ 0.3", jepa["ari_mechanism"])

        if jepa["ari_organism"] > 0.8 and jepa["ari_mechanism"] < gc["ari_mechanism"]:
            logger.info("WARNING: Perfect organism clustering + low mechanism clustering")
            logger.info("  → JEPA likely reflects GC composition, not function")
            if "jepa_gc_residual" in all_results:
                res = all_results["jepa_gc_residual"]
                logger.info("  GC-residual ARI(mechanism) = %.3f", res["ari_mechanism"])
                if res["ari_mechanism"] > gc["ari_mechanism"]:
                    logger.info("  → After GC correction, mechanism signal emerges → PARTIAL POSITIVE")
                else:
                    logger.info("  → After GC correction, no mechanism signal → NEGATIVE")
    else:
        logger.info("B-JEPA not evaluated. GC-null ARI(mechanism)=%.3f (baseline)",
                    all_results.get("gc_null", {}).get("ari_mechanism", 0))


if __name__ == "__main__":
    main()
