# BOB-035 editorial audit

Date: 2026-07-29
Scope: every authored `description` and `current_state` in zero state and canonical
Chapters 1.1-1.11

## Method

Each value was reviewed at its original reader boundary, not only in the Chapter 1.11
projection. A description passes when it is an original, entity-centered encyclopedia
entry. Named relationships are retained only when they define the entity or explicitly
attribute a source-supported assessment. A `current_state` passes when it uses no more
than two concise sentences and records only the latest known condition.
Under ADR-0015, a description also omits every clause or sentence whose purpose is to
announce unrevealed, unknown, unexplained, unavailable, unspecified, or otherwise
missing knowledge. Such gaps remain in extraction and review artifacts.

“Corrected” means the canonical structured claim at that same chapter boundary was
restated under the new editorial rule; no source claim, reveal boundary, or identity
was added. “Compliant” means no edit was required. The final value below is the
durable evidence of what was reviewed.

## Ledger

| # | Chapter | Entity | Field | Result | Final reviewed value and correction basis |
| -: | :-- | :-- | :-- | :-- | :-- |
| 0 | Zero state | `technology:ami` | description | Compliant | “Artificial Machine Intelligence (AMI) is an artificial intelligence created directly as a machine mind rather than copied from a biological mind.” |
| 1 | 1.1 | `event:bob-road-incident` | description | Corrected | “While Bob crosses a Las Vegas street, a car approaches, he experiences sudden pain, and medical and legal voices accompany his fading awareness. The sequence strongly suggests a fatal collision.” Retains the supported inference and removes the disclosure-gap clause. Bob is a defining event participant. |
| 2 | 1.1 | `character:robert-johansson` | current_state | Compliant | “Presumed dead after the road incident.” |
| 3 | 1.1 | `organization:cryoeterna` | description | Corrected | “A cryonics provider offering post-death preservation under contract.” Generalizes the service instead of narrating its transaction with Bob. |
| 4 | 1.1 | `organization:intergator-software` | description | Compliant | “Bob's software company, built around a successful engineering application and sold after attracting a large acquisition offer.” Bob's ownership is defining. |
| 5 | 1.1 | `organization:intergator-software` | current_state | Compliant | “Sold.” |
| 6 | 1.2 | `character:bob-replicant` | current_state | Corrected | “Awake as one of five candidates competing to control a replicant probe.” Replaces an identity definition with the latest condition. |
| 7 | 1.2 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it.” |
| 8 | 1.2 | `organization:applied-synergetics` | description | Compliant | “A company that owns Bob as property and develops replicant-controlled machinery.” The ownership relationship is defining at this boundary. |
| 9 | 1.2 | `technology:guppi-interface` | description | Compliant | “An interface that offloads tasks for replicants while retaining their human limits on multitasking.” |
| 10 | 1.2 | `character:robert-johansson` | current_state | Compliant | “Dead.” |
| 11 | 1.3 | `technology:roamers` | description | Corrected | “Remote observation and manipulation devices directed through the GUPPI interface.” Generalizes operation instead of describing Bob's use. |
| 12 | 1.3 | `technology:vast` | description | Compliant | “Variable Attachment Surface Tension is a system that gives a ROAMer a secure grip.” |
| 13 | 1.4 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it. It restricts information by default; the domestic internet no longer exists, and genealogy records are unavailable to the public.” |
| 14 | 1.5 | `organization:ministry-of-truth` | description | Compliant | “A FAITH ministry that finances the replicant venture and has military, colonization, and diplomatic responsibilities.” |
| 15 | 1.5 | `organization:ministry-of-proper-thought` | description | Compliant | “A FAITH ministry that uses direct neurological stimulation as part of re-education.” |
| 16 | 1.5 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it. It restricts information by default; the domestic internet no longer exists, and genealogy records are unavailable to the public. It is divided into factions and power blocs, including factions that regard artificial intelligence and replicants as abominations or advocate abandoning technology from steam power onward.” |
| 17 | 1.5 | `technology:guppi-interface` | description | Compliant | “An interface that offloads tasks for replicants while retaining their human limits on multitasking. Its name expands to General Unit Primary Peripheral Interface.” |
| 18 | 1.6 | `technology:von-neumann-probe` | description | Compliant | “A self-replicating spacecraft designed to travel between star systems and construct new copies of itself along the way.” |
| 19 | 1.6 | `technology:nanites` | description | Compliant | “Tiny, single-purpose devices used for work below ROAMer scale; their flexibility is limited.” |
| 20 | 1.6 | `character:bob-replicant` | current_state | Corrected | “Training as one of two remaining candidates to control a Von Neumann probe.” Removes identity and motivation history. |
| 21 | 1.6 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it. It restricts information by default; the domestic internet no longer exists, and genealogy records are unavailable to the public. It is divided into factions and power blocs, including factions that regard artificial intelligence and replicants as abominations or advocate abandoning technology from steam power onward. It finances the replicant project and owns Bob.” The project and ownership relationships are defining. |
| 22 | 1.6 | `technology:guppi-interface` | description | Corrected | “An interface that offloads tasks for replicants while retaining their human limits on multitasking. Its name expands to General Unit Primary Peripheral Interface, and its logs retain monitoring-interface and script activity.” Generalizes logged capabilities. |
| 23 | 1.6 | `technology:roamers` | description | Corrected | “Remote observation and manipulation devices directed through GUPPI. They come in varied sizes, can coordinate across scales, and need minimal supervision once their tasks, dependencies, and interruption conditions are defined. Without active intervention, they can work up to ten times faster.” Generalizes control and intervention. |
| 24 | 1.7 | `technology:surge-drive` | description | Corrected | “A recently developed drive technology enabled by a breakthrough in subspace theory and used to equip spacecraft for interstellar operations. Beyond prototypes, only a small number of SURGE-equipped vessels are in active service.” Removes the disclosure-gap sentence without inventing the mechanism or expansion. |
| 25 | 1.7 | `technology:suddar` | description | Corrected | “A subspace technology enabled by the same theoretical breakthrough as the SURGE drive and associated with the new possibility of interstellar probes and colonization.” Removes the disclosure-gap sentence without inventing missing capabilities or an expansion. |
| 26 | 1.7 | `organization:united-states-of-eurasia` | description | Compliant | “The United States of Eurasia controls Europe and most of western Russia. It began an interstellar probe project two years earlier, and Dr. Landers considers it the strongest long-term competitor, with a substantial lead in colonization readiness.” The assessment is explicitly attributed. |
| 27 | 1.7 | `organization:china` | description | Compliant | “A major power whose probe project is sacrificing other concerns for speed and is expected to use an AMI. Dr. Landers's organization considers its project the most likely to fail outright.” The assessment is explicitly attributed. |
| 28 | 1.7 | `organization:brazilian-empire` | description | Compliant | “A belligerent power believed by Dr. Landers's organization to be potentially arming its probes and to be the most likely sabotage threat. His organization expects it to launch multiple probes and, if it finds a suitable system, establish a military presence and reproduce there.” The assessment is explicitly attributed. |
| 29 | 1.7 | `organization:australia` | description | Corrected | “A suspected participant in the international interstellar-probe race, referred to as Australia. Dr. Landers's organization suspects it of operating a probe project.” Retains the attributed assessment and removes the disclosure-gap sentence. |
| 30 | 1.7 | `character:bob-replicant` | current_state | Corrected | “Training as one of two remaining probe candidates with complete project and library access.” Removes identity and accumulated biography. |
| 31 | 1.7 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it. It restricts information by default; the domestic internet no longer exists, and genealogy records are unavailable to the public. It is divided into factions and power blocs, including factions that regard artificial intelligence and replicants as abominations or advocate abandoning technology from steam power onward. It finances the replicant project and owns Bob. It controls most of North America, while several internal factions oppose Project HEAVEN, the Habitable Earths Abiogenic Vessel Exploration Network, and seek to stop it.” The project and ownership relationships are defining. |
| 32 | 1.7 | `technology:von-neumann-probe` | description | Compliant | “A self-replicating spacecraft designed to travel between star systems and construct new copies of itself along the way. Interstellar use became possible after a breakthrough in subspace theory, and such probes are central to a competitive international colonization effort.” |
| 33 | 1.8 | `character:kenneth-martins` | current_state | Corrected | “Represented by one of the two candidate cubes that remain powered on.” Removes unrevealed-detail filler and keeps the latest condition. |
| 34 | 1.8 | `character:jiro-tanaka` | current_state | Corrected | “Represented by a candidate cube that is powered down.” |
| 35 | 1.8 | `character:neves-reijnder` | current_state | Corrected | “Represented by a candidate cube that is powered down.” |
| 36 | 1.8 | `character:joana-almeida` | current_state | Corrected | “Represented by a candidate cube that is powered down.” |
| 37 | 1.8 | `technology:roamers` | description | Corrected | “Remote observation and manipulation devices directed through GUPPI. They come in varied sizes, can coordinate across scales, and need minimal supervision once their tasks, dependencies, and interruption conditions are defined. Without active intervention, they can work up to ten times faster. They can travel along floors, walls, and ceilings, and carry video cameras for remote observation.” Generalizes control and intervention. |
| 38 | 1.9 | `character:minister-jacoby` | current_state | Corrected | “Threatening Dr. Landers over his participation in the replicant enterprise.” Removes identity prose and retains the latest condition. |
| 39 | 1.9 | `technology:roamers` | description | Corrected | “Remote observation and manipulation devices directed through GUPPI. They come in varied sizes, can coordinate across scales, and need minimal supervision once their tasks, dependencies, and interruption conditions are defined. Without active intervention, they can work up to ten times faster. They can travel along floors, walls, and ceilings, carry video cameras for remote observation, and pick up vibrations transmitted through a wall when pressed against it.” Generalizes control and intervention. |
| 40 | 1.9 | `organization:ministry-of-truth` | description | Compliant | “A FAITH ministry that finances the replicant venture and has military, colonization, and diplomatic responsibilities. It officially supports and actively funds the replicant enterprise, and holds that the enterprise's machine minds are without souls but are based on God's creation rather than attempts to usurp divine authority.” |
| 41 | 1.10 | `character:bob-replicant` | current_state | Corrected | “Restored from backup as the sole remaining probe candidate and continuing training with expanded project access.” Replaces a four-sentence synopsis with the latest condition. |
| 42 | 1.10 | `character:kenneth-martins` | current_state | Compliant | “Gone after the attack that destroyed the replicant matrices; his precise fate has not been revealed.” |
| 43 | 1.10 | `organization:free-american-independent-theocratic-hegemony` | description | Compliant | “The Free American Independent Theocratic Hegemony, a theocratic U.S. government that makes criticism a felony and permits the deactivation of machine persons for it. It restricts information by default; the domestic internet no longer exists, and genealogy records are unavailable to the public. It is divided into factions and power blocs, including factions that regard artificial intelligence and replicants as abominations or advocate abandoning technology from steam power onward. It finances the replicant project and owns Bob. It controls most of North America, while several internal factions oppose Project HEAVEN, the Habitable Earths Abiogenic Vessel Exploration Network, and seek to stop it. Security personnel believe internal factions leaked the project's progress to provoke competing nations into reacting.” The ownership relationship is defining and the leak assessment is explicitly attributed. |
| 44 | 1.11 | `character:dr-doucette` | current_state | Compliant | “Covering for Dr. Landers while Bob continues his training and assembly work.” |
| 45 | 1.11 | `technology:translation-routine` | description | Corrected | “A routine that interprets the standard twenty-second-century accent so smoothly that differing speech patterns become effectively transparent to its user.” Generalizes its effect instead of narrating Bob's experience and omits the disclosure-gap sentence. |
| 46 | 1.11 | `location:old-handeltown` | description | Corrected | “A historic Oregon city identified as Salem, Oregon and as Handel's birthplace. After Handel's death, the city changed its name and a large memorial was established in his honor. An unidentified person later destroyed the memorial with a pocket nuclear weapon after objecting. It was the only nuclear weapon deployed in North America, and advanced radiation treatment limited the resulting deaths.” Removes a comparison to Bob's expectation. |
| 47 | 1.11 | `character:bob-replicant` | current_state | Corrected | “Continuing training and assembly as the sole remaining probe candidate. His software safeguards remain incompletely understood.” Replaces a five-sentence accumulated synopsis with the latest condition. |
| 48 | 1.11 | `character:dr-landers` | current_state | Corrected | “Away from the project while Dr. Doucette covers for him.” Replaces a static identity definition with the latest condition. |
| 49 | 1.11 | `technology:roamers` | description | Corrected | “Remote observation and manipulation devices directed through GUPPI. They come in varied sizes, can coordinate across scales, and need minimal supervision once their tasks, dependencies, and interruption conditions are defined. Without active intervention, they can work up to ten times faster. They can travel along floors, walls, and ceilings, carry video cameras for remote observation, and pick up vibrations transmitted through a wall when pressed against it. Reusable scripts automate many routine activities, leaving assembly work largely self-directed.” Generalizes control, intervention, and automation. |

## Result

All 50 zero-state and canonical values pass the BOB-035 rules after 25 corrections:
14 descriptions and 11 current-state values. The audit changed no IDs, dates,
locations, relationships, appearances, mentions, or reveal boundaries.

The review-only Chapter 1.12 candidate was audited separately under the same rule.
Disclosure-gap prose was removed from five descriptions: replicant matrix, Ramscoop
Generator, mining drones, SURGE drive, and SUDDAR. Their missing details remain in
the sealed ledger and reconciliation report rather than canonical data.
