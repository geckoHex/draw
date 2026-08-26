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

### Making Changes

When making changes you may test your changes with `npm run build`. You may also run a git status or git diff as needed.
**Never start or modify my dev server on port 3000.**
Do not make git commits.

After you finish making changes edit `public/version.txt`. Update the version number according to semantic version numbering (`major.minor.patch`). Preserve the file format: 1 line only that says `Version x.x.x`. A major release is multiple feature/ ux/ ui overhauls. A minor release is a feature addition, a big ui change, or medium functionality change. A patch release is a small tweak, change, etc.

Finally, give me a suggested one line commit message.
