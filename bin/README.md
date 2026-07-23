# Narrative command wrappers

These scripts run from any current directory and locate the repository root
themselves. Install the project dependencies first with `npm ci`.

Validate the canonical narrative corpus:

```bash
./bin/narrative-validate.sh
```

Generate the valid pre-book world state to an uncommitted file:

```bash
./bin/narrative-generate.sh --output /tmp/bobiverse-world.json
```

After chapters are authored, generate the reader-safe state for one chapter:

```bash
./bin/narrative-generate.sh --chapter 1.1 --output /tmp/bobiverse-world-1.1.json
```

The generation script requires `--output`; it never creates or edits authored
narrative source data.
