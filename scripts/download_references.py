"""Download reference genomes for all supported COMPASS organisms.

Usage:
    python scripts/download_references.py

Downloads FASTA + GFF3 from NCBI for each organism into data/references/.
Skips files that already exist.
"""

import io
import zipfile
from pathlib import Path
from urllib.request import urlopen, Request

REFS_DIR = Path("data/references")

# GCF accession → (fasta_name, gff_name, label)
ORGANISMS = {
    "GCF_000195955.2": ("H37Rv.fasta", "H37Rv.gff3", "M. tuberculosis H37Rv"),
    "GCF_000005845.2": ("ecoli_K12.fasta", "ecoli_K12.gff3", "E. coli K-12 MG1655"),
    "GCF_000013425.1": ("saureus_NCTC8325.fasta", "saureus_NCTC8325.gff3", "S. aureus NCTC 8325"),
    "GCF_000006845.1": ("ngono_FA1090.fasta", "ngono_FA1090.gff3", "N. gonorrhoeae FA 1090"),
}


def download_from_ncbi(accession: str, include: str) -> bytes:
    """Download a dataset zip from NCBI Datasets API."""
    url = (
        f"https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/"
        f"{accession}/download?include_annotation_type={include}"
    )
    req = Request(url, headers={"Accept": "application/zip"})
    print(f"    GET {url[:80]}...")
    with urlopen(req, timeout=120) as resp:
        return resp.read()


def extract_file(zip_bytes: bytes, extension: str) -> bytes | None:
    """Extract first file matching extension from NCBI dataset zip."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            if name.endswith(extension):
                return zf.read(name)
    return None


def download_efetch_fasta(accession: str) -> bytes:
    """Fallback: download FASTA via NCBI efetch (nucleotide accession)."""
    # Map GCF to nucleotide accession
    nuc_map = {
        "GCF_000195955.2": "NC_000962.3",
        "GCF_000005845.2": "NC_000913.3",
        "GCF_000013425.1": "NC_007795.1",
        "GCF_000006845.1": "NC_002946.2",
    }
    nuc_acc = nuc_map.get(accession)
    if not nuc_acc:
        raise ValueError(f"No nucleotide accession known for {accession}")
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id={nuc_acc}&rettype=fasta&retmode=text"
    print(f"    [fallback] efetch {nuc_acc}...")
    with urlopen(url, timeout=120) as resp:
        return resp.read()


def main():
    REFS_DIR.mkdir(parents=True, exist_ok=True)

    for accession, (fasta_name, gff_name, label) in ORGANISMS.items():
        fasta_path = REFS_DIR / fasta_name
        gff_path = REFS_DIR / gff_name

        print(f"\n=== {label} ===")

        # Download FASTA
        if fasta_path.exists() and fasta_path.stat().st_size > 1000:
            print(f"  [skip] {fasta_path} already exists ({fasta_path.stat().st_size:,} bytes)")
        else:
            print(f"  Downloading FASTA...")
            try:
                zip_bytes = download_from_ncbi(accession, "GENOME_FASTA")
                fasta_data = extract_file(zip_bytes, ".fna")
                if fasta_data:
                    fasta_path.write_bytes(fasta_data)
                    print(f"  [ok] {fasta_path} ({len(fasta_data):,} bytes)")
                else:
                    raise RuntimeError("No .fna in zip")
            except Exception as e:
                print(f"  [warn] Datasets API failed ({e}), trying efetch...")
                try:
                    fasta_data = download_efetch_fasta(accession)
                    fasta_path.write_bytes(fasta_data)
                    print(f"  [ok] {fasta_path} ({len(fasta_data):,} bytes)")
                except Exception as e2:
                    print(f"  [ERROR] Could not download {label}: {e2}")
                    print(f"         Manual download: https://www.ncbi.nlm.nih.gov/datasets/genome/{accession}/")

        # Download GFF3
        if gff_path.exists() and gff_path.stat().st_size > 1000:
            print(f"  [skip] {gff_path} already exists ({gff_path.stat().st_size:,} bytes)")
        else:
            print(f"  Downloading GFF3...")
            try:
                zip_bytes = download_from_ncbi(accession, "GENOME_GFF")
                gff_data = extract_file(zip_bytes, ".gff")
                if gff_data:
                    gff_path.write_bytes(gff_data)
                    print(f"  [ok] {gff_path} ({len(gff_data):,} bytes)")
                else:
                    print(f"  [warn] No GFF3 in download — pipeline can run without annotations")
            except Exception as e:
                print(f"  [warn] GFF3 download failed ({e}) — pipeline can run without annotations")

    # Summary
    print("\n=== Reference genome status ===")
    all_ok = True
    for _, (fasta_name, _, label) in ORGANISMS.items():
        p = REFS_DIR / fasta_name
        if p.exists():
            print(f"  [ok] {fasta_name} ({p.stat().st_size:,} bytes)")
        else:
            print(f"  [MISSING] {fasta_name}")
            all_ok = False

    if all_ok:
        print("\nAll reference genomes present.")
    else:
        print("\nSome references are missing — see errors above.")

    print("\nNOTE: Bowtie2 indices are built automatically by the pipeline on first run.")


if __name__ == "__main__":
    main()
