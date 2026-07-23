# ADR-0004: unversioned narrative schema contract

Status: Accepted
Date: 2026-07-23

## Context

The initial narrative design required versioned JSON Schema documents and embedded
`schema_version` fields in source records. This project has no external schema
consumers, no published compatibility contract, and no requirement to retain or migrate
old narrative source shapes. Version identifiers therefore add authoring and validation
ceremony without a product benefit.

The project still needs a declared JSON Schema dialect so every validator applies the
same structural semantics.

## Decision

- Canonical narrative schemas and narrative source records are unversioned.
- Narrative source files and generated narrative outputs must not contain a
  `schema_version` field.
- The shared narrative schema keeps the Draft 2020-12 `$schema` dialect declaration
  and uses the unversioned stable identifier
  `https://bobiverse.local/schema/narrative-data-model.json`.
- A schema contract changes in place. Validators accept only the current documented
  shape; no legacy source format, migration path, compatibility layer, or schema
  negotiation is required.
- This decision applies to the zero-state baseline, `books.json`, chapter source
  files, asset registries, generated manifests, and later narrative schema fragments.

## Consequences

- Authored JSON is smaller and contains no redundant version metadata.
- A contract change requires updating the authoritative documentation, validation, and
  any current authored data atomically. It must not retain a compatibility shim.
- Draft 2020-12 remains an explicit validation dependency, but it is a dialect choice,
  not a data-versioning policy.

## Alternatives considered

1. Versioned schemas with embedded `schema_version` fields were rejected. They serve
   interoperability and backward-compatibility needs this private project does not
   have.
2. Removing source version fields while retaining versioned schema identities was
   rejected. It retains the same unneeded migration and compatibility model under a
   different mechanism.
3. Omitting the JSON Schema dialect declaration was rejected. It would make validator
   behavior less explicit without simplifying the authored data contract.

## Follow-up

- Update `../technical-design.md`, `../implementation-plan.md`,
  `../data-model-definition.md`, and the active BOB-002 task.
- Remove existing narrative `schema_version` requirements, examples, and validation
  rules before defining the asset registry.
