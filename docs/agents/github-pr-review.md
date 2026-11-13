# GitHub PR review

1. Read current PR metadata and resolve its exact base/head comparison. Follow [review-code-changes](../../.agents/skills/review-code-changes/SKILL.md), the Reviewer mode, and relevant subsystem guidance. Use [fresh review](local-fresh-review.md) at the pre-PR checkpoint or when explicitly requested for an existing PR. An independently started reviewer performs the review directly and must not delegate recursively.
2. Inspect the complete diff, surrounding contracts/consumers, tests, and validation evidence. If instructions are absent from an older PR snapshot, identify any current equivalents used while keeping source review pinned to the captured commits. Distinguish independently run checks from author claims.
3. Return prioritized findings in chat with exact path/line, triggering conditions, impact, evidence, and correction direction. Report no actionable findings explicitly and list validation gaps. Use these severities:

   - P0: immediate severe data loss, security exposure, or unusable application behavior.
   - P1: should block merge; likely regression, compatibility break, or incorrect result.
   - P2: consequential edge case, accessibility, maintainability, or coverage gap worth fixing.
   - P3: optional cleanup or follow-up; do not block on taste.

4. Post only when explicitly authorized. Before posting, confirm the PR base/head still match the reviewed commits and verify every inline comment's path, side, and line against the current diff. Publish through the connected GitHub account, then verify the submitted review/comments and return links. Do not silently post stale findings; review changes first.
5. Keep implementation fixes, comment publication, approval/request-changes decisions, and merge actions within their separately authorized scope. A request to review does not authorize edits or GitHub mutations; posting findings does not imply approval or merge authorization.
