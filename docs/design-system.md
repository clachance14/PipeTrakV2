# Design System Overview

## Foundations

- **Typography:** Inter is the default sans-serif stack (`--font-sans`). Use semantic sizes instead of ad-hoc values:
  - Display & hero copy: `text-display` helper or `text-4xl`/`text-5xl` as needed.
  - Page titles: `text-2xl font-semibold`.
  - Section titles: `text-xl font-semibold`.
  - Body: `text-base text-foreground`.
  - Secondary/caption text: `text-sm` / `text-xs text-muted-foreground`.
- **Colors:** All primitives reference CSS variables defined in `src/index.css`. Primary UI color is blue (`--primary`), surfaces use `--background` (`slate-50`) and `--card` (white). Status colors are mapped to `success`, `warning`, `info`, and `destructive`.
- **Spacing & Radius:** Page padding defaults to `px-4 sm:px-6 lg:px-8` with `py-6`. Components should use multiples of 4px (`gap-2`, `gap-4`, etc.). The global radius token (`--radius`) is 8px; `SurfaceCard` exposes padding variants to keep spacing uniform.

## Layout Primitives

### PageContainer
```
import { PageContainer } from '@/components/layout/PageContainer'

<PageContainer>
  {/* page content */}
</PageContainer>
```
- Centers content to `max-w-7xl` by default.
- `fullWidth` stretches edge-to-edge; `fixedHeight` enables `flex` mode for pages with scrollable children (e.g., Drawings, Weld Log).

### PageHeader
```
<PageHeader
  eyebrow="Operations"
  title="Dashboard"
  description="Live health overview for project P-1001"
  actions={<Button>New Report</Button>}
/>
```
- Provides consistent spacing for title/description/action rows.
- Supports optional `eyebrow`, `actions`, and alignment control via `align="center"`.

### SurfaceCard
```
<SurfaceCard padding="lg">
  <h3 className="text-lg font-semibold">Overall Progress</h3>
  {/* content */}
</SurfaceCard>
```
- Base surface wrapper with shared border/radius/shadow.
- Variants: `default`, `muted`, `subtle`, `ghost`.
- Padding options: `sm`, `md`, `lg`, or `none`.

### DataToolbar
```
<DataToolbar
  meta={`Showing ${visible} of ${total}`}
  actions={<Button variant="outline">Clear filters</Button>}
>
  <ComponentSearch />
  <StatusSelect />
</DataToolbar>
```
- Arranges filter inputs and optional action buttons.
- `meta` renders right-aligned descriptive text; `sticky` keeps the toolbar pinned to the top of a scroll container.

## Usage Guidance

1. Wrap every routed page body with `PageContainer` inside `Layout`.
2. Start pages with `PageHeader` to align titles/descriptions and keep action placement predictable.
3. Use `SurfaceCard` for any white or muted panels (stats, tables, cards) instead of bespoke `div` styling.
4. Run toolbar/filter rows through `DataToolbar` so Dashboard, Components, Drawings, and Weld Log share the same filter affordances.
5. When creating new components, consume the CSS variables (`text-muted-foreground`, `bg-card`, `border-border`) instead of raw colors to inherit theme updates automatically.
