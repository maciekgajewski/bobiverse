from __future__ import annotations

import argparse

from astronomy_pipeline import (
    reconcile_committed_sources,
    refresh,
    refresh_c20pc_snapshot,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Refresh the pinned GCNS, CNS5, Gaia DR3, WDS, and 20-pc census "
            "source snapshots."
        )
    )
    parser.add_argument("--reconcile", action="store_true", help="rebuild candidates from committed source inputs without network access")
    parser.add_argument(
        "--c20pc-only",
        action="store_true",
        help="refresh only the pinned Kirkpatrick et al. 20-pc census snapshot",
    )
    args = parser.parse_args()
    if args.reconcile and args.c20pc_only:
        parser.error("--reconcile and --c20pc-only are mutually exclusive")
    if args.reconcile:
        print(f"Reconciled committed source inputs; candidate checksum {reconcile_committed_sources()}")
    elif args.c20pc_only:
        refresh_c20pc_snapshot()
        print("Refreshed the pinned Kirkpatrick et al. 20-pc census snapshot")
    else:
        refresh()


if __name__ == "__main__":
    main()
