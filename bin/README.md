# Narrative command wrappers

These scripts run from any current directory and locate the repository root
themselves. Install the project dependencies first with `npm ci`.

Validate the canonical narrative corpus:

```bash
./bin/narrative-validate.sh
```

Generate the valid pre-book world state as JSON on standard output:

```bash
./bin/narrative-generate.sh
```

After chapters are authored, generate the reader-safe state for one chapter:

```bash
./bin/narrative-generate.sh --chapter 1.1
```

Redirect standard output to save a projection, or pass optional `--output <file>` to
have the script write it. It never creates or edits authored narrative source data.
