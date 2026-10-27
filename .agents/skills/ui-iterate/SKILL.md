---
name: ui-iterate
description: Explicit-only VERIFI UI/UX feedback loop that batches validation until the user is ready. Activate only when the user invokes $ui-iterate or explicitly asks to enter this workflow.
---

# UI Iterate

Keep VERIFI UI feedback cycles short while accumulating a batch for later validation. This repository skill applies only to work in VERIFI.

## Activation and duration

- Enter only on an explicit user invocation. Mentioning UI feedback, styling, or this skill in a discussion does not activate it.
- Stay active for successive UI feedback turns in the current conversation, including after context compaction. Do not apply it to other conversations automatically.
- If activation includes no requested change, acknowledge the mode and ask for the first change.
- Exit when the user asks to test the batch, says they are ready for validation, or explicitly ends the mode. A question about testing is not permission to start it.

## Each feedback turn

- Implement the requested change using the existing project conventions. Continue to inspect the relevant source and diff; fix obvious mistakes found during editing.
- Defer test runs, builds, lint, type checks, validation planners, broad reviews, and automated browser checks. Do not silently run them after each edit. Run a specific check during iteration only if the user explicitly requests it.
- Keep a concise running record of accumulated changes, affected behavior, and deferred validation. Preserve this record and the active mode in any handoff or context summary; avoid adding tracking files unless needed.
- End the turn with a brief description of the change, state that validation is deferred, and ask: **More changes, or test this batch?** Wait for the user's answer.
- Treat additional feedback as continuation of the batch. Do not present untested changes as validated or ready to ship. This mode does not authorize publishing, merging, or other external actions.

## Validate the batch

When the user is ready, leave iteration mode and validate all accumulated changes together using [VERIFI's testing policy](../../../docs/testing.md) and the relevant subsystem skills. Select checks with `npm run validate:agent -- --mode plan` before final validation. Explain the selected scope briefly; avoid repeating broad suites without a new reason.

Fix failures and rerun the affected checks as needed, then report results and remaining limitations. Resume this feedback loop only when the user explicitly requests it again.
