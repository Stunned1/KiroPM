# Mira — AI Product Management Tool

Mira is a desktop application that acts as an AI-powered product manager. It helps teams go from raw product ideas to structured proposals, implementation tasks, and Jira tickets — all inside a single native app.

![Mira Logo](public/mira-logo.png)

---

## What it does

### Propose
Describe a feature, problem, or improvement in plain language. Mira uses GPT-4o to generate a full product proposal including:
- A rationale for why the feature matters
- Supporting signals (user feedback, data points)
- Suggested UI changes and file paths
- Data model / schema changes
- A breakdown of development tasks

You can upload files (screenshots, CSVs, documents) as context, and follow up with the built-in Mira AI chat to refine the proposal.

### Tasks (Kanban Board)
Once you approve tasks from a proposal, they appear in a Kanban board split into **Frontend**, **Backend**, and **QA** columns. From here you can:
- Approve or reject individual tasks
- Preview AI-generated code changes for a task against your live hosted app
- Accept changes — Mira writes the files, commits, and pushes to GitHub (triggering a Vercel redeploy)
- Create Jira tickets for approved tasks with one click

### Project
Browse your project's file tree and edit files directly inside the app using a Monaco-based code editor.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| UI framework | React + Vite |
| Auth | Supabase (GitHub OAuth) |
| AI | OpenAI GPT-4o Mini |
| Ticket creation | Jira REST API v3 |
| Code editor | Monaco Editor |

---

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase project with GitHub OAuth enabled
- An OpenAI API key
- A Jira account with an API token (optional, for ticket creation)

### Installation

```bash
git clone https://github.com/Stunned1/KiroPM.git
cd KiroPM
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key

# Optional — for Jira ticket creation
JIRA_URL=https://yourworkspace.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_jira_api_token
```

### Running in development

```bash
npm run dev
```

This starts the Vite dev server and launches Electron concurrently.

### Building for production

```bash
npm run build
```

The packaged app is output to the `release/` directory.

---

## Live preview & auto-deploy

If your project has a hosted URL in its `README.md` (e.g. a Vercel deployment), Mira will show a live preview of the app inside the Tasks tab. When you accept an AI-generated feature, Mira:
1. Writes the generated files to your local project
2. Creates a git commit
3. Pushes to the remote repository

This triggers a Vercel (or similar) redeploy, and the preview panel refreshes automatically after ~15 seconds.

---

## Project structure

```
KiroPM/
├── electron/
│   ├── main.js          # Electron main process, IPC handlers, OpenAI & Jira API calls
│   └── preload.js       # Exposes safe IPC bridge to the renderer
├── src/
│   ├── App.jsx          # Root component, routing, global state
│   ├── Auth.jsx         # GitHub OAuth login
│   ├── Dashboard.jsx    # Project selector (open folder, clone repo, recent projects)
│   ├── Propose.jsx      # AI proposal generation and chat refinement
│   ├── TasksTab.jsx     # Kanban board, live preview, Jira modal
│   ├── ProjectTab.jsx   # File tree + Monaco editor
│   ├── Account.jsx      # User account page
│   └── components/
│       └── SettingsUI.jsx
├── public/
│   └── mira-logo.png
└── .env.local           # Local secrets (not committed)
```

---

## License

MIT
