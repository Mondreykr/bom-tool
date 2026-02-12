\# The Release Gate Model — A Complete Walkthrough



This document walks through the IFP BOM release problem, the Release Gate Model solution, why it works, and how to use it. It is intended to be readable in one sitting and sufficient to convince yourself the approach is sound.



---



\## Part 1: The Product Structure



A General Assembly (GA) is the top-level product — the complete machine or unit being delivered. It's made up of sub-assemblies, which may contain smaller sub-assemblies, which eventually contain components (individual parts — bolts, brackets, cut steel, etc.). This forms a tree:



```

GA

├── A1

│   ├── A5

│   │   ├── C1

│   │   └── C2-5.5"

│   └── C3

├── A2

│   └── A6

│       ├── C1

│       └── C5

└── C7

```



Every parent-child relationship has a \*\*quantity\*\* — "A1 contains 2 of A5" — and those quantities multiply down the tree. If GA has 1 of A1, A1 has 2 of A5, and A5 has 3 of C1, then the total C1 from that path is 1 × 2 × 3 = 6.



\*\*Assemblies\*\* have children. \*\*Components\*\* are leaf items — they don't contain anything. This distinction matters throughout.



---



\## Part 2: The Release Process and the IFP BOM



At project milestones, Engineering issues an \*\*IFP (Issued for Purchasing) revision\*\* — a snapshot of the BOM that tells Operations "go buy this stuff and set up work orders." The IFP BOM is the official artifact.



Every file in PDM has a \*\*state\*\*. The two approved states are \*\*Issued for Purchasing (IFP)\*\* and \*\*Issued for Use (IFU)\*\*. Everything else — "In Design," "Under Revision," etc. — is work-in-progress (WIP). Only assemblies in IFP or IFU have approved, reliable content.



Currently, the system produces the IFP BOM by exporting the GA's extended BOM as an XML from PDM. This XML contains the entire tree — every assembly and every component, recursively, as it exists at that moment. A comparison tool then compares the new XML to the prior IFP to tell Operations what changed.



---



\## Part 3: The Problem



Sometimes when it's time to release a new IFP, some assemblies are mid-revision. Their contents are unapproved — maybe quantities changed, maybe components were added or removed, but none of it has been signed off. You cannot deliver that content to Operations.



Here's a concrete situation. At IFP REV0, everything was released and the BOM was correct:



```

GA \[IFP]

├── A1 (1) \[IFU]        ← released, approved content

│   ├── A5 (2) \[IFU]

│   │   ├── C1 (3)

│   │   └── C2-5.5" (2)

│   └── C3 (4)

├── A2 (1) \[IFU]        ← released, approved content

│   └── C4 (2)

└── C7 (2)

```



Operations received this. Purchasing ordered parts. Work orders were set up. All good.



Now time passes. Engineering is revising A1 — changing quantities inside A5, maybe changing a cut length. A1's state moves from IFU to "Under Revision." Meanwhile, a new assembly A3 has been designed and released. Engineering needs to issue IFP REV1 to get A3 out to Purchasing.



\*\*The problem: what do you do about A1?\*\*



A1 is mid-revision. Its current contents in the CAD model are unapproved. You have two options, and both are wrong:



\*\*Option 1 — Leave A1 in the export (unsuppressed).\*\* The XML will contain A1 with its unapproved changes. Operations receives wrong quantities, wrong lengths, wrong parts. They buy the wrong things.



\*\*Option 2 — Suppress A1 in the CAD model.\*\* A1 vanishes from the XML entirely. The comparison tool sees the new XML (A1 absent) vs. the old XML (A1 present) and reports A1 and all its children as \*\*"Removed."\*\* Operations may cancel procurement for C1, C2-5.5", C3 — parts that are still needed, still in scope, and will return when A1's revision is complete.



The XML export forces this binary choice because it bundles two things together: the \*\*reference\*\* to A1 (the fact that GA contains it) and the \*\*contents\*\* of A1 (what's inside it). You want to keep the reference but freeze the contents at the last approved version. The export can't do that.



---



\## Part 4: The Release Gate Model — How It Works



\### The Core Idea



Stop suppressing WIP assemblies. Leave them in the CAD model, unsuppressed, so they appear in the XML export with their PDM state metadata. Then modify the BOM tool so that instead of using the raw XML directly, it \*\*builds\*\* the official IFP BOM by walking the tree and using each assembly's PDM state as a gate.



\*\*Released (IFP or IFU) = gate open.\*\* The assembly's current content flows through into the new IFP BOM.



\*\*Anything else = gate closed.\*\* The assembly's current content is rejected. The tool reaches back to the prior official IFP BOM and pulls in that assembly's last-approved content instead.



That's the entire concept. The released state is the gate on every branch of the tree.



\### The Inputs and Output



The tool takes two inputs:



\- \*\*X(n):\*\* The raw XML export from PDM. Contains the full tree, including WIP assemblies with their unapproved contents. This is an intermediate file — not the IFP BOM.

\- \*\*B(n-1):\*\* The prior official IFP BOM (produced by the tool last time).



The tool produces one output:



\- \*\*B(n):\*\* The official IFP BOM for this revision. WIP branches have been replaced with their last-known-good content. \*\*This is the controlled release artifact.\*\*



For the very first release (REV0), there is no B(n-1). If all assemblies are released (as they should be), B(0) simply equals X(0).



\### The Walk



The tool starts at the GA and walks down the tree, assembly by assembly. At each assembly, it checks the PDM state:



\- If the assembly is \*\*IFP or IFU\*\*: include it with its current content from X(n), and keep walking into its children to check them too.

\- If the assembly is \*\*anything else\*\* (WIP): stop. Do not look at its children. Graft that assembly's entire branch from B(n-1) — the prior official IFP BOM. If this assembly has never been released (no corresponding branch in B(n-1)), include it as an empty placeholder.



Components are never evaluated for state. They're leaf items — they come along with whatever assembly contains them. The gate logic applies only to assemblies, because only assemblies have children whose content is in question.



\### Walking Through REV1



Here's what the tool sees for our example. A1 is under revision. A3 is new and released.



\*\*X(1) — the raw export:\*\*



```

GA \[IFP]

├── A1 (1) \[Under Revision]      ← WIP — gate closed

│   ├── A5 (2) \[Under Revision]   ← inside A1, won't be reached

│   │   ├── C1 (5)                ← unapproved qty

│   │   └── C2-5.75" (2)          ← unapproved length change

│   └── C3 (4)

├── A2 (1) \[IFU]                  ← released — gate open

│   └── C4 (2)

├── A3 (1) \[IFP]                  ← released — gate open

│   ├── C8 (2)

│   └── C9 (1)

└── C7 (2)

```



\*\*The walk:\*\*



1\. \*\*GA \[IFP]\*\* — released. Gate open. Include GA, walk its children.

2\. \*\*A1 \[Under Revision]\*\* — WIP. Gate closed. Stop. Don't look inside. Graft A1's entire branch from B(0).

3\. \*\*A2 \[IFU]\*\* — released. Gate open. Include A2 and its children from X(1).

4\. \*\*A3 \[IFP]\*\* — released. Gate open. Include A3 and its children from X(1).

5\. \*\*C7\*\* — component. Include from X(1).



\*\*B(1) — the official IFP BOM REV1:\*\*



```

GA

├── A1 (1)              ← grafted from B(0): approved content

│   ├── A5 (2)           ← from B(0): qty 2, not unapproved changes

│   │   ├── C1 (3)       ← from B(0): qty 3, not the unapproved 5

│   │   └── C2-5.5" (2)  ← from B(0): original length, not 5.75"

│   └── C3 (4)           ← from B(0)

├── A2 (1)              ← current content from X(1)

│   └── C4 (2)

├── A3 (1)              ← current content from X(1) — new

│   ├── C8 (2)

│   └── C9 (1)

└── C7 (2)

```



\*\*Comparison B(1) vs B(0):\*\*



| Item | Classification |

| --- | --- |

| A3 | Added |

| C8 | Added |

| C9 | Added |

| Everything else | Unchanged |



No false removals. A1's branch is present with its approved content. A3 is correctly added. Operations sees exactly what changed.



\### Walking Through REV2 — A1 Returns



A1's revision is complete. A5 qty changed from 2 to 3 (approved). All assemblies are now released.



\*\*X(2) — the raw export:\*\*



```

GA \[IFP]

├── A1 (1) \[IFU]         ← re-released — gate open

│   ├── A5 (3) \[IFU]     ← qty now 3 (approved)

│   │   ├── C1 (3)

│   │   └── C2-5.5" (2)

│   └── C3 (4)

├── A2 (1) \[IFU]

│   └── C4 (2)

├── A3 (1) \[IFP]

│   ├── C8 (2)

│   └── C9 (1)

└── C7 (2)

```



Every assembly is released. Every gate is open. B(2) = X(2). The tool walks the whole tree, finds no WIP, includes everything as current.



\*\*Comparison B(2) vs B(1):\*\*



| Item | Classification | Detail |

| --- | --- | --- |

| A5 | Changed | Qty 2 → 3 |

| C1 (flat) | Changed | 6 → 9 (gained one A5 instance worth of C1) |

| C2-5.5" (flat) | Changed | 4 → 6 (gained one A5 instance worth) |

| Everything else | Unchanged |  |



Correct. Operations sees the actual approved changes to A1's branch — not a sudden reappearance of previously "removed" items, but a clean quantity change from the last known state.



---



\## Part 5: Deep WIP — Gates Below L1



The gate check doesn't stop at the first level of sub-assemblies. The tool walks as deep as the tree goes, because PDM allows any previously-released assembly to be moved back into revision at any time. A sub-assembly three levels deep can go WIP while everything above it stays released.



\*\*Example:\*\* A1 is released, but A5 (inside A1) has gone under revision.



```

GA \[IFP]

├── A1 (1) \[IFU]                ← released — gate open, walk children

│   ├── A5 (2) \[Under Revision]  ← WIP — gate closed, graft from B(0)

│   │   ├── C1 (5)               ← unapproved — rejected

│   │   └── C2-5.5" (2)

│   └── C3 (4)                   ← component under released A1, include

```



The tool walks into A1 (released), includes A1's structure from X(n), then hits A5 (WIP) and grafts A5's branch from B(n-1). A1's released content is current; only A5's internals are frozen. The graft is surgical — exactly where the WIP is.



\*\*What about A5's quantity?\*\* A1 is released and declares "I contain 2 of A5." That quantity comes from A1's current released content in X(n). The graft replaces what's \*inside\* A5 (its children), not how many A5s the parent contains. If A1 had changed A5's quantity to 3 as part of a released update, that new quantity would flow through — only A5's internal structure is frozen.



---



\## Part 6: The Release Chain — Why This Works



This is the structural principle that makes the Release Gate Model sound, and it's the same principle that makes the Reference Chain Model work.



\### The Principle



For any assembly's current approved content to appear in an IFP BOM, \*\*every assembly on the path from that assembly up to the GA must be released.\*\* Each parent is the container for its child. If a container isn't released, its declaration of children — including quantities, which children are present, and how they're organized — is not approved. The released path from the GA down to the assembly in question forms a \*\*release chain\*\*.



\### Why This Must Be True



Consider this structure:



```

GA \[IFP]

└── A1 (1) \[IFU]

&nbsp;   └── A5 (2) \[IFU]

&nbsp;       └── C1 (3)

```



For C1's current quantity of 3 to appear in the IFP BOM, the following must all be true:



\- \*\*A5 must be released\*\*, because A5 is the assembly that declares "I contain C1 at qty 3." If A5 is WIP, that declaration is unapproved.

\- \*\*A1 must be released\*\*, because A1 is the assembly that declares "I contain A5 at qty 2." If A1 is WIP, A1's structure is unapproved — even if A5 internally is fine, A1's declaration of \*how many\* A5s it contains, or even \*whether\* it contains A5, isn't signed off.

\- \*\*GA must be released\*\*, because GA is the assembly that declares "I contain A1." Same logic.



Every link in the chain must hold. Break any link and the content below that break is not fully approved. The Release Gate Model enforces this naturally: the tool walks from GA downward, and \*\*the first closed gate (WIP assembly) on any branch stops the flow.\*\* Everything below that gate is grafted from the prior IFP BOM.



\### What Breaking the Chain Looks Like



\*\*Break at A1:\*\*



```

GA \[IFP]

└── A1 \[Under Revision]     ← gate closed

&nbsp;   └── A5 \[IFU]             ← doesn't matter — A1 stopped the walk

&nbsp;       └── C1 (5)           ← doesn't matter

```



A1 and everything beneath it is grafted from B(n-1). Even though A5 is released, A1's overall structure isn't approved. A5's content won't flow through until A1 re-releases.



\*\*Break at A5 only:\*\*



```

GA \[IFP]

└── A1 \[IFU]                ← gate open, walk children

&nbsp;   └── A5 \[Under Revision]  ← gate closed

&nbsp;       └── C1 (5)           ← unapproved, rejected

```



A1's structure flows from X(n). A5's internals are grafted from B(n-1). The break is exactly where the WIP is.



\*\*No break — full chain released:\*\*



```

GA \[IFP]

└── A1 \[IFU]                ← gate open

&nbsp;   └── A5 \[IFU]             ← gate open

&nbsp;       └── C1 (3)           ← approved, included

```



Every gate is open. Current content flows all the way through.



\### The IFP Release Obligation



This leads to a critical process requirement: \*\*when an assembly is being released in an IFP, every assembly on the path from that assembly up to the GA must also be released.\*\* If you release A5, then A1 (its parent) must be released, and GA (A1's parent) must be released. This is how the release chain is formed. It's how the snapshot captures the current approved state of that branch.



This is not a new requirement — PDM's bottom-up validation already enforces it at the time of initial release (you can't release a parent unless its children are released). What's different is the awareness: in the new workflow, the raw export will show WIP assemblies in the tree, and the person conducting the IFP release must understand which branches have complete release chains (current content will flow) and which have breaks (prior content will be grafted).



---



\## Part 7: Equivalence to the Reference Chain Model



The Reference Chain Model (as used in ERP systems like NetSuite) works like this: each assembly stores a record of its immediate children, created at the moment of release. To construct a full BOM, the system starts at the GA's record, looks up each child assembly's record, recurses down, and assembles the tree. If an assembly hasn't re-released, its record is the old one — its content is frozen.



The Release Gate Model achieves the identical outcome through a different mechanism. Here is the 1:1 mapping:



\### How Records Are Created



\*\*Reference Chain Model:\*\* When an assembly is released, a record of its immediate children is stored in a database. This record persists until the assembly releases again.



\*\*Release Gate Model:\*\* When an assembly is released and the GA is exported, that assembly's content appears in the Source Export X(n). When the tool builds B(n) and encounters this released assembly, it includes the current content from X(n). That content, now embedded in B(n), is the equivalent of the "record" — it persists in B(n) and can be grafted into future IFP BOMs if the assembly goes WIP.



\### How the Tree Is Resolved



\*\*Reference Chain Model:\*\* Start at GA's record. For each child assembly, look up that assembly's latest record. Recurse. If no new record exists (assembly didn't re-release), use the old one.



\*\*Release Gate Model:\*\* Start at GA in X(n). For each child assembly, check its state. If released, use current content from X(n) and recurse into children. If WIP, graft that assembly's branch from B(n-1) — which contains the content from when it was last released. The walk \*is\* the resolution.



\### How WIP Is Handled



\*\*Reference Chain Model:\*\* A WIP assembly doesn't release a new record. The resolver finds the old record and uses it. The assembly's content is frozen at its last release.



\*\*Release Gate Model:\*\* A WIP assembly's gate is closed. The tool grafts from B(n-1), which contains the content from when the assembly was last released. The content is frozen at its last release.



\### How Multi-Revision WIP Carry-Forward Works



\*\*Reference Chain Model:\*\* If A5 has been WIP for three IFP revisions, the resolver keeps finding A5's original record (from when it was last released). The same content resolves every time.



\*\*Release Gate Model:\*\* If A5 is WIP at REV1, it's grafted from B(0) into B(1). At REV2, still WIP — grafted from B(1), which contains B(0)'s content. At REV3, still WIP — grafted from B(2), which carries B(0)'s content. The content propagates forward automatically through the chain of B(n) artifacts. No special logic needed.



| IFP Revision | A5 content in B(n) | Source |

| --- | --- | --- |

| B(0) | A5's original approved content | From X(0) — A5 was released |

| B(1) | Same | Grafted from B(0) |

| B(2) | Same | Grafted from B(1), which carries B(0) |

| B(3) | Same | Grafted from B(2), which carries B(0) |



\### How True Deletion Is Handled



\*\*Reference Chain Model:\*\* Assembly is removed from its parent's immediate-children record. The resolver doesn't look for it. It's gone.



\*\*Release Gate Model:\*\* Assembly is deleted from the CAD model. It doesn't appear in X(n) at all — no state, no metadata, just absent. The tool has nothing to graft. B(n) doesn't include it. Comparison correctly shows it as removed.



The distinction between WIP and deletion is clear in both models: a WIP assembly is \*present but gated/frozen\*; a deleted assembly is \*absent\*.



\### The Structural Equivalence



In both models, the release chain is the backbone. A continuous chain of released assemblies from the GA down to any given assembly is what allows that assembly's approved content to appear in the BOM. Break the chain at any point and the content below that break freezes. The Reference Chain Model enforces this through database records; the Release Gate Model enforces this through state-gated branch walks. The mechanism differs. The outcome is identical.



The chain of B(n) artifacts is the database.



---



\## Part 8: The IFP Release Process Under the Release Gate Model



This is what the person conducting an IFP release does, step by step, and what they need to pay attention to.



\### Before the Export



\*\*1. Verify release states.\*\* Look at the GA's BOM tree in PDM. Every assembly that should contribute \*new, current content\* to this IFP must be in IFP or IFU state, and its entire path up to the GA must be released. This is the release chain. If any link is missing — say A5 is released but A1 (its parent) is still WIP — A5's new content will not flow through. The tool will graft the entire A1 branch (including A5) from the prior IFP BOM.



\*\*2. Confirm WIP assemblies are unsuppressed.\*\* This is the critical SOP change. Under the old process, WIP assemblies were suppressed to hide them from the export. Under the Release Gate Model, they must be \*\*unsuppressed\*\* so they appear in the export with their state metadata. The tool handles them — the person does not need to do anything about their content. But they must be visible.



\*\*3. Confirm WIP assemblies have the correct state.\*\* Any assembly that is \*not\* ready for release must be in a non-IFP/IFU state (e.g., "Under Revision," "In Design"). This is normally enforced by PDM workflow, but the person should verify. If a WIP assembly were accidentally left in IFP/IFU state, the tool would treat it as released and include its unapproved content.



\*\*4. Release the GA.\*\* If any children are WIP, Document Control uses the existing bypass to release the GA despite the bottom-up validation warning. This is unchanged from current practice.



\### The Export and Tool Run



\*\*5. Export the XML.\*\* Standard PDM extended BOM export. This produces X(n) — the raw Source Export. It will contain WIP assemblies with their unapproved content. This is expected.



\*\*6. Run the tool.\*\* Input: X(n) and B(n-1) (the prior official IFP BOM). The tool walks the tree, gates on state, grafts WIP branches, and produces B(n).



\### After the Tool Run



\*\*7. Review B(n).\*\* The person should review the produced IFP BOM. If the tool annotates grafted branches (recommended), the review is straightforward:



\- \*\*Grafted branches\*\* (marked "from B(n-1)"): These are WIP assemblies whose content was carried forward from the prior IFP. Verify that these are the assemblies you expected to be WIP. If an assembly was supposed to have been released for this IFP but shows up as grafted, something was missed — go back and check its release state.

\- \*\*Current branches\*\* (marked "from X(n)"): These are released assemblies with current content. Their content is approved and flowing through.

\- \*\*Empty placeholders\*\* (assembly present, no children, with warning): These are new assemblies that are in scope but have never been released. Their contents will populate in a future IFP when they reach IFP/IFU state.



\*\*8. Store the artifacts.\*\* B(n) is the official IFP BOM for this revision. X(n) is retained for audit. B(n) is delivered to Operations and used for all downstream purposes — flat BOM generation, comparisons, work order setup.



\### What to Watch For



\*\*A forgotten release.\*\* If an assembly was supposed to be re-released but wasn't, the tool will silently graft old content. This is "correct" behavior (the tool does what the states say), but it's not what was intended. The review step (step 7) catches this — the person sees a grafted branch where they expected current content.



\*\*A forgotten state change.\*\* If an assembly is WIP but was accidentally left in IFP/IFU state, the tool will include its unapproved content. This is the mirror failure. State hygiene is critical.



\*\*WIP content visible in the raw export.\*\* The person will see WIP assemblies with unapproved content in X(n). This is expected and correct — the tool handles it. X(n) is not the IFP BOM. B(n) is.



---



\## Part 9: Are There Gaps?



\*\*The approach is structurally sound.\*\* The Release Gate Model produces correct IFP BOMs for every scenario analyzed: temporary WIP, multi-revision WIP carry-forward, deep WIP below L1, true deletion, new unreleased assemblies, common components across branches, quantity changes at intermediate levels, PN-Length composite keys, and structural reorganization. The release chain is the backbone, and the gate mechanism enforces it correctly.



\### A Behavioral Difference from the Reference Chain Model



While the two models produce equivalent results in most scenarios, there is one case where they diverge, and it's worth understanding precisely.



Consider A5 containing A8. Both are released. A5 rev0 and A8 rev0 are in NetSuite. B(0) contains A5 with A8 rev0 content inside. Now A5 goes under revision. Separately and independently, A8 completes a revision and is re-released as A8 rev1. A8 rev1 goes to NetSuite.



\*\*Reference Chain Model (NetSuite):\*\* A BOM inquiry from the GA walks to A5's record (rev0, the latest — A5 hasn't re-released). A5 rev0 says "I contain A8." The resolver looks up A8's latest record — rev1. It uses A8 rev1's content. The resulting BOM contains A5's old structure but A8's new internals.



\*\*Release Gate Model:\*\* The tool hits A5 \[Under Revision], gate closed, and grafts the entire A5 branch from B(n-1). That branch contains A8 rev0 content. A8 rev1 is invisible — the graft happened above it. The IFP BOM contains A8 rev0 content under A5.



The divergence: NetSuite shows A8 rev1 under A5. The IFP BOM shows A8 rev0 under A5.



\*\*This is the correct behavior for a controlled release.\*\* The combination NetSuite shows — A5 rev0's structure with A8 rev1's internals — is a BOM that was never approved as a cohesive whole. Nobody signed off on "A5 containing the new A8." A5 is under revision; its relationship to A8 (whether A8 is still there, how many, how it's organized) is uncertain until A5 re-releases. The Release Gate Model says: until A5's revision is complete and A5 re-releases, we don't know what A5 looks like as a whole, so the entire branch freezes. Engineering communicates the A8 changes (in the context of A5) by completing A5's revision and re-releasing it. Only then does the gate open.



One implication: if A8 is used in multiple places — say under both A5 (WIP) and A2 (released) — the IFP BOM could correctly contain A8 with different content in different locations. Under A2, the release chain is intact (GA → A2 → A8, all released), so A8 rev1 flows through. Under A5, the chain is broken, so the grafted branch carries A8 rev0. This is accurate — each branch reflects its own approved state.



\*\*This also surfaces a pre-existing ERP issue.\*\* Because NetSuite resolves each assembly's record independently, a production analyst creating a work order while A5 is under revision could get a BOM that includes A8 rev1 under A5 — a combination nobody approved. Ideally A5's BOM in NetSuite would be withdrawn or flagged when A5 goes under revision, but that mechanism doesn't exist. This discrepancy between ERP and the IFP exists regardless of the Release Gate Model. The Release Gate Model doesn't create this problem — it produces a more reliable IFP artifact that can serve as the controlled baseline to catch such discrepancies against.



\### Procedural Risk



\*\*The single point of procedural risk\*\* is the SOP change: WIP assemblies must not be suppressed. If someone suppresses a WIP assembly out of habit, the tool can't see it, can't graft it, and the old problem reappears for that assembly. This is a training and process discipline issue, not a flaw in the model. The mitigation is clear documentation, training, and the review step after each tool run (a suppressed assembly that should be present would be conspicuously absent from B(n), which is a signal to investigate).



\### Overall Assessment



\*\*There are no identified logical gaps.\*\* The gate mechanism (whitelist of two approved states, everything else is WIP) is complete and future-proof. The N-1 chain dependency for carry-forward is self-sustaining. The distinction between WIP (present with WIP state) and deletion (absent from export) is unambiguous. The release chain requirement — every container up to GA must be released for current content to flow — is inherent in the top-down walk and does not need to be separately enforced. The behavioral difference from the Reference Chain Model in the sub-assembly re-release scenario is a feature of controlled releases, not a gap.



---



\*Companion documents: Release Gate Model PRD, BOM Reference Chain Model Specification\*

