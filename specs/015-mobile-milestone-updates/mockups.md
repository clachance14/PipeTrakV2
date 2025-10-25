# Mobile Milestone Updates - UI Wireframes

**Feature**: Mobile-responsive milestone updates
**Approach**: Desktop UI adapted for mobile with touch-friendly targets
**Breakpoint**: ≤640px (Tailwind `sm:` breakpoint)
**Created**: 2025-10-23

---

## Design Principles

1. **Responsive, not separate**: Same components as desktop, just larger touch targets
2. **Information density**: Show Type, Commodity Code, Size, Description, Sequence, Area, System, Test Package
3. **Minimal clicks**: 1 tap for discrete milestones, 2 taps for partial milestones
4. **No progress bars on components**: Only show on drawing rows (reduced clutter)
5. **Touch-first**: All interactive elements ≥44x44px on mobile

---

## 1. Mobile Drawings List View

```
┌─────────────────────────────────────┐
│  ☰  PipeTrak        [📤 3]  [👤]   │ ← Header (60px)
├─────────────────────────────────────┤
│ 🔍 Search...              [Filter] │ ← Search + filter (48px)
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ P-001                       [>] │ │ ← Collapsed Drawing
│ │ A:100  S:HVAC-01  TP:PKG-A     │ │   (68px height)
│ │ ████████░░░░ 47%                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ P-002                       [v] │ │ ← Expanded Drawing
│ │ A:200  S:PIPING-05  TP:PKG-B   │ │   (68px header)
│ │ ███████████░ 65%                │ │
│ ├─────────────────────────────────┤ │
│ │                                 │ │
│ │ Valve • VBALU-001               │ │ ← Component Row
│ │ 2" Ball Valve (1)               │ │   Type • Code
│ │                                 │ │   Size Desc (Seq)
│ │  ☑️       ☐       📊           │ │   Milestones
│ │  Rec     Fit     Weld          │ │   (85px height)
│ │  50%     0%      75%           │ │
│ │                                 │ │
│ ├─────────────────────────────────┤ │
│ │                                 │ │
│ │ Flange • FBLAG2DFA              │ │
│ │ 1" Blind Flange (1)             │ │
│ │                                 │ │
│ │  ☑️       ☑️       ☑️           │ │
│ │  Rec     Inst    NDE           │ │
│ │ 100%    100%    100%           │ │
│ │                                 │ │
│ ├─────────────────────────────────┤ │
│ │                                 │ │
│ │ Instrument • ME-55402           │ │
│ │ 1/2" Pressure Gauge (1)         │ │
│ │                                 │ │
│ │  ☐       ☐       ☐             │ │
│ │  Rec     Cal     Hook          │ │
│ │  0%      0%      0%            │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ DRAIN-1                     [>] │ │
│ │ A:100  S:DRAIN  TP:PKG-A       │ │
│ │ ░░░░░░░░░░░░ 0%                 │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

Legend:
☑️ = Checked (100% or discrete complete)
☐ = Unchecked (0% or discrete incomplete)
📊 = Partial milestone (has value between 1-99%)
[>] = Tap to expand drawing
[v] = Tap to collapse drawing

Metadata Abbreviations:
A: = Area
S: = System
TP: = Test Package
```

---

## 2. Component Row Detail

```
┌─────────────────────────────────────┐
│                                     │
│ Valve • VBALU-001                   │ ← Line 1: Type • Code
│ 2" Ball Valve Cl150 (1)             │ ← Line 2: Size Desc (Seq)
│                                     │
│  ☑️       ☐       📊               │ ← Line 3: Checkboxes
│  Rec     Fit     Weld              │   Labels below
│  50%     0%      75%               │   % below labels
│                                     │
└─────────────────────────────────────┘
Total height: ~85px per component

Touch Target Layout:
┌─────────────────────────────────────┐
│  ┌────┐   ┌────┐   ┌────┐         │
│  │ ☑️ │   │ ☐  │   │ 📊 │         │ ← Each 44x44px
│  └────┘   └────┘   └────┘         │   tap area
│   Rec      Fit      Weld           │
│   50%      0%       75%            │
└─────────────────────────────────────┘

Spacing:
- Checkbox width: 44px (mobile) / 32px (desktop)
- Checkbox height: 44px (mobile) / 32px (desktop)
- Horizontal spacing: 12px (mobile) / 8px (desktop)
- Label font: 16px (mobile) / 14px (desktop)
- Percentage font: 14px (mobile) / 12px (desktop)
```

---

## 3. Update Flow: Discrete Milestone

### Step 1: View Component
```
┌─────────────────────────────────────┐
│ Valve • VBALU-001                   │
│ 2" Ball Valve (1)                   │
│                                     │
│  ☑️       ☐       📊               │
│  Rec     Fit     Weld              │
│  50%     0%      75%               │
│           👆 User wants to mark     │
│              "Fit Inspected" done  │
└─────────────────────────────────────┘
```

### Step 2: Tap "Fit" Checkbox (1 TAP - DONE!)
```
┌─────────────────────────────────────┐
│ Valve • VBALU-001                   │
│ 2" Ball Valve (1)                   │
│                                     │
│  ☑️       ☑️       📊              │ ← Instantly checked!
│  Rec     Fit     Weld              │   Optimistic update
│  50%    100%     75%               │
│          👆                          │
└─────────────────────────────────────┘

Toast notification: ✓ Fit Inspected complete
```

**Total: 1 TAP**

---

## 4. Update Flow: Partial Milestone

### Step 1: Tap Partial Milestone Checkbox
```
┌─────────────────────────────────────┐
│ Valve • VBALU-001                   │
│ 2" Ball Valve (1)                   │
│                                     │
│  ☑️       ☐       📊               │
│  Rec     Fit     Weld              │
│  50%     0%      75%               │
│                   👆 Tap to edit     │
│                                     │
│         ┌─────────────────┐         │ ← Popover opens
│         │  Weld: 75%      │         │   above/below
│         │  ─────●─────    │         │   checkbox
│         │  0%        100% │         │
│         │                 │         │
│         │  [25%] [50%]    │         │   Quick presets
│         │  [75%] [100%]   │         │
│         │                 │         │
│         │  [ Update ]     │         │   Confirm button
│         └─────────────────┘         │
└─────────────────────────────────────┘
```

### Step 2: Adjust Slider & Tap Update
```
User drags slider to 100%
OR taps [100%] preset button
Then taps "Update" button
Popover closes
```

### Step 3: Updated Component
```
┌─────────────────────────────────────┐
│ Valve • VBALU-001                   │
│ 2" Ball Valve (1)                   │
│                                     │
│  ☑️       ☐       ☑️               │ ← Now shows checkmark!
│  Rec     Fit     Weld              │   (100% = checkmark)
│  50%     0%      100%              │
│                   👆                 │
└─────────────────────────────────────┘

Toast notification: ✓ Weld updated to 100%
```

**Total: 2-3 TAPS** (tap checkbox → drag OR tap preset → tap Update)

---

## 5. Mobile-Optimized Popover

```
┌───────────────────────┐
│  Weld Progress        │ ← Title
├───────────────────────┤
│                       │
│        75%            │ ← Current value (24px font)
│                       │
│  ┌─────────────────┐  │
│  │●────────────────│  │ ← Slider (56px height on mobile)
│  └─────────────────┘  │   Larger thumb (20px diameter)
│  0%             100%  │
│                       │
│  ┌────┐ ┌────┐       │
│  │25% │ │50% │       │ ← Quick preset buttons
│  └────┘ └────┘       │   (44x44px each)
│  ┌────┐ ┌────┐       │
│  │75% │ │100%│       │
│  └────┘ └────┘       │
│                       │
│  ┌─────────────────┐  │
│  │    Update       │  │ ← Update button (48px height)
│  └─────────────────┘  │
│                       │
└───────────────────────┘

Popover Specifications:
- Width: 280px (optimized for thumb reach)
- Positioning: Smart (above if space, below otherwise)
- Backdrop: Semi-transparent overlay (tap to dismiss)
- Slider thumb: 20px diameter (easy to grab)
- Slider track: 56px height (mobile) / 32px (desktop)
- Buttons: 44x44px (mobile) / 40x40px (desktop)
```

---

## 6. Drawing Row (Collapsed)

```
┌─────────────────────────────────────┐
│                                     │
│ P-001                           [>] │ ← Drawing number + expand
│ A:100  S:HVAC-01  TP:PKG-A         │ ← Metadata (abbreviated)
│ ████████████░░░░░░░░ 47%            │ ← Progress bar
│                                     │   (ONLY on drawing level)
└─────────────────────────────────────┘
Height: 68px

Tap anywhere on row to expand (not just [>] icon)
```

---

## 7. Drawing Row (Expanded Header)

```
┌─────────────────────────────────────┐
│                                     │
│ P-002                           [v] │ ← Drawing number + collapse
│ A:200  S:PIPING-05  TP:PKG-B       │ ← Metadata
│ ███████████░░░░░░░░░ 65%            │ ← Progress bar
├─────────────────────────────────────┤
│                                     │
│ [Component rows below...]           │
│                                     │
└─────────────────────────────────────┘
Height: 68px (same as collapsed)

Tap [v] or anywhere on header to collapse
```

---

## 8. Hamburger Navigation

```
┌─────────────────────────────────────┐
│ ┌─────────────────┐                 │
│ │                 │                 │
│ │  PipeTrak       │                 │ ← Sidebar slides
│ │                 │                 │   from left
│ │  [📊 Drawings]  │                 │   (280px wide)
│ │   Components    │                 │
│ │   Packages      │   [Tap to      │ ← Semi-transparent
│ │   Welders       │    close]      │   backdrop overlay
│ │   Imports       │                 │
│ │                 │                 │   Tap outside or
│ │  [👤 Profile]   │                 │   swipe left to close
│ │   Logout        │                 │
│ │                 │                 │
│ └─────────────────┘                 │
└─────────────────────────────────────┘
      Sidebar (open)     Dimmed overlay

Trigger: Tap ☰ icon in header (44x44px touch target)
Close: Tap overlay, swipe left, or tap ☰ again
```

---

## 9. Offline Queue Badge

```
┌─────────────────────────────────────┐
│  ☰  PipeTrak    [📤 3]  [🔔]  [👤] │ ← Pending updates (orange)
└─────────────────────────────────────┘
         Shows count of queued updates


┌─────────────────────────────────────┐
│  ☰  PipeTrak    [✓]  [🔔]  [👤]    │ ← Sync success (green)
└─────────────────────────────────────┘
         Green checkmark (2s duration)


┌─────────────────────────────────────┐
│  ☰  PipeTrak    [⚠️ 3]  [🔔]  [👤] │ ← Sync failed (red)
└─────────────────────────────────────┘
         Red warning badge (tap to retry)

Badge Behavior:
- Shows while offline: Orange with count
- Syncing: Spinner animation
- Success: Green checkmark (auto-hide after 2s)
- Failure: Red warning (persistent, tap to retry)
```

---

## 10. Responsive Breakpoint Behavior

### ≤640px (Mobile Phone - Portrait)
```
Changes from desktop:
✓ Checkbox size: 32x32px → 44x44px
✓ Checkbox spacing: 8px → 12px
✓ Label font size: 14px → 16px
✓ Percentage font: 12px → 14px
✓ Popover slider height: 32px → 56px
✓ Popover buttons: 40x40px → 44x44px
✓ Navigation: Persistent sidebar → Hamburger menu
✓ Filters: Horizontal row → Stacked vertically
```

### 641-768px (Tablet - Portrait/Landscape)
```
Changes from desktop:
✓ Checkbox size: 32x32px → 42x42px (slightly larger)
✓ Popover slider height: 32px → 44px
✓ Navigation: Hamburger menu (collapsible)
✓ Everything else: Desktop sizing
```

### >768px (Desktop)
```
Original desktop sizing:
✓ Checkbox: 32x32px
✓ Popover slider: 32px height
✓ Navigation: Persistent left sidebar
✓ Filters: Horizontal row
✓ Compact spacing
```

---

## 11. Milestone Abbreviations

```
Common Milestones (3-4 characters max):

Receive         → Rec
Fit Inspected   → Fit
Weld Made       → Weld
Ground          → Grnd
Visual Inspect  → Vis
NDE Complete    → NDE
Install         → Inst
Paint           → Pnt
Calibrate       → Cal
Hook-up         → Hook
Test            → Test
Pressure Test   → PT
Final Inspect   → Final
```

---

## 12. Handling 5+ Milestones

### Option A: Wrap to Multiple Rows (Recommended)
```
┌─────────────────────────────────────┐
│ Pipe • PIPE-CS-2-001                │
│ 2" Carbon Steel (1)                 │
│                                     │
│  ☑️       ☑️       ☑️       ☐      │ ← Row 1 (4 milestones)
│  Rec     Fit     Weld    NDE       │
│  100%    100%    100%     0%       │
│                                     │
│  ☐       📊                         │ ← Row 2 (2 milestones)
│  PT      Pnt                        │
│  0%      25%                        │
└─────────────────────────────────────┘
Total height: ~105px (adds 20px per extra row)
```

### Option B: Horizontal Scroll
```
┌─────────────────────────────────────┐
│ Pipe • PIPE-CS-2-001                │
│ 2" Carbon Steel (1)                 │
│                                     │
│ ← ☑️  ☑️  ☑️  ☐  ☐  📊 →          │ ← Swipe left/right
│   Rec Fit Weld NDE PT Pnt          │   to see all
│   100% 100% 100% 0% 0% 25%         │
└─────────────────────────────────────┘
Shows scroll indicators (← →) when overflowing
```

### Option C: Show First 3 + Expand Button
```
┌─────────────────────────────────────┐
│ Pipe • PIPE-CS-2-001                │
│ 2" Carbon Steel (1)                 │
│                                     │
│  ☑️       ☑️       ☑️      [+3]    │ ← Tap "+3" to expand
│  Rec     Fit     Weld              │
│  100%    100%    100%              │
└─────────────────────────────────────┘

After tapping [+3]:
┌─────────────────────────────────────┐
│ Pipe • PIPE-CS-2-001                │
│ 2" Carbon Steel (1)                 │
│                                     │
│  ☑️  ☑️  ☑️  ☐  ☐  📊  [-]        │ ← All 6 shown
│  Rec Fit Weld NDE PT Pnt           │   Tap "[-]" to collapse
│  100% 100% 100% 0% 0% 25%          │
└─────────────────────────────────────┘
```

**Recommendation**: Option A (wrap to multiple rows) for simplicity and no hidden content.

---

## 13. CSS/Tailwind Implementation Hints

```tsx
// Checkbox Component
<button
  className="
    w-8 h-8           /* Desktop: 32x32px */
    sm:w-11 sm:h-11   /* Mobile ≤640px: 44x44px */
    touch-manipulation /* Prevents zoom on double-tap */
    tap-highlight-transparent /* Removes tap flash on iOS */
  "
>

// Milestone Label
<span className="
  text-sm           /* Desktop: 14px */
  sm:text-base      /* Mobile: 16px */
">

// Popover Slider
<Slider
  className="
    h-8              /* Desktop: 32px */
    sm:h-14          /* Mobile: 56px */
  "
  thumbSize="
    12               /* Desktop: 12px diameter */
    sm:20            /* Mobile: 20px diameter */
  "
/>

// Component Row
<div className="
  py-2             /* Desktop: 8px vertical padding */
  sm:py-3          /* Mobile: 12px vertical padding */
  space-x-2        /* Desktop: 8px horizontal gap */
  sm:space-x-3     /* Mobile: 12px horizontal gap */
">
```

---

## 14. Complete Mobile View Example

```
┌─────────────────────────────────────┐
│  ☰  PipeTrak        [📤 3]  [👤]   │ ← Header with queue badge
├─────────────────────────────────────┤
│ 🔍 Search...              [Filter] │ ← Search + filter
├─────────────────────────────────────┤
│                                     │
│ P-002                           [v] │ ← Drawing (expanded)
│ A:200  S:PIPING-05  TP:PKG-B       │
│ ███████████░░░░░░░░░ 65%            │
├─────────────────────────────────────┤
│                                     │
│ Valve • VBALU-001                   │ ← Component 1
│ 2" Ball Valve (1)                   │
│                                     │
│  ☑️       ☐       📊               │
│  Rec     Fit     Weld              │
│  50%     0%      75%               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Flange • FBLAG2DFA                  │ ← Component 2
│ 1" Blind Flange (1)                 │
│                                     │
│  ☑️       ☑️       ☑️               │
│  Rec     Inst    NDE               │
│ 100%    100%    100%               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Instrument • ME-55402               │ ← Component 3
│ 1/2" Pressure Gauge (1)             │
│                                     │
│  ☐       ☐       ☐                 │
│  Rec     Cal     Hook              │
│  0%      0%      0%                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ P-001                           [>] │ ← Drawing (collapsed)
│ A:100  S:HVAC-01  TP:PKG-A         │
│ ████████░░░░ 47%                    │
│                                     │
└─────────────────────────────────────┘
```

---

## Summary

**User Journey for Mobile Updates:**

1. Open app → Drawings page loads (with metadata visible)
2. Scroll to find drawing → See Area/System/TP on drawing row
3. Tap drawing to expand → Components appear with milestones
4. Update discrete milestone → **1 TAP** (instant update)
5. Update partial milestone → **2-3 TAPS** (open popover → adjust → confirm)

**Key Advantages:**

✅ Same UI as desktop (just responsive sizing)
✅ No special mobile-only components to build
✅ All info visible: Type, Code, Size, Desc, Seq, Area, System, TP
✅ No progress bars on components (cleaner)
✅ Touch-friendly 44x44px targets
✅ Minimal clicks: 1-3 taps per milestone
✅ Reuses existing components: MilestoneCheckbox, PartialMilestoneEditor, DrawingRow, ComponentRow
