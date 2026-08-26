# geckoHex/Draw - Context and Instructions

## About

GeckoDraw is an online webapp being build using Next.js providing a complete, polished whiteboard experience.

## Design Standards

### UI Restraint

**Do not add UI elements that were not requested or clearly necessary for functionality.** This includes cards, containers, backgrounds, borders, dividers, headings, labels, helper text, descriptions, icons, badges, buttons, or decorative elements. Prefer whitespace, alignment, typography, and existing design patterns over introducing new visual structure. When modifying an existing screen, preserve its current information density and visual hierarchy. Implement the smallest UI change that fully satisfies the request.

### Colors & Theme

Follow the existing theme when designing new UI.
Remember to implement light and dark mode versions of UI that respond to the setting.

### Design Notes
- Elements should not change size or position when hovered or interacted with.
- Shadows should not change on hover/ interaction.

### Mobile Devices
- Disable selection for text, images, links, buttons, and other interface elements. Only text inside text fields and text areas may be selected.
- Disable native element dragging. Only boards, folder drop targets, and elements intentionally designed for dragging may participate in drag-and-drop.
- On iPad, keep the options menu buttons for folders and boards visible at all times instead of relying on hover.
- Optimize the interface for landscape orientation only.
- Preserve the existing UI while applying these mobile behavior changes.

## Coding Standards

### Clean Code

Write clean, clear, and easily maintainable code that's easy to modify. Each file should have one clear purpose like grouped logic, a component, etc.

### Data

All persistent user data lives in the repo-local SQLite database at `data/geckodraw.sqlite3`. The schema is defined in `database/schema.sql`, and the database is accessed only by the server-side code in `lib/server/database.ts` through the Next.js route handlers under `app/api`. The frontend must use `lib/data-client.ts` and these API routes for boards, folders, canvases, and settings. Never use IndexedDB, localStorage, sessionStorage, or the Cache API for user data. API responses must remain network-only and uncached so SQLite is always the sole source of truth.

`./setup.sh` installs dependencies and initializes the database. Running it again completely deletes and recreates the database after requiring an explicit `RESET` confirmation whenever a database already exists. `./run.sh` is the everyday launcher: it installs missing dependencies, initializes a missing database, creates the optimized production build, and starts the production Next.js server with the database backend in the same process. The `data` directory contents are gitignored so user data is never committed.

### Making Changes

When making changes you may test your changes with `npm run build`. You may also run a git status or git diff as needed.
**Never start or modify my dev server on port 3000.**
Do not make git commits.

After making changes, update `public/version.json`:

1. Bump `version` using semantic versioning: **major** for multiple feature/UX/UI overhauls, **minor** for a new feature, major UI change, or medium functionality change, and **patch** for small tweaks or fixes.
2. Set `commit_message` to a one-line suggested commit message describing your changes.
3. Set `authored_by` to your coding agent name (e.g., `Codex`, `Claude`).
