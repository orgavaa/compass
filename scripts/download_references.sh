#!/usr/bin/env bash
# Download reference genomes for all supported organisms.
# Usage: bash scripts/download_references.sh
#
# Downloads FASTA + GFF3 from NCBI for each organism and places them
# in data/references/. Skips files that already exist.

set -euo pipefail

REFS_DIR="data/references"
mkdir -p "$REFS_DIR"

# ── Helpers ──────────────────────────────────────────────────────────
download_fasta() {
  local acc="$1" out="$2" label="$3"
  if [[ -f "$out" ]]; then
    echo "  [skip] $out already exists"
    return
  fi
  echo "  Downloading $label FASTA ($acc)..."
  # NCBI datasets CLI or efetch; fall back to direct FTP URL
  local url="https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/${acc}/download?include_annotation_type=GENOME_FASTA"
  local zip="${out}.zip"
  curl -sL "$url" -o "$zip"
  # Extract the FASTA from the zip
  unzip -o -j "$zip" "ncbi_dataset/data/${acc}/*.fna" -d "$(dirname "$out")" 2>/dev/null || true
  # Rename the extracted .fna to the expected name
  local fna
  fna=$(find "$(dirname "$out")" -maxdepth 1 -name "*.fna" -newer "$zip" 2>/dev/null | head -1)
  if [[ -z "$fna" ]]; then
    # Try alternate extraction path
    fna=$(find "$(dirname "$out")" -maxdepth 1 -name "*.fna" | head -1)
  fi
  if [[ -n "$fna" && "$fna" != "$out" ]]; then
    mv "$fna" "$out"
  fi
  rm -f "$zip"
  if [[ -f "$out" ]]; then
    echo "  [ok] $out ($(wc -c < "$out") bytes)"
  else
    echo "  [fallback] Trying efetch..."
    # Fallback: use efetch if datasets API didn't work
    if command -v efetch &>/dev/null; then
      efetch -db nucleotide -id "$acc" -format fasta > "$out"
    else
      echo "  [error] Could not download $label. Install NCBI datasets CLI or E-utilities."
      echo "         Manual: https://www.ncbi.nlm.nih.gov/nuccore/${acc}"
      return 1
    fi
  fi
}

download_gff() {
  local acc="$1" out="$2" label="$3"
  if [[ -f "$out" ]]; then
    echo "  [skip] $out already exists"
    return
  fi
  echo "  Downloading $label GFF3 ($acc)..."
  local url="https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/${acc}/download?include_annotation_type=GENOME_GFF"
  local zip="${out}.zip"
  curl -sL "$url" -o "$zip"
  unzip -o -j "$zip" "ncbi_dataset/data/${acc}/*.gff" -d "$(dirname "$out")" 2>/dev/null || true
  local gff
  gff=$(find "$(dirname "$out")" -maxdepth 1 -name "*.gff" -newer "$zip" 2>/dev/null | head -1)
  if [[ -z "$gff" ]]; then
    gff=$(find "$(dirname "$out")" -maxdepth 1 -name "*.gff" | grep -v "H37Rv" | head -1)
  fi
  if [[ -n "$gff" && "$gff" != "$out" ]]; then
    mv "$gff" "$out"
  fi
  rm -f "$zip"
  if [[ -f "$out" ]]; then
    echo "  [ok] $out"
  else
    echo "  [warn] GFF3 not found in download — pipeline can still run without annotations"
  fi
}

# ── MTB (already present, verify) ───────────────────────────────────
echo "=== Mycobacterium tuberculosis (H37Rv) ==="
if [[ -f "$REFS_DIR/H37Rv.fasta" ]]; then
  echo "  [ok] Already present"
else
  download_fasta "GCF_000195955.2" "$REFS_DIR/H37Rv.fasta" "M. tuberculosis H37Rv"
  download_gff   "GCF_000195955.2" "$REFS_DIR/H37Rv.gff3"  "M. tuberculosis H37Rv"
fi

# ── E. coli K-12 MG1655 ────────────────────────────────────────────
echo ""
echo "=== Escherichia coli (K-12 MG1655) ==="
download_fasta "GCF_000005845.2" "$REFS_DIR/ecoli_K12.fasta" "E. coli K-12"
download_gff   "GCF_000005845.2" "$REFS_DIR/ecoli_K12.gff3"  "E. coli K-12"

# ── S. aureus NCTC 8325 ────────────────────────────────────────────
echo ""
echo "=== Staphylococcus aureus (NCTC 8325) ==="
download_fasta "GCF_000013425.1" "$REFS_DIR/saureus_NCTC8325.fasta" "S. aureus NCTC 8325"
download_gff   "GCF_000013425.1" "$REFS_DIR/saureus_NCTC8325.gff3"  "S. aureus NCTC 8325"

# ── N. gonorrhoeae FA 1090 ─────────────────────────────────────────
echo ""
echo "=== Neisseria gonorrhoeae (FA 1090) ==="
download_fasta "GCF_000006845.1" "$REFS_DIR/ngono_FA1090.fasta" "N. gonorrhoeae FA 1090"
download_gff   "GCF_000006845.1" "$REFS_DIR/ngono_FA1090.gff3"  "N. gonorrhoeae FA 1090"

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "=== Reference genome status ==="
for f in H37Rv.fasta ecoli_K12.fasta saureus_NCTC8325.fasta ngono_FA1090.fasta; do
  if [[ -f "$REFS_DIR/$f" ]]; then
    size=$(wc -c < "$REFS_DIR/$f")
    echo "  [ok] $f ($size bytes)"
  else
    echo "  [MISSING] $f"
  fi
done

echo ""
echo "NOTE: Bowtie2 indices are built automatically by the pipeline on first run."
echo "      If you want to pre-build them, run:"
echo "        bowtie2-build data/references/ecoli_K12.fasta data/references/ecoli_K12"
echo "        bowtie2-build data/references/saureus_NCTC8325.fasta data/references/saureus_NCTC8325"
echo "        bowtie2-build data/references/ngono_FA1090.fasta data/references/ngono_FA1090"
