# Home3 implementation slices

1. `codex/home3-navigation` → `unified-ux`: owner-qualified Home routes and sidebar, saved default/order and conditional visibility, initialized-empty/missing/unavailable recovery, truthful widget shells. Test ownership, deep links and single-facility entry without hidden pair initialization.
2. `codex/home3-lifecycle` → navigation slice: complete-recipe catalog (Blank available), create/rename/duplicate/delete/restore/default/order, explicit save feedback and revision-aware protected drafts. Test command identities, rejected writes, conflicts, publication-only recovery and guarded transitions.
3. `codex/home3-widgets` → lifecycle slice: add/remove/move/resize, existing chart selection, notes/typed shortcuts, pointer and keyboard controls, focus and responsive/print order. Test every variant and Chromium save/reopen, transitions, narrow layout and confirmations.

Each slice carries focused tests and current-commit self/fresh reviews. Review the cumulative stack against `unified-ux` before publication. Complete recipes and starter initialization remain Home6; numerical renderers remain Home4/Home5. Convert this temporary plan into the current Home UI reference as implementation lands.
