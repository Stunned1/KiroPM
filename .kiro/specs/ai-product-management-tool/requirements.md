# Requirements Document

## Introduction

An AI-native product management tool — "Cursor for product management" — that helps teams figure out *what* to build, not just *how* to build it. The system ingests raw product signals (customer interviews, usage data, support tickets, feedback), synthesizes insights, proposes prioritized features, generates structured specs, and produces agent-ready development tasks. It supports the full product discovery loop from raw signal to shipped feature.

## Glossary

- **System**: The AI-native product management tool as a whole
- **Signal_Ingester**: The component responsible for importing and parsing raw input data (transcripts, CSVs, tickets, etc.)
- **Insight_Engine**: The AI component that analyzes signals and surfaces patterns, problems, and opportunities
- **Prioritization_Engine**: The component that ranks and scores potential features based on user pain, business impact, and effort
- **Spec_Generator**: The component that produces structured feature specifications from a selected opportunity
- **Task_Decomposer**: The component that breaks a spec into agent-ready development tasks
- **Workspace**: A project-level container holding all signals, insights, specs, and tasks for a given product
- **Signal**: Any raw input — interview transcript, support ticket, usage event log, NPS response, Slack thread, etc.
- **Insight**: A synthesized pattern or problem statement derived from one or more Signals
- **Opportunity**: A candidate feature or improvement identified from Insights
- **Spec**: A structured feature definition including user stories, UI changes, data model changes, and workflow descriptions
- **Task**: An atomic unit of development work, structured for consumption by a coding agent
- **User**: A human interacting with the System — typically a founder, PM, or engineer

## Requirements

### Requirement 1: Signal Ingestion

**User Story:** As a product builder, I want to upload raw customer and product data, so that the system has the context it needs to generate meaningful insights.

#### Acceptance Criteria

1. THE Signal_Ingester SHALL accept plain text files, markdown files, PDF documents, and CSV files as input formats.
2. WHEN a file is uploaded, THE Signal_Ingester SHALL parse and store its contents as one or more Signals within the active Workspace.
3. WHEN a file format is unsupported, THE Signal_Ingester SHALL return a descriptive error message identifying the unsupported format.
4. THE Signal_Ingester SHALL support bulk upload of up to 50 files in a single operation.
5. WHEN a Signal is successfully ingested, THE Signal_Ingester SHALL display a confirmation with the Signal's title, type, and character count.
6. THE Signal_Ingester SHALL classify each Signal into one of the following types: interview_transcript, support_ticket, usage_data, survey_response, or other.

---

### Requirement 2: Insight Synthesis

**User Story:** As a product builder, I want the system to analyze my uploaded signals and surface patterns, so that I don't have to manually read through every piece of feedback.

#### Acceptance Criteria

1. WHEN a User requests insight synthesis, THE Insight_Engine SHALL analyze all Signals in the active Workspace and produce a list of Insights.
2. THE Insight_Engine SHALL group related Signals under each Insight, citing the specific Signals that support it.
3. THE Insight_Engine SHALL assign each Insight a frequency score representing how many distinct Signals reference the underlying problem.
4. WHEN fewer than 3 Signals exist in the Workspace, THE Insight_Engine SHALL warn the User that synthesis quality may be low before proceeding.
5. THE Insight_Engine SHALL express each Insight as a problem statement from the user's perspective, not as a proposed solution.
6. WHEN new Signals are added to a Workspace that has existing Insights, THE Insight_Engine SHALL offer to re-synthesize Insights to incorporate the new data.

---

### Requirement 3: Opportunity Prioritization

**User Story:** As a product builder, I want to see a ranked list of what to build next, so that I can make confident prioritization decisions backed by evidence.

#### Acceptance Criteria

1. WHEN a User requests prioritization, THE Prioritization_Engine SHALL generate a ranked list of Opportunities derived from the current Insights.
2. THE Prioritization_Engine SHALL score each Opportunity across three dimensions: user_pain (derived from Signal frequency and sentiment), business_impact (estimated reach and strategic fit), and effort (estimated implementation complexity).
3. THE Prioritization_Engine SHALL display the reasoning behind each score, citing specific Insights and Signals.
4. WHEN a User adjusts a score manually, THE Prioritization_Engine SHALL recalculate the overall ranking and preserve the User's override for future sessions.
5. THE Prioritization_Engine SHALL allow the User to filter Opportunities by minimum user_pain score, maximum effort score, or Signal type.
6. THE Prioritization_Engine SHALL present each Opportunity with a one-paragraph summary explaining why it is worth building, grounded in the supporting Insights.

---

### Requirement 4: Spec Generation

**User Story:** As a product builder, I want the system to draft a full feature spec from a selected opportunity, so that I have a structured starting point without writing it from scratch.

#### Acceptance Criteria

1. WHEN a User selects an Opportunity, THE Spec_Generator SHALL produce a Spec containing: a problem statement, proposed solution summary, user stories, UI change descriptions, data model change descriptions, and workflow descriptions.
2. THE Spec_Generator SHALL ground every section of the Spec in specific Insights and Signals, with inline citations.
3. WHEN a User provides written feedback on a Spec section, THE Spec_Generator SHALL revise that section and preserve all other sections unchanged.
4. THE Spec_Generator SHALL export the completed Spec as a markdown file.
5. THE Spec_Generator SHALL version each Spec, preserving prior versions so the User can compare or revert.
6. WHILE a Spec is being generated, THE System SHALL display a progress indicator showing which section is currently being written.

---

### Requirement 5: Task Decomposition

**User Story:** As a product builder, I want the system to break a spec into development tasks, so that a coding agent can immediately begin implementation.

#### Acceptance Criteria

1. WHEN a User requests task decomposition for a Spec, THE Task_Decomposer SHALL produce an ordered list of Tasks covering frontend changes, backend changes, data migrations, and tests.
2. THE Task_Decomposer SHALL write each Task as a self-contained prompt that includes: the goal, relevant context from the Spec, acceptance criteria, and any dependencies on other Tasks.
3. THE Task_Decomposer SHALL identify dependencies between Tasks and express them as an ordered sequence.
4. THE Task_Decomposer SHALL export the Task list as a structured markdown file compatible with agent-based coding tools.
5. WHEN a User edits a Spec after Tasks have been generated, THE Task_Decomposer SHALL offer to regenerate the affected Tasks.
6. THE Task_Decomposer SHALL estimate the relative complexity of each Task using a three-point scale: small, medium, or large.

---

### Requirement 6: Workspace Management

**User Story:** As a product builder, I want to organize my work into separate workspaces per product or initiative, so that signals and specs from different projects don't get mixed together.

#### Acceptance Criteria

1. THE System SHALL allow a User to create, rename, and delete Workspaces.
2. WHEN a Workspace is deleted, THE System SHALL require explicit confirmation before permanently removing all associated Signals, Insights, Specs, and Tasks.
3. THE System SHALL display a list of all Workspaces with their Signal count, Insight count, and last-modified date.
4. WHEN a User switches between Workspaces, THE System SHALL load the selected Workspace within 2 seconds.
5. THE System SHALL allow a User to export an entire Workspace as a ZIP archive containing all Signals, Insights, Specs, and Tasks as files.

---

### Requirement 7: Feedback Loop Tracking

**User Story:** As a product builder, I want to track whether shipped features actually solved the problems they were meant to solve, so that I can close the loop and improve future prioritization.

#### Acceptance Criteria

1. THE System SHALL allow a User to mark a Spec as shipped and associate a ship date with it.
2. WHEN a Spec is marked as shipped, THE System SHALL prompt the User to upload post-ship Signals (e.g., follow-up interviews, updated usage data) for comparison.
3. WHEN post-ship Signals are provided, THE Insight_Engine SHALL compare pre-ship and post-ship Insights and produce a summary of whether the underlying problem frequency decreased.
4. THE System SHALL display a timeline view showing Opportunities, their associated Specs, ship dates, and post-ship insight changes.
