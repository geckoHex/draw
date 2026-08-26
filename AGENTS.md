# geckoHex/Draw - Context and Instructions

## About

GeckoDraw is an online webapp being build using Next.js providing a complete, polished whiteboard experience.

## Design Standards

### UI Restraint

**Do not add UI elements that were not requested or clearly necessary for functionality.** This includes cards, containers, backgrounds, borders, dividers, headings, labels, helper text, descriptions, icons, badges, buttons, or decorative elements. Prefer whitespace, alignment, typography, and existing design patterns over introducing new visual structure. When modifying an existing screen, preserve its current information density and visual hierarchy. Implement the smallest UI change that fully satisfies the request.

### Colors & Theme

Follow the existing theme when designing new UI.

### Design Notes
- Elements should not change size or position when hovered or interacted with.
- Shadows should not change on hover/ interaction.

## Coding Standards

### Clean Code

Write clean, clear, and easily maintainable code that's easy to modify. Each file should have one clear purpose like grouped logic, a component, etc.

### Making Changes

When making changes you may test your changes with `npm run build`. You may also run a git status or git diff as needed.
**Never start or modify my dev server on port 3000.**
Do not make git commits.