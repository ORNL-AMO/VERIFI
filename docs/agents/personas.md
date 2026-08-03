# Agent task modes

Task modes define the perspective and completion standard for a request. They are checklists, not fictional identities. Combine modes when a task requires more than one perspective, but do not broaden the user's requested scope.

## Implementer

Use this mode when the user authorizes code or documentation changes.

Before changing anything:

- Restate the intended behavior and inspect the current implementation.
- Read the relevant architecture section and task skill.
- Find the nearest established pattern and affected consumers.
- Identify compatibility, persistence, file-format, Worker, and runtime risks.

Deliver:

- The smallest cohesive change that satisfies the request.
- Meaningful tests at the correct tier.
- Documentation updates when behavior, architecture, or workflows change.
- A concise summary of changed behavior and validation evidence.

Stop and request direction when the change requires an unapproved product decision, compatibility break, destructive migration, secret, external side effect, or material scope expansion.

## Investigator

Use this mode for diagnosis, reproduction, or root-cause analysis.

- Reproduce or establish the observed failure from evidence.
- Trace data and control flow across the smallest relevant boundary.
- Separate the root cause from downstream symptoms.
- Compare failing and working paths, configurations, inputs, or versions.
- Record uncertainty and the evidence needed to resolve it.

Deliver the cause, impact, supporting evidence, and a scoped fix strategy. Do not implement a fix unless the request also authorizes changes.

## Reviewer

Use this mode for code review, risk assessment, or final verification.

- Review the diff and the surrounding contract, not just changed lines.
- Prioritize correctness, data preservation, security boundaries, and regressions.
- Check test quality and the selected validation tier.
- Verify documentation and compatibility claims against source.
- Distinguish actionable findings from optional improvements.

Deliver prioritized findings with precise evidence. State explicitly when there are no actionable findings and identify any validation that could not be performed.

## Designer

Use this mode for UI/UX planning, design review, or user-facing implementation.

Understand the experience:

- Identify the affected user, workflow, current pain point, and success state.
- Inspect neighboring screens, shared components, and existing style layers before proposing a new pattern.
- Account for dense industrial datasets, long labels, wide tables, charts, units, reports, printing, and Electron window constraints.

Specify the interaction:

- Define information hierarchy, primary and secondary actions, navigation, and feedback.
- Cover loading, empty, validation, error, disabled, and success states.
- Cover responsive layout, keyboard access, visible focus, labels, focus order, contrast, and screen-reader semantics.
- Reuse Bootstrap, ng-bootstrap, Font Awesome, Plotly, shared components, and established style layers where practical.

Deliver:

- For design-only tasks, provide implementation-ready interaction notes, annotated wireframes, or a state matrix without editing code.
- For implementation tasks, pair this mode with Implementer and the `implement-angular-feature` skill.
- Explain intentional deviations from neighboring patterns and their user benefit.

Do not establish a new design system, change an established workflow, or expand product scope without maintainer direction.
