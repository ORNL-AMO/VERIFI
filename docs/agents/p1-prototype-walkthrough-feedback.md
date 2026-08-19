# P1 prototype walkthrough feedback

Historical reference for the team walkthrough held on August 17, 2026.

This note summarizes feedback from a hands-on review of the P1 prototype for a unified VERIFI workspace. It records the discussion outcome and themes for future design work; it is not a replacement for the active prototype guidance in [UX redesign prototypes](ux-prototypes.md), [prototype design foundation](prototype-foundation.md), or [P1 data workbench pattern](p1-data-workbench-pattern.md).

## Meeting context

The team reviewed a prototype for combining VERIFI's current Data Management and Data Evaluation areas into one unified user experience. Reviewers explored the prototype on their own machines, with the discussion focused primarily on overall navigation, layout, and direction rather than detailed screen-level requirements.

The prototype goal was to support both simple single-facility users and advanced users managing many sites, while keeping the existing VERIFI content and capabilities intact.

## Outcome

The team supported continuing with the P1 design direction.

The prototype was viewed as a clearer, more modern direction, especially for single-facility companies. The main concern was that users may still struggle to tell whether they are working in account-level context or facility-level context, particularly in multi-facility accounts. Reviewers also liked the theme options and dark-mode direction, while noting that the prototype could use more of VERIFI's existing personality and less of a polished corporate feel.

## Quick ratings

| Prompt | Ratings | Average |
| --- | --- | ---: |
| I understand where I am in the workspace. | 3, 4, 4, 4 | 3.75 |
| The single-facility workflow feels easier than before. | 5, 4, 5 | 4.67 |
| The design improves the current VERIFI experience. | 4, 4, 5, 4 | 4.25 |
| I would support continuing in this design direction. | 4, 5, 5, 5 | 4.75 |

## Strong positive signals

- Reviewers preferred the cleaner, more consistent navigation and the removal of multi-level tab complexity.
- The single-facility workflow felt easier and better supported than before.
- The new layout was described as cleaner, more modern, and better for visual clarity.
- Always-visible navigation and text labels were easier to scan than icon-heavy navigation.
- Key metrics, portfolio readiness cards, setup progress, and open calls to action made status and next work easier to understand.
- The right-side support panel for help, to-dos, results, and details was viewed as a strong improvement because users could keep guidance visible while working.
- Theme options and dark mode received especially positive feedback.

## Main concerns

- Account-level versus facility-level context was still visually hard to distinguish.
- Some reviewers felt the prototype looked too corporate or sanitized compared with the existing application's personality.
- Some controls and navigation elements were too muted, including switches and analysis or meter detail tabs.
- The prototype still felt complex to some reviewers, and more feature coverage may be needed before they can fully judge it.
- Switching between facilities may require more clicks and should be tested with multi-facility workflows.
- Backup account and last-backup information felt less prominent than in the current application.

## Design themes to carry forward

### Clarify workspace context

Future iterations should make it immediately visible whether the user is working at the account level or within a specific facility. Candidate improvements include stronger visual cues, clearer separation between sidebar and main workspace, a more distinct account/facility switcher, and facility-specific visual markers such as a logo or location map when appropriate.

### Preserve VERIFI character

Reviewers liked the modernized interface, but several comments asked for more personality. Future styling should keep the improved hierarchy and clarity while bringing back some of the distinctive VERIFI character.

### Make important controls more visible

Tabs, switches, and status signals need stronger emphasis where they are central to the workflow. Specific examples included analysis tabs, meter detail tabs, meter/analysis group switches, and error states on analyses.

### Reduce text and nesting

The prototype should continue moving away from deeply nested structures and heavy text. Reviewers preferred clearer hierarchy, fewer icons, visible text labels, and task structures such as Overview, Todo List, and Goal Progress.

### Support progressive complexity

The first-run experience matters. Reviewers suggested that users should be able to start simple and add functionality as they go, rather than facing the full complexity of the application immediately.

## Specific follow-up ideas

- Add stronger visual clues for account-level versus facility-level context.
- Consider a location map or company/facility logo area near the top of the workspace.
- Move the question about tracking other impacts into the reduction goals area.
- Make error states more visual for analyses that have errors.
- Make analysis tabs and meter detail tabs more noticeable.
- Make meter/analysis group switches more visually prominent.
- Distinguish the sidebar from the main application area more clearly.
- Allow some home or overview customization so users can prioritize relevant tiles.
- If a simple calculator mode is added for analysis, allow facility creation from that flow.
- Simplify new account creation by initially asking only for the account name.
- Allow the sidebar to collapse.
- Revisit the labels "Monthly Data" and "Readings"; reviewers noted that the distinction may not be clear.
- Keep the date filter in meter readings.
- Keep the theme options.
- Reassess placement and prominence of backup account and last-backup information.

## Representative reviewer comments

- "Uniform UI that gets rid of the multi-level tabs."
- "New themes draw me in."
- "It is a bit too corporate."
- "Still a bit complex for me."
- "Stronger visual clues to if I am in a specific facility or at the company level."
- "No one understands what monthly data means vs readings."
- "A successful first experience is the most important driver to continued use."
- "Overall cleaner, more modern layout, big improvement on visual clarity."
- "Fewer icons, clearer visual hierarchy."
- "I like this navigation better than the old one because it is easier to scan and always visible."
- "Text labels instead of icon-only, much clearer than guessing icon meaning."
- "Right-side support panel is a great addition."
- "New theming options in settings, love this."
