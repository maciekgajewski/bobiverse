# User-facing command-line tools

`bin/` is the supported user-facing command surface. Agent-facing and internal
implementation tools remain under `scripts/`. Commands in this directory run from
any current directory, locate the repository root themselves, and must implement
`--help` without performing their normal side effect. BOB-025 tracks the audit and
regression coverage needed to bring every existing documented operator entry point
under that explicit help contract.

Install the project dependencies first with `npm ci`.

## Narrative commands

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
