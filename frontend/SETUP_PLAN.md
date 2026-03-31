# BigStu Bets — Foundation Setup Plan

> Pre-revamp infrastructure work. Gets all tokens, classes, and utilities in place before touching any pages or components.
> Reference: `frontend/DESIGN.md` for all design values.

---

## Files Modified

| File | What changes |
|---|---|
| `frontend/public/index.html` | Space Mono font link, title, theme-color |
| `frontend/src/theme.ts` | Dark palette, Space Mono, updated component overrides |
| `frontend/src/styles/ui.css` | CSS variables (dark), token renames in existing classes, glass/bento/nav classes, a11y |

**No new files created. No components or pages modified. No imports changed.**

---

## Phase 1: Font Loading

**File:** `frontend/public/index.html`

- Add Google Fonts `<link>` for Space Mono (400 + 700 weights)
- Update `<title>` from "React App" to "BigStu Bets"
- Update `<meta name="theme-color">` from `#000000` to `#020617` (new deep bg)

---

## Phase 2: MUI Theme — Dark Mode + Typography

**File:** `frontend/src/theme.ts`

- Flip `palette.mode` from `'light'` to `'dark'`
- Replace entire palette with DESIGN.md values:

| MUI Key | Value | Maps to |
|---|---|---|
| `background.default` | `#020617` | `--fb-bg-deep` |
| `background.paper` | `#0F172A` | `--fb-bg-surface` |
| `text.primary` | `#F8FAFC` | `--fb-text-primary` |
| `text.secondary` | `#94A3B8` | `--fb-text-secondary` |
| `text.disabled` | `#64748B` | `--fb-text-muted` |
| `primary.main` | `#22C55E` | `--fb-accent` (emerald) |
| `primary.dark` | `#16A34A` | `--fb-accent-dim` |
| `error.main` | `#EF4444` | `--fb-danger` |
| `warning.main` | `#F59E0B` | `--fb-warning` |
| `info.main` | `#3B82F6` | `--fb-info` |
| `divider` | `rgba(255,255,255,0.1)` | `--fb-border` |

- Swap `fontFamily` from Inter to `'"Space Mono", monospace'`
- Update typography variants per DESIGN.md:
  - h1–h2: 700 weight, `0.1em` letter-spacing, uppercase
  - h3–h4: 700 weight, `0.05em` letter-spacing
  - body1/2: 400 weight
  - caption: 400 weight, `0.15em` letter-spacing, uppercase
  - button: 700 weight, `0.05em` letter-spacing, uppercase
- Update MUI component overrides for dark:
  - `MuiAppBar` — dark translucent bg (`rgba(2,6,23,0.8)`), blur, border with `--fb-border`
  - `MuiDrawer` — bg `#0F172A`, updated border
  - `MuiPaper` — bg `#0F172A`, border `rgba(255,255,255,0.1)`
  - `MuiButton` — emerald accent for contained, updated hover states
  - `MuiListItemButton` — dark selected/hover states (Slate 800/900)

---

## Phase 3: CSS Custom Properties

**File:** `frontend/src/styles/ui.css`

Replace `:root` variables with DESIGN.md dark palette. Token migration:

| Old Token | New Token | New Value |
|---|---|---|
| `--fb-primary` | `--fb-accent` | `#22C55E` |
| `--fb-primary-contrast` | *(keep)* | `#ffffff` |
| `--fb-page-bg` | `--fb-bg-deep` | `#020617` |
| `--fb-surface` | `--fb-bg-surface` | `#0F172A` |
| `--fb-text` | `--fb-text-primary` | `#F8FAFC` |
| `--fb-muted` | `--fb-text-muted` | `#64748B` |
| `--fb-border` | `--fb-border` | `rgba(255,255,255,0.1)` |
| `--fb-bg-input` | *(update)* | `#1E293B` |
| `--fb-danger` | `--fb-danger` | `#EF4444` |
| `--fb-deep` | `--fb-bg-deep` | `#020617` |

**Add new tokens:**
- `--fb-bg-elevated: #1E293B`
- `--fb-text-secondary: #94A3B8`
- `--fb-border-hover: rgba(255,255,255,0.2)`
- `--fb-accent-dim: #16A34A`
- `--fb-warning: #F59E0B`
- `--fb-info: #3B82F6`

**Remove stale tokens:**
- `--fb-cl-ink`, `--fb-cl-sky`, `--fb-cl-blue`, `--fb-cl-red`
- `--fb-accent-1`, `--fb-accent-2`, `--fb-accent-3`

**Find-and-replace** all old token references within existing `fb-*` classes (e.g. `var(--fb-text)` → `var(--fb-text-primary)`, `var(--fb-surface)` → `var(--fb-bg-surface)`, etc.)

---

## Phase 4: Glass Card Classes

**File:** `frontend/src/styles/ui.css` (append after existing classes)

```css
.fb-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: border-color 200ms ease;
}
.fb-glass:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.fb-glass--elevated {
  background: rgba(255, 255, 255, 0.08);
}

.fb-glass--subtle {
  background: rgba(255, 255, 255, 0.02);
}
```

---

## Phase 5: Bento Grid Classes

**File:** `frontend/src/styles/ui.css` (append)

```css
.fb-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(180px, auto);
  gap: 16px;
}

.fb-bento-sm  { grid-column: span 1; grid-row: span 1; }
.fb-bento-md  { grid-column: span 2; grid-row: span 1; }
.fb-bento-lg  { grid-column: span 2; grid-row: span 2; }
.fb-bento-xl  { grid-column: span 4; grid-row: span 1; }

@media (max-width: 1199px) {
  .fb-bento { grid-template-columns: repeat(2, 1fr); }
  .fb-bento-lg { grid-column: span 2; }
  .fb-bento-xl { grid-column: span 2; }
}

@media (max-width: 767px) {
  .fb-bento { grid-template-columns: 1fr; }
  .fb-bento-sm,
  .fb-bento-md,
  .fb-bento-lg,
  .fb-bento-xl { grid-column: span 1; grid-row: span 1; }
}
```

---

## Phase 6: Navigation CSS Classes

**File:** `frontend/src/styles/ui.css` (append)

CSS-only classes for the new horizontal top nav (component work comes later):

| Class | Purpose |
|---|---|
| `.fb-nav` | Top bar container — flex, horizontal, full width, dark bg |
| `.fb-nav-logo` | Left-aligned app name |
| `.fb-nav-links` | Center group of navigation links |
| `.fb-nav-link` | Individual link with 3-stage hover animation |
| `.fb-nav-link--active` | Active route — persistent emerald bottom border |
| `.fb-nav-actions` | Right-aligned user actions (avatar, logout) |
| `.fb-hamburger` | Mobile toggle — 3 lines → X via CSS transform |
| `.fb-mobile-menu` | Full-screen vertical overlay menu |

**Hover animation (3 stages, ~300ms):**
1. `::after` — top + bottom borders scale in (`scaleX(0)` → `scaleX(1)`)
2. `::before` — background fill slides down (`scaleY(0)` → `scaleY(1)`, origin top)
3. Text color inverts (`--fb-text-primary` → `--fb-bg-deep`)

---

## Phase 7: Accessibility & Motion

**File:** `frontend/src/styles/ui.css` (append)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Add `focus-visible` styles for all interactive elements (emerald outline, 2px offset)

---

## After This Plan

The app will look "broken" — dark backgrounds with components still expecting light styles. **That's expected.** Every token, class, and utility from DESIGN.md will be in place, ready for the page-by-page revamp:

1. Auth page (animated background + glass form)
2. MainPage layout (replace Drawer with top nav component)
3. Groups page (bento grid)
4. Bets page (bento grid)
5. Wallets page (glass cards)
6. Component-by-component updates (buttons, inputs, modals, toasts, badges)

---

## Verification

- [ ] `cd frontend && npm start` — compiles without errors
- [ ] Page background is dark (`#020617`)
- [ ] Text renders in Space Mono
- [ ] Inspect `:root` in DevTools — new CSS variables present
- [ ] No broken `var(--fb-*)` references (check DevTools for unresolved values)
- [ ] Glass/bento/nav classes exist in stylesheet (even if not applied yet)
