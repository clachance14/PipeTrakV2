# Unified Component Details Form Design

**Date**: 2025-10-31
**Status**: Design Approved
**Feature**: Unified Component Details & Metadata Editing

> **📝 NOTE**: This design was implemented with slider-based milestone editors. The milestone editing UI was later refactored in **Feature 025** (2025-11-07) to use inline percentage input boxes for improved mobile UX and faster workflow.

## Overview

Combine the read-only ComponentDetailView (components page) with the edit-only ComponentAssignDialog (drawings page) into a single, unified component details form that supports:

- Viewing component identity, type, and progress
- Editing metadata (Area, System, Test Package)
- Interactive milestone editing
- Viewing milestone history with welder/NDE context

## Requirements

### Functional Requirements
1. **FR-1**: Form accessible from both drawings page and components page
2. **FR-2**: Milestone editing respects `can_update_milestones` permission
3. **FR-3**: Metadata editing respects `can_edit_metadata` permission
4. **FR-4**: History displays milestone updates with welder info, NDE results, and repair relationships
5. **FR-5**: Mobile-responsive with dropdown tab selector at <768px breakpoint

### Non-Functional Requirements
1. **NFR-1**: Consistent UX across both access points (drawings/components page)
2. **NFR-2**: WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels, screen readers)
3. **NFR-3**: Optimistic UI updates for milestone changes
4. **NFR-4**: Touch-friendly targets (≥44px) on mobile devices

## Architecture

### Approach: Enhanced ComponentDetailView

**Decision**: Enhance existing `ComponentDetailView.tsx` rather than creating new component or composition pattern.

**Rationale**:
- Simplest migration path (single component to maintain)
- Components page already uses ComponentDetailView
- Drawings page can replace ComponentAssignDialog with enhanced ComponentDetailView
- Avoids duplication and abstraction overhead

**Trade-offs**:
- ✅ Simple: One component to maintain
- ✅ Direct: No wrapper/container layers
- ⚠️ Mixed concerns: View + edit logic in same component (acceptable trade-off)

## Component Structure

### Enhanced ComponentDetailView Props

```typescript
interface ComponentDetailViewProps {
  componentId: string
  canUpdateMilestones: boolean  // Existing prop
  canEditMetadata?: boolean      // NEW: Enable metadata editing
  onMetadataChange?: () => void  // NEW: Callback after metadata saved
}
```

### Tab Structure

**4 tabs**: Overview, Details, Milestones, History

#### Tab 1: Overview
- Component identity (formatted via formatIdentityKey/spool_id/weld_number)
- Component type badge
- Progress ring showing percent_complete
- Last updated timestamp and user
- Drawing number (if assigned)
- Quick stats: Total milestones, Completed milestones

#### Tab 2: Details (Metadata)
- Three dropdowns: Area, System, Test Package
- "Inherited" vs "Assigned" badges (Feature 011 pattern)
- Save/Cancel buttons
- Uses `useAssignComponents` hook
- Disabled if `canEditMetadata=false`

#### Tab 3: Milestones (Interactive)
- Component-type-specific milestone list from progress_templates
- Discrete milestones: Checkboxes (toggle on click)
- Partial milestones: Sliders (0-100%) + percentage display
- Each milestone shows weight percentage
- Real-time progress calculation preview
- Uses `useUpdateMilestone` hook
- Disabled if `canUpdateMilestones=false`

#### Tab 4: History
- Timeline of milestone_events (most recent first)
- Each event: Milestone name, Old → New value, User, Timestamp
- For field welds: Welder assignments, NDE results
- For repairs: repair_of relationship
- Paginated (20 events/page) or infinite scroll
- Empty state: "No updates recorded yet"

### Mobile Adaptation (<768px)

Replace horizontal tabs with dropdown selector:
```tsx
<Select value={activeTab} onValueChange={setActiveTab}>
  <SelectTrigger className="w-full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="overview">Overview</SelectItem>
    <SelectItem value="details">Details</SelectItem>
    <SelectItem value="milestones">Milestones</SelectItem>
    <SelectItem value="history">History</SelectItem>
  </SelectContent>
</Select>
```

## Data Flow

### Data Fetching

**Hooks used**:
1. `useComponent(componentId)` - Fetch component with relations (drawing, area, system, test_package, template)
2. `useMilestoneHistory(componentId)` - NEW hook to query milestone_events table
3. Field weld context: Query `field_welds` table for welder/NDE/repair data (for field_weld type only)

### State Management

**Local state**:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'milestones' | 'history'>('overview')
const [metadataForm, setMetadataForm] = useState({ area_id, system_id, test_package_id })
const [isDirty, setIsDirty] = useState(false) // Track unsaved metadata changes
```

**Permission derivation**:
```typescript
const canEditMetadata = hasPermission('can_edit_metadata')
const canUpdateMilestones = hasPermission('can_update_milestones')
```

### Mutation Flows

**1. Metadata Save**:
```
User clicks Save → useAssignComponents.mutate()
  → Success: refetch component, show toast, setIsDirty(false)
  → Error: show error toast, keep form dirty
```

**2. Milestone Update**:
```
User toggles/slides milestone → useUpdateMilestone.mutate()
  → Optimistic UI update (immediate visual feedback)
  → Background refetch
  → History tab auto-updates
  → Success toast
```

**3. History Pagination**:
```
useInfiniteQuery for milestone_events
  → Load 20 events initially
  → "Load more" button fetches next 20
```

### Error Handling

- **Mutation failures**: Show error toast, rollback optimistic updates
- **Network errors**: Show retry button
- **Loading states**: Skeleton loaders in each tab
- **Validation errors**: Inline error messages on form fields

## UI Components

### Shadcn Components Required

New components to add:
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Slider`
- `Checkbox`
- `Badge`
- `Progress`
- `ScrollArea`

Install via:
```bash
npx shadcn@latest add tabs select slider checkbox badge progress scroll-area
```

### Component Layout

```tsx
<Dialog>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Component Details</DialogTitle>
    </DialogHeader>

    {/* Desktop: Horizontal tabs */}
    <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="milestones">Milestones</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">{/* Overview UI */}</TabsContent>
      <TabsContent value="details">{/* Metadata form */}</TabsContent>
      <TabsContent value="milestones">{/* Interactive milestones */}</TabsContent>
      <TabsContent value="history">{/* Timeline */}</TabsContent>
    </Tabs>

    {/* Mobile: Dropdown selector */}
    <div className="md:hidden">
      <Select value={activeTab} onValueChange={setActiveTab}>
        <SelectTrigger className="w-full min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="overview">Overview</SelectItem>
          <SelectItem value="details">Details</SelectItem>
          <SelectItem value="milestones">Milestones</SelectItem>
          <SelectItem value="history">History</SelectItem>
        </SelectContent>
      </Select>

      {/* Render active tab content conditionally */}
      {activeTab === 'overview' && <OverviewContent />}
      {activeTab === 'details' && <DetailsContent />}
      {activeTab === 'milestones' && <MilestonesContent />}
      {activeTab === 'history' && <HistoryContent />}
    </div>
  </DialogContent>
</Dialog>
```

### Mobile Optimizations (<768px)

- **Dialog**: `max-h-[90vh]` with internal scrolling
- **Tab selector**: Full width, 44px min height
- **Metadata selects**: Full width, stacked vertically
- **Milestone controls**: 48px min touch targets, larger sliders
- **History timeline**: Compact cards, 2-line layout per event

### Accessibility

- **Keyboard navigation**: Arrow keys move between tabs
- **ARIA labels**:
  - `aria-label="Component details tabs"` on TabsList
  - `aria-label="Select component view"` on mobile dropdown
- **Focus management**: Dialog open → focus close button
- **Screen reader announcements**: "Milestone updated successfully" on save
- **Tab order**: Logical flow through form controls

## File Changes

### Enhanced
- `src/components/ComponentDetailView.tsx` (+300 lines)
  - Add tabs UI
  - Add metadata editing (from ComponentAssignDialog)
  - Make milestones interactive
  - Add history timeline

### New
- `src/components/ui/tabs.tsx` (Shadcn)
- `src/components/ui/select.tsx` (Shadcn)
- `src/components/ui/slider.tsx` (Shadcn)
- `src/components/ui/checkbox.tsx` (Shadcn)
- `src/components/ui/badge.tsx` (Shadcn)
- `src/components/ui/progress.tsx` (Shadcn)
- `src/components/ui/scroll-area.tsx` (Shadcn)
- `src/hooks/useMilestoneHistory.ts` (new hook)

### Modified
- `src/pages/ComponentsPage.tsx` - Pass `canEditMetadata` prop
- `src/components/component-metadata/ComponentMetadataModal.tsx` - Replace ComponentAssignDialog with ComponentDetailView

### Deprecated
- `src/components/ComponentAssignDialog.tsx` - Mark for future removal (keep for backward compatibility during migration)

## Migration Strategy

### Phase 1: Enhance ComponentDetailView
1. Install Shadcn UI components
2. Add tabs structure to ComponentDetailView
3. Move Overview content (existing code)
4. Add Details tab (metadata editing from ComponentAssignDialog)
5. Add Milestones tab (interactive, existing + new logic)
6. Add History tab (new useMilestoneHistory hook)

### Phase 2: Update Usage Points
1. ComponentsPage: Add `canEditMetadata` prop
2. ComponentMetadataModal: Replace ComponentAssignDialog with ComponentDetailView
3. Test both access points (drawings + components page)

### Phase 3: Deprecation
1. Mark ComponentAssignDialog as deprecated (add JSDoc comment)
2. Add console warning when ComponentAssignDialog renders
3. Schedule removal for next major version

## Testing Requirements

### Unit Tests
- ComponentDetailView renders all 4 tabs
- Tab switching works (desktop + mobile)
- Metadata form submits correctly
- Milestone toggles/sliders update optimistically
- Permission checks disable controls correctly

### Integration Tests
- E2E: Open component from drawings page, edit metadata, verify save
- E2E: Open component from components page, toggle milestone, verify in history
- E2E: Field weld shows welder info in history tab
- E2E: Mobile dropdown selector switches tabs

### Accessibility Tests
- Keyboard navigation through tabs
- Screen reader announces tab changes
- Focus management on dialog open/close
- ARIA labels present and correct

## Success Criteria

1. ✅ Single unified form accessible from both pages
2. ✅ Users can view AND edit component details in one place
3. ✅ Milestone history includes welder/NDE context for field welds
4. ✅ Mobile users can navigate tabs via dropdown
5. ✅ Permissions enforced (milestones + metadata editing)
6. ✅ All tests pass with ≥70% coverage
7. ✅ WCAG 2.1 AA accessibility compliance

## Open Questions

None - design validated and approved.

## Appendix: Related Features

- **Feature 011**: Drawing & Component Metadata Assignment (inheritance logic)
- **Feature 015**: Mobile Milestone Updates & Field Weld Management
- **Feature 010**: Drawing-Centered Component Progress Table (milestone editing patterns)
