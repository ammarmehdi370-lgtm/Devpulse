# Devpulse Achievement Ideas

> Proposal only. These achievements are ideas for the product; they are not currently implemented.

## Product Principles

- Reward useful outcomes and collaboration, not time spent in the app.
- Never punish breaks, missed days, or a change in work habits.
- Keep achievements optional: users can dismiss them and disable celebration notifications.
- Do not inspect source code, prompts, chat content, secrets, or private repository data to award an achievement.
- Award each achievement once per account, with idempotent event handling to prevent duplicate unlocks.
- Make every unlock condition visible. Do not use surprise requirements or paid-plan-only achievement status.
- Avoid public leaderboards by default. Team achievements should celebrate shared outcomes, not rank individuals.
- Do not award achievements for creating, deploying, or changing something that has not actually succeeded.

## Achievement Catalog

### Getting Started

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| First Steps | Complete the first sign-in and open the workspace home. | Recognizes a successful start without requiring setup choices. |
| Connected | Connect or create the first repository. | Rewards connecting a project to Devpulse. |
| Workspace Ready | Successfully start the first workspace. | Marks the first usable development environment. |
| Find Your Flow | Open the editor, AI Assistant, or Team Chat for the first time. | Encourages discovering the tools without requiring all of them. |

### Workspaces and Projects

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| Workspace Builder | Successfully start 3 different workspaces. | Recognizes trying multiple project environments. |
| Multi-Project Flow | Have 3 workspaces successfully running over time. | Celebrates a useful multi-project setup, not simultaneous resource use. |
| Template Explorer | Successfully launch 3 different workspace templates. | Encourages exploring available environments. |
| Project Organizer | Star or save 5 repositories. | Rewards keeping a project list organized. |
| Environment Tuner | Change workspace resources and successfully start that workspace. | Recognizes a working resource configuration. |

### Code and Editor

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| First Edit | Save the first code change in the editor. | Rewards a completed edit, not opening a file. |
| File Gardener | Create and save 3 new files in a project. | Celebrates building out project structure. |
| Workbench Regular | Save code changes on 5 separate days. | Recognizes continued editor use without a streak or deadline. |
| Cross-File Thinker | Save changes to 3 different files in one project. | Rewards work spanning a project rather than a single file. |
| Patch Applied | Explicitly apply an AI-generated change and save it. | Rewards user-reviewed AI assistance, not raw generation volume. |

### AI Assistant

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| First Prompt | Receive the first successful AI response. | Marks the first completed AI interaction. |
| Context Aware | Send a request with an active project file attached as context. | Encourages grounded, project-specific assistance. |
| Human in the Loop | Review and explicitly apply an AI suggestion. | Reinforces user review and control. |
| Iterative Thinker | Send 5 follow-up prompts in one conversation. | Recognizes refining a solution through dialogue. |
| Model Explorer | Try 2 different AI models, when multiple models are available. | Encourages comparing available options. |
| Activity Observer | View the activity timeline on a completed AI response. | Encourages transparency around AI work. |

**Future-only AI achievements:** Web Researcher and Terminal Runner should only be considered after real, permissioned web-search and terminal tools are implemented. Do not award these based on a prompt or simulated status label.

### Pulse Pilot Collaboration

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| First Pair | Complete the first successful Pulse Pilot session with another participant. | Celebrates collaboration rather than simply opening the screen. |
| Shared Cursor | Make a change during a session that is received by the other participant. | Recognizes real-time collaboration working end to end. |
| Helpful Handoff | Transfer control to another participant and have them make a change. | Rewards collaborative ownership and handoffs. |
| Pairing Practice | Complete 5 distinct Pulse Pilot sessions. | Recognizes repeat use without rewarding session length. |
| Clear the Air | End a session cleanly after collaboration. | Encourages deliberate session cleanup. |

### Team Chat

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| Say Hello | Send the first message in a team channel. | Marks the first contribution. |
| Team Connector | Participate in 3 different channels. | Encourages collaboration across topics. |
| Useful Reference | Pin a message that another teammate later opens. | Rewards reusable team knowledge, if pin/open tracking is implemented. |
| Helpful Reply | Receive a reaction or explicit acknowledgement from a teammate. | Celebrates useful communication without judging message content. |
| Shared Context | Share a file that a teammate opens. | Recognizes useful file sharing, if file-open tracking is implemented. |

### Releases and Reliability

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| First Release | Complete the first successful deployment. | Recognizes shipping a working change. |
| Release Rhythm | Complete 5 successful deployments. | Rewards a repeatable delivery workflow. |
| Green Pipeline | Complete 3 successful pipeline runs in a row. | Encourages reliable release practices. |
| Recovery Ready | Successfully rerun a failed pipeline and complete deployment. | Celebrates recovery rather than failure itself. |
| Environment Keeper | Keep a workspace healthy through a successful stop and restart. | Recognizes good environment management. |

### Custom Plans and Platform Setup

| Achievement | Unlock condition | Rationale |
| --- | --- | --- |
| Right-Sized Toolkit | Save a custom plan with at least one selected feature. | Recognizes configuring the tools needed for a workflow. |
| Mix and Match | Save a custom plan with 3 or more selected features. | Celebrates assembling a broader toolset. |
| Billing Planner | Compare monthly and annual estimates before saving a plan. | Rewards informed planning, not choosing the more expensive option. |
| Theme Setter | Choose a theme and use it for a full session. | Recognizes making the workspace comfortable and personal. |

## Suggested Milestone Levels

Use domain-specific milestones instead of one global score. For repeatable, successful events, a simple progression is enough:

- **First**: complete the action once.
- **Practiced**: complete it 5 times.
- **Established**: complete it 20 times.

Only apply repeat levels where repetition is meaningful, such as successful deployments or completed workspaces. Do not apply them to logins, time online, messages sent, AI prompt volume, or other activity that could encourage spam.

## Suggested Data Model

An achievement definition can be represented with:

- `id`: stable machine-readable identifier.
- `name` and `description`: user-facing copy and unlock condition.
- `category`: workspace, code, AI, Pulse Pilot, chat, release, or setup.
- `event`: the successful product event that can unlock it.
- `threshold`: optional count for repeatable milestones.
- `isFuture`: whether its required product capability exists yet.

An awarded achievement should record the user, achievement ID, timestamp, and minimal event reference needed for auditing. Store no prompt text, code, message contents, or secret values.

## Suggested Rollout

1. **MVP:** First Steps, Connected, Workspace Ready, First Edit, First Prompt, Human in the Loop, First Pair, Say Hello, First Release.
2. **Collaboration and reliability:** Pulse Pilot handoffs, shared context, pipeline recovery, and team acknowledgements after the related events are reliably tracked.
3. **Personalization and milestones:** custom-plan achievements, theme achievements, and domain-specific repeat levels.
4. **Future integrations:** web research and terminal achievements only after those tools are implemented with clear user permission and auditable events.

## UI and Accessibility Notes

- Show a small, dismissible confirmation after an unlock; never block the editor or workspace.
- Provide an achievements page with locked and unlocked items, clear criteria, and progress where progress tracking is privacy-safe.
- Use text and an icon together; do not rely on color alone to communicate status.
- Support keyboard navigation and screen readers, and respect reduced-motion preferences.
- Let users disable achievement notifications without losing access to their history.
