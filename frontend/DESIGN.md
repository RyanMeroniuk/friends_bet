# BigStu Bets — UI Design Reference

> Living design document. Single source of truth for all visual decisions.
> Last updated: 2026-03-30

---

## 1. Visual Identity

- **App name:** BigStu Bets
- **Vibe:** Dark, technical, editorial — like a premium terminal meets a sportsbook
- **Inspirations:** UIMIX (monospace + geometric animation), Apple Bento Grid, financial dashboards
- **Styling system:** MUI + custom CSS (`fb-*` classes). No Tailwind.

---

## 2. Color Palette (Dark Theme)

All colors are exposed as CSS custom properties on `:root` and mapped to the MUI theme object.

| Token | Hex | Usage |
|---|---|---|
| `--fb-bg-deep` | `#020617` | Page background (Slate 950) |
| `--fb-bg-surface` | `#0F172A` | Card/panel backgrounds (Slate 900) |
| `--fb-bg-elevated` | `#1E293B` | Elevated surfaces, hover states (Slate 800) |
| `--fb-text-primary` | `#F8FAFC` | Primary text (Slate 50) |
| `--fb-text-secondary` | `#94A3B8` | Muted/secondary text (Slate 400) |
| `--fb-text-muted` | `#64748B` | Subtle labels (Slate 500) |
| `--fb-border` | `rgba(255,255,255,0.1)` | Subtle glass borders |
| `--fb-border-hover` | `rgba(255,255,255,0.2)` | Hover-state borders |
| `--fb-accent` | `#22C55E` | Primary accent / wins / CTA (Emerald 500) |
| `--fb-accent-dim` | `#16A34A` | Accent hover state (Emerald 600) |
| `--fb-danger` | `#EF4444` | Losses / errors / destructive (Red 500) |
| `--fb-warning` | `#F59E0B` | Pending / caution (Amber 500) |
| `--fb-info` | `#3B82F6` | Informational (Blue 500) |

### MUI Theme Mapping

```ts
// theme.ts — palette excerpt
palette: {
  mode: 'dark',
  background: {
    default: '#020617',  // --fb-bg-deep
    paper: '#0F172A',    // --fb-bg-surface
  },
  text: {
    primary: '#F8FAFC',   // --fb-text-primary
    secondary: '#94A3B8', // --fb-text-secondary
    disabled: '#64748B',  // --fb-text-muted
  },
  primary: {
    main: '#22C55E',  // --fb-accent
    dark: '#16A34A',  // --fb-accent-dim
  },
  error: { main: '#EF4444' },
  warning: { main: '#F59E0B' },
  info: { main: '#3B82F6' },
  divider: 'rgba(255,255,255,0.1)',
}
```

---

## 3. Typography

**Font:** Space Mono (monospace everywhere — full commitment to the technical look)

- **Google Fonts link:** `Space Mono:wght@400;700`
- Add to `frontend/public/index.html`

| Context | Weight | Letter-spacing | Transform | Color token |
|---|---|---|---|---|
| Page titles (h1–h2) | 700 | `0.1em` | `uppercase` | `--fb-text-primary` |
| Section headings (h3–h4) | 700 | `0.05em` | — | `--fb-text-primary` |
| Body text | 400 | `normal` | — | `--fb-text-primary` |
| Numbers / odds / stats | 700 | `normal` | — | `--fb-accent` or `--fb-text-primary` |
| Small labels / captions | 400 | `0.15em` | `uppercase` | `--fb-text-muted` |
| Buttons | 700 | `0.05em` | `uppercase` | varies |

### MUI Theme Mapping

```ts
// theme.ts — typography excerpt
typography: {
  fontFamily: '"Space Mono", monospace',
  h1: { fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' },
  h2: { fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' },
  h3: { fontWeight: 700, letterSpacing: '0.05em' },
  h4: { fontWeight: 700, letterSpacing: '0.05em' },
  body1: { fontWeight: 400 },
  body2: { fontWeight: 400 },
  caption: { fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' },
  button: { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' },
}
```

---

## 4. Glass Card System

Frosted glass panels over the dark background. This is the primary card treatment.

### CSS Class: `.fb-glass`

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
```

### Variants

| Variant | Background | Use case |
|---|---|---|
| `.fb-glass` (default) | `rgba(255,255,255,0.05)` | Standard cards |
| `.fb-glass--elevated` | `rgba(255,255,255,0.08)` | Modals, dropdowns, popovers |
| `.fb-glass--subtle` | `rgba(255,255,255,0.02)` | Background sections, large containers |

### Rules
- All cards use glass treatment — no opaque white cards
- Inner padding: `24px` (desktop), `16px` (mobile)
- Avoid stacking blur layers (glass inside glass) — performance and visual muddle

---

## 5. Navigation — Hover Effect Menu Bar

Horizontal top nav replacing the current MUI Drawer sidebar. Inspired by UIMIX menu-hover-effects.

### Structure
```
[ BigStu Bets logo ]   [ Groups ]   [ Bets ]   [ Wallets ]   [ avatar/logout ]
```

### Desktop Hover Animation (3 stages, ~300ms total)

1. **Borders appear** — Top + bottom borders scale in horizontally (`transform: scaleX(0)` → `scaleX(1)`)
2. **Background fills** — A `::before` pseudo-element scales from `scaleY(0)` to `scaleY(1)`, origin top
3. **Text inverts** — Color transitions from `--fb-text-primary` to `--fb-bg-deep`

All three happen via CSS transitions on the `.fb-nav-link` class. No JavaScript animation library needed.

### CSS Classes

| Class | Purpose |
|---|---|
| `.fb-nav` | Top nav bar container (flex, horizontal, full width) |
| `.fb-nav-logo` | Left-aligned logo/app name |
| `.fb-nav-links` | Center group of navigation links |
| `.fb-nav-link` | Individual nav item with hover animation |
| `.fb-nav-link--active` | Currently active route indicator |
| `.fb-nav-actions` | Right-aligned user actions (avatar, logout) |

### Dark Theme Adaptation
- Borders and fill use `--fb-text-primary` (#F8FAFC) or `--fb-accent` (#22C55E)
- Text inverts to `--fb-bg-deep` (#020617) on hover
- Active link has a persistent subtle bottom border in `--fb-accent`

### Mobile (< 768px)
- Hamburger icon (3 lines → X, animated via CSS transform on `fb-hamburger` spans)
- Opens full-screen vertical menu overlay (`.fb-mobile-menu`)
- Menu items stacked vertically, same hover effect adapted for touch (active state on tap)
- Background: `--fb-bg-deep` at 95% opacity with blur

---

## 6. Bento Grid Layout

Mixed-size CSS Grid for dashboard pages. Cards occupy different grid cells for visual hierarchy.

### CSS Class: `.fb-bento`

```css
.fb-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(180px, auto);
  gap: 16px;
}
```

### Tile Sizes

| Class | Grid span | Use case |
|---|---|---|
| `.fb-bento-sm` | 1 col × 1 row | Stats, quick actions, win/loss record |
| `.fb-bento-md` | 2 col × 1 row | Group cards, wallet balance |
| `.fb-bento-lg` | 2 col × 2 row | Active bets, featured matchups |
| `.fb-bento-xl` | 4 col × 1 row | Full-width banners, announcements |

```css
.fb-bento-sm  { grid-column: span 1; grid-row: span 1; }
.fb-bento-md  { grid-column: span 2; grid-row: span 1; }
.fb-bento-lg  { grid-column: span 2; grid-row: span 2; }
.fb-bento-xl  { grid-column: span 4; grid-row: span 1; }
```

### Responsive Breakpoints

| Viewport | Columns | Behavior |
|---|---|---|
| >= 1200px | 4 columns | Full bento layout |
| 768px–1199px | 2 columns | `lg` → `xl` (full width), `md` → full width |
| < 768px | 1 column | All cards stack vertically, full width |

---

## 7. Animation

### Auth / Landing Pages
- **UnicornStudio** geometric animation as background — circles/spheres orbiting a central sports element (basketball, football, or BigStu Bets logo)
- Rendered as an embedded `<iframe>` or `<canvas>` behind a glass form card
- Z-index: animation at `z-index: 0`, form card at `z-index: 1`

### Dashboard Background
- Very subtle animated effect — one of:
  - Slow gradient mesh (2–3 dark colors shifting over 30s+)
  - Floating dot particles (very low opacity, slow drift)
- Must NOT distract from content — glass cards are the star
- CSS only if possible; canvas fallback if needed

### Micro-interactions
- **Hover transitions:** 150–200ms ease on buttons, cards, nav links
- **Border glow:** Glass card borders brighten on hover (200ms)
- **Number changes:** Smooth counter animation when odds/balances update
- **Page transitions:** Subtle fade-in (200ms) on route change

### Accessibility: `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Styling Approach

**MUI + custom CSS. No Tailwind.**

### Why
- 52+ components already use `fb-*` CSS classes — switching would be a rewrite
- MUI's dark theme support covers 80% of the work via `createTheme()`
- Glass effects, bento grids, and the nav animation are all clean in vanilla CSS
- One styling system is simpler than two

### How It Works Together
- **MUI `theme.ts`** handles palette, typography, component defaults (buttons, inputs, etc.)
- **CSS custom properties** (`--fb-*`) in `ui.css` are the source of truth for colors/spacing
- **`fb-*` classes** in `ui.css` and page-specific CSS files handle layout and custom effects (glass, bento, nav)
- MUI components inherit theme; custom components use `fb-*` classes

### File Responsibilities

| File | Owns |
|---|---|
| `theme.ts` | MUI palette, typography, component overrides |
| `styles/ui.css` | CSS variables, `.fb-glass`, `.fb-bento`, `.fb-nav`, utility classes |
| `styles/groups.css` | Groups page-specific layout |
| `styles/auth.css` | Auth page animation background, form positioning |
| Page-specific CSS | Any page-unique layout not covered by shared classes |

---

## 9. Page-by-Page Scope

### Auth (Login / Signup)
- Full-screen UnicornStudio animation background
- Centered `.fb-glass--elevated` card with form
- BigStu Bets logo above the form
- Emerald accent on primary CTA button

### Dashboard / MainPage
- Dark `AppBar` with horizontal nav (replaces current sidebar)
- Content area with `--fb-bg-deep` background
- Subtle animated background (gradient mesh or particles)

### Groups Page
- `.fb-bento` grid layout
- Each group is a `.fb-glass` card (`.fb-bento-md` default)
- Featured/active group gets `.fb-bento-lg`
- Group stats (members, active bets) shown as `.fb-bento-sm` tiles

### Bets Page
- `.fb-bento` grid layout
- Featured/active bets get `.fb-bento-lg` tiles
- Bet cards show: matchup, odds (bold monospace), status pill, proposer
- Status pills: emerald (won), red (lost), amber (pending), blue (info)

### Wallets Page
- Balance display: large monospace number in `.fb-glass--elevated` card
- Transaction history in a clean list below
- Deposit/withdraw buttons: emerald accent

---

## 10. Contrast & Accessibility

All text must meet **WCAG AA (4.5:1)** contrast ratio against its background.

| Text | Background | Ratio | Pass? |
|---|---|---|---|
| `#F8FAFC` on `#020617` | Deep bg | 19.4:1 | Yes |
| `#F8FAFC` on `#0F172A` | Surface bg | 15.4:1 | Yes |
| `#94A3B8` on `#020617` | Deep bg | 7.1:1 | Yes |
| `#94A3B8` on `#0F172A` | Surface bg | 5.6:1 | Yes |
| `#64748B` on `#020617` | Deep bg | 4.7:1 | Yes (AA) |
| `#22C55E` on `#020617` | Deep bg | 8.3:1 | Yes |
| `#EF4444` on `#0F172A` | Surface bg | 4.6:1 | Yes (AA) |

### Additional Accessibility Rules
- All interactive elements have visible focus indicators (emerald outline, 2px offset)
- Touch targets minimum 44x44px on mobile
- `prefers-reduced-motion` respected (see Section 7)
- Color is never the sole indicator — always pair with icons or text labels

---

## 11. Implementation Order

| Step | What | Key Files |
|---|---|---|
| 1 | Update theme & CSS tokens | `theme.ts`, `styles/ui.css` |
| 2 | Add Space Mono font | `public/index.html`, `theme.ts` |
| 3 | Glass card classes | `styles/ui.css` |
| 4 | Navigation menu bar | New component + `styles/ui.css` |
| 5 | Bento grid classes | `styles/ui.css` |
| 6 | Auth page animation | `Pages/AuthPage.tsx`, `styles/auth.css` |
| 7 | Dashboard background | `Pages/MainPage.tsx` |
| 8 | Component-by-component updates | All components |

Each step is independently shippable. Steps 1–3 give the biggest visual impact with the least risk.

---

## 12. Verification Checklist

- [ ] Dev server starts without errors (`cd frontend && npm start`)
- [ ] All pages render: Auth, Groups, Bets, Wallets
- [ ] Text contrast meets 4.5:1 (WCAG AA) — spot-check with browser DevTools
- [ ] Test at viewports: 375px, 768px, 1024px, 1440px
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Glass card blur renders in Chrome, Firefox, Safari
- [ ] Navigation hover animation works on desktop
- [ ] Mobile hamburger menu opens/closes correctly
- [ ] No horizontal scrollbars at any viewport
