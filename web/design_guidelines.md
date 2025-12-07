# Design Guidelines: AI Evals Framework Dashboard

## Design Approach
**Design System**: shadcn/ui with Radix UI primitives - perfect for data-dense B2B SaaS dashboards
**Visual Direction**: Linear + Vercel aesthetic - minimal, monochromatic, data-focused with surgical use of accent colors

## Core Design Principles
1. **Data First**: Prioritize information density and readability over decorative elements
2. **Monochrome Foundation**: Black/white/gray palette with single accent color for states
3. **Surgical Precision**: Every element serves a functional purpose

## Typography
- **Primary Font**: Inter or Geist (via Google Fonts CDN)
- **Hierarchy**:
  - Page Titles: text-3xl font-semibold
  - Section Headers: text-xl font-medium
  - Card Titles: text-sm font-medium
  - Body Text: text-sm font-normal
  - Metadata/Labels: text-xs text-muted-foreground

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16 (p-4, gap-6, mb-8, etc.)

**Application Shell**:
- Fixed sidebar (w-64) with navigation
- Main content area with max-w-7xl container
- Top bar (h-16) with breadcrumbs and user menu
- Content padding: p-6 to p-8

**Grid System**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Project/Dataset grids: grid-cols-1 lg:grid-cols-3
- Consistent gap-6 between grid items

## Component Library

### Navigation
**Sidebar**:
- Dark background with light text
- Active state: subtle background highlight
- Icon + label pattern for menu items
- Collapsible sections for Projects/Datasets
- User profile at bottom with tenant switcher

**Breadcrumbs**: Small text-sm with slash separators in top bar

### Dashboard Components
**Stat Cards**:
- Border card with p-6
- Large metric number (text-3xl font-bold)
- Small label above (text-sm text-muted-foreground)
- Trend indicator with arrow icon
- Grid layout: 4 cards across on desktop

**Agent Performance Chart**:
- Full-width card (col-span-full)
- Recharts area chart with smooth curves
- Minimal gridlines
- Single accent color for line
- Height: h-80

### Data Tables
**TanStack Table Implementation**:
- Striped rows for readability (every other row subtle background)
- Sticky header with border-b
- Column headers: text-xs font-medium uppercase tracking-wide
- Cell padding: px-6 py-4
- Sortable columns with arrow icons
- Row hover state: subtle background change
- Pagination controls at bottom (showing "1-10 of 234")
- Filters in table header with search + dropdown combos

**Metrics Display**:
- Monospace font for numerical data (font-mono)
- Color-coded pass/fail indicators (green/red only when needed)
- Badges for status (outlined style)

### Forms & Inputs
**shadcn Form Components**:
- Input fields with subtle border, focus ring on interaction
- Labels: text-sm font-medium mb-2
- Helper text: text-xs text-muted-foreground mt-1
- Buttons: Default (black), Ghost (transparent), Outline (bordered)
- Select dropdowns with Radix UI primitives
- All form elements maintain consistent height (h-10)

### Cards & Containers
- Border radius: rounded-lg (8px)
- Borders: border border-border (subtle gray)
- Padding: p-6 for card bodies
- Card headers with border-b separator
- White/dark background depending on theme

### Project/Dataset Cards
- Compact card layout with hover elevation
- Title + description + metadata row
- Action buttons in top-right corner (ghost style)
- Last updated timestamp (text-xs text-muted-foreground)
- Tag badges for categorization

### Settings Page
- Sidebar navigation for setting sections
- Form sections with clear headers
- Dividers between setting groups (border-b)
- Save button always visible (sticky bottom or top-right)

## Visual Hierarchy
1. **Primary Actions**: Solid black buttons (bg-primary)
2. **Secondary Actions**: Outline buttons
3. **Tertiary Actions**: Ghost buttons
4. **Destructive Actions**: Red accent (sparingly)

## Spacing Patterns
- Page margins: p-6 to p-8
- Section spacing: space-y-6 to space-y-8
- Card internal spacing: p-6
- Form field spacing: space-y-4
- Table cell padding: px-6 py-4

## Icons
**Lucide React** (via npm): Use for all icons
- Sidebar menu: 20px icons
- Buttons: 16px icons
- Table actions: 16px icons
- Consistent stroke-width: 2

## State Indicators
- **Loading**: Skeleton loaders matching component shapes
- **Empty States**: Centered with icon + message + CTA
- **Error States**: Alert component with red accent border
- **Success Toast**: Top-right notification with green accent

## Animations
**Minimal Motion**:
- Page transitions: None
- Hover states: Subtle opacity/background changes (no transform)
- Chart animations: 300ms ease on initial render only
- Table sorting: Instant, no animation

## Responsive Behavior
- Sidebar: Collapses to icon-only on tablet (<1024px)
- Tables: Horizontal scroll on mobile with sticky first column
- Grids: Stack to single column on mobile
- Charts: Maintain aspect ratio, reduce height on mobile

## Images
No hero images or marketing imagery. This is a data dashboard - all visual content is functional (charts, graphs, data visualizations).