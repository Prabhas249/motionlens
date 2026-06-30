---
name: motionlens-dashboard
description: Design system for the MotionLens app dashboard (everything under /dashboard and /settings). Use when building or editing ANY in-app UI — settings, billing, history, panels, forms, sidebar, header — so new screens match the existing dense, dark, bordered "telemetry" look instead of generic shadcn. Dark-first, cobalt accent, rounded-xl bordered cards, small type, mono micro-labels.
---

# MotionLens Dashboard Design System

The look of the MotionLens product app (`app/(app)/**`). It is **dense, crisp, dark-first, and bordered** — closer to a developer telemetry tool than a marketing site. Match it exactly; never introduce a second visual language.

## Tokens (from `app/globals.css`)
Always use the theme tokens, never hex. Both light + dark are defined; the app defaults to dark.
- Surfaces: `bg-background` (page), `bg-card` (panels), `bg-muted` (insets/chips).
- Text: `text-foreground` (primary), `text-muted-foreground` (secondary/labels).
- Accent: `text-primary` / `bg-primary` / `text-primary-foreground` — **cobalt `#2A48F0`**. The ONE accent. Don't add new brand colors.
- Lines: `border` everywhere (a hairline — `rgba(255,255,255,.08)` in dark). Borders define structure here, not shadows.
- Status: emerald = good/high, amber = medium/warn, red/`destructive` = bad. Always as `text-X-400 border-X-400/30 bg-X-400/10`.

## Core patterns (copy these verbatim)
- **Panel / card:** `rounded-xl border bg-card`. Inner blocks/chips: `rounded-lg border bg-card p-3`.
- **Panel section header:** `flex h-12 shrink-0 items-center justify-between border-b px-4` with a `text-sm font-medium` title.
- **Pill / tag:** `rounded-full border px-2.5 py-1 text-xs text-muted-foreground` (or `rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground` for inline chips).
- **Empty-state icon:** `flex size-14 items-center justify-center rounded-2xl border bg-card`.
- **Micro-label (eyebrow):** `font-mono text-[10px] text-muted-foreground` (often uppercase). This mono micro-label is a signature of the look.
- **Scroll regions:** scroll INSIDE a panel (`overflow-x-auto` / `overflow-y-auto min-h-0`), not the whole page. The dashboard caps to viewport height and scrolls internals.

## Spacing & type
- Tight. Stacks use `space-y-3` / `gap-3` (panels) and `gap-4` between major regions. Padding `p-3` (compact) to `p-4`/`p-6` (roomy/empty states).
- Type scale: `text-sm` body, `text-xs` secondary, `text-[11px]`/`text-[10px]` micro. Headings `font-semibold tracking-tight`, usually `text-sm`–`text-xl` (this app rarely goes bigger). Numbers: `tabular-nums`.

## Buttons (`@/components/ui/button`)
- Variants: `default` (cobalt), `outline`, `ghost`, `destructive` (soft tinted, not solid red). Sizes: `default` h-8, `sm` h-7, `xs` h-6, `icon-sm` size-7.
- In-panel actions are usually `variant="outline" size="sm"` with `className="h-7 gap-1.5 text-xs"`. Icon + label, icon first.

## Tabs / segmented controls
- Use `@/components/motion/tabs` (`Tabs`/`TabsList`/`TabsTrigger`, `variant="segment"`) for in-panel mode switches (e.g. the analysis mode picker).
- For route-level navigation (settings sub-pages), use an underline nav: `-mb-px border-b-2` active=`border-primary text-foreground`, inactive=`border-transparent text-muted-foreground hover:text-foreground`.

## Shell (don't rebuild — reuse)
- `AppShell` = `SidebarProvider` + `AppSidebar` + `SidebarInset`(`AppHeader` + max-w-(--app-wrapper-max-width) content). Wrap every in-app page in `<AppShell>`.
- `AppHeader`: sticky `h-14 border-b`, left = sidebar trigger + `HeaderBreadcrumb` (pathname-driven), right = `CreditsBadge` + `ThemeToggle` + actions + `NavUser`.
- `AppSidebar`: `collapsible="icon"`, grouped `NavGroup`s (active via `usePathname`), footer with `LatestChange` + footer links. Sidebar header = logo → `/dashboard`.

## Primitives available
`button, card, badge, switch, avatar, input, label, textarea, dialog, dropdown-menu, collapsible, sidebar, breadcrumb, scroll-area, separator, sheet, skeleton, tooltip, wave-spinner` (in `components/ui/`), plus `components/motion/tabs`. Prefer these; only add a new primitive when none fits, and style it from tokens.

## Do / Don't
- DO: borders for structure, dense spacing, small text, one cobalt accent, mono micro-labels, scroll inside panels, `tabular-nums` for figures.
- DON'T: drop shadows for elevation, large airy padding, second accent color, raw hex, full-page scroll, generic shadcn spacing that feels "other". If a new screen looks lighter/airier than the analyze dashboard, it's wrong — tighten it.
