from __future__ import annotations

import argparse

from astronomy_pipeline import reconcile_committed_sources, refresh


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh the pinned GCNS, CNS5, Gaia DR3, and WDS source snapshots.")
    parser.add_argument("--reconcile", action="store_true", help="rebuild candidates from committed source inputs without network access")
    args = parser.parse_args()
    if args.reconcile:
        print(f"Reconciled committed source inputs; candidate checksum {reconcile_committed_sources()}")
    else:
        refresh()


if __name__ == "__main__":
    main()
