# Friends Bet

## Project Overview
Sports betting app for friend groups. Built for Ryan's dad and his friends, with plans to launch publicly. Users create groups, propose/accept bets on real sports games, and manage wallets.

## Tech Stack
- **Frontend:** React 19 + TypeScript, Material UI (MUI 7), React Router v6, Axios — lives in `frontend/`
- **Backend:** Java 17, Spring Boot 3.5, Maven — lives in `src/` with `pom.xml` at root
- **Monorepo:** Frontend and backend are in the same repo
- **Package manager:** npm (lockfile at `frontend/package-lock.json`)

## Frontend Conventions
- MUI is the component library — stick with it, don't introduce alternatives
- Custom CSS uses `fb-*` naming convention (see `frontend/src/styles/ui.css`)
- Theme config is in `frontend/src/theme.ts`
- CSS custom properties (variables) are used for theming alongside MUI
- State management via React Context API (`AuthContext`, `GroupContext`)
- User preferences stored in localStorage

## UI Design Reference
- **Always consult `frontend/DESIGN.md` before making any UI/styling changes.** It is the single source of truth for colors, typography, glass card styles, navigation, bento grid layout, animation, and accessibility requirements.
- Use the exact CSS tokens, class names, and MUI theme values defined there — don't improvise new ones.
- If a change conflicts with DESIGN.md, flag it and ask before proceeding.

## Key Frontend Paths
- `frontend/src/theme.ts` — MUI theme configuration
- `frontend/src/styles/ui.css` — Core CSS primitives
- `frontend/src/styles/groups.css` — Groups page styles
- `frontend/src/components/` — 40+ reusable components
- `frontend/src/pages/` — Main pages (Groups, Bets, Wallets, Auth)

## Off-Limits (always ask before modifying)
- **Auth / login flow** — don't touch without asking
- **Database / backend code** — don't modify without asking
- **API layer** — don't change API calls or endpoints without asking

## Git Rules
- **NEVER auto-commit.** User handles all git operations.
- Don't push, don't create branches, don't amend — unless explicitly asked.

## How to Work With Me
- Explain your reasoning when making design/code choices
- Proactively suggest improvements when you notice something
- Always ask before refactoring existing code
- Don't just give the answer — walk through the "why"
