# Reviewed reconciliation exceptions

Read this reference only during Pass 2, after verifying the sealed ledger and recorded
source fingerprints. Do not expose it to blind Pass 1.

Apply an exception only when chapter, source SHA-256, sealed-ledger SHA-256, and claim
ID all match. The sealed ledger remains immutable; record the exception separately in
the reconciliation report.

## Chapter 1.12 claim 019 capability ownership

- Chapter: `1.12`
- Source SHA-256:
  `db175c854075f6d104ea3c89e755e43d810d1f0bee6cf75402ab81c59b10b3ee`
- Sealed-ledger SHA-256:
  `5dc73600f60241dc4f149fddbdc4506291ef084b92b6ed466b4856c4ec2d019c`
- Claim ID: `claim:019`
- Reviewed decision: do not assign the personal-time adjustment capability to GUPPI.
  The source evidence establishes that querying GUPPI led to documentation of Bob's
  capability, not that the GUPPI interface performs or owns the adjustment.
- Representation: retain the capability as chapter-summary context or classify it
  `not-modeled`; do not update `technology:guppi-interface` from this claim.
