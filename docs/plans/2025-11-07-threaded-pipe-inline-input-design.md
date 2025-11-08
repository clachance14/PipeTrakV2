# Threaded Pipe Milestone Inline Input Design

**Date**: 2025-11-07
**Status**: Approved
**Author**: Design session with user

## Problem Statement

Field workers updating threaded pipe milestones face friction with the current popover/modal slider workflow. The current system requires:
- **Desktop**: Click percentage → Open popover → Drag slider → Click Update → Close popover (4 steps)
- **Mobile**: Tap button → Open full-screen modal → Drag slider → Tap Save → Close modal (5 steps)

For field workers updating progress multiple times per day on mobile devices, this workflow is cumbersome and slower than necessary. Users want direct numeric input instead of slider controls.

## User Context

- **Primary users**: Field workers on mobile devices
- **Environment**: Real-time progress tracking in harsh conditions (gloves, outdoor lighting)
- **Frequency**: Multiple updates per day per component
- **Device**: Predominantly mobile (≤1024px viewports)

## Design Solution

Replace slider-based popover/modal controls with **inline numeric input fields** that allow direct percentage entry. Similar to editing a spreadsheet cell - tap, type, save.

### Visual Design

#### Desktop View (>1024px)

**Current threaded pipe row:**
```
Threaded Pipe: PIPE-SCH40-1" │ 50% │ 75% │ 0% │ 100% │ 25% │ ☐ Punch │ ☐ Test │ ☐ Restore │ ...
                              (blue underlined, opens popover)
```

**Proposed threaded pipe row:**
```
Threaded Pipe: PIPE-SCH40-1" │ ┌───┐ │ ┌───┐ │ ┌───┐ │ ┌───┐ │ ┌───┐ │ ☐ Punch │ ☐ Test │ ...
                              │ │50%│ │ │75%│ │ │ 0%│ │100%│ │ │25%│ │
                              │ └───┘ │ └───┘ │ └───┘ │ └───┘ │ └───┘ │
                              (input fields, click to edit)
```

**Input field specifications:**
- Width: 56px (fits in existing min-w-[80px] container)
- Height: 32px (matches checkbox height)
- Border: 1px solid slate-300 (default) / blue-500 (focus) / red-500 (error)
- Background: white
- Text: 14px, slate-700, right-aligned, medium weight
- % suffix: Appended visually, user types just the number

#### Mobile View (≤1024px)

**Current mobile layout:**
```
Threaded Pipe: PIPE-SCH40-1"
─────────────────────────────
┌──────────┐ ┌──────────┐ ┌──────────┐
│Fabricate:│ │ Install: │ │  Erect:  │
│   50%    │ │   75%    │ │    0%    │
└──────────┘ └──────────┘ └──────────┘
  (buttons open full-screen modal)
```

**Proposed mobile layout:**
```
Threaded Pipe: PIPE-SCH40-1"
─────────────────────────────
Fabricate  Install   Erect   Connect  Support
┌──────┐  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  50% │  │  75% │ │   0% │ │ 100% │ │  25% │
└──────┘  └──────┘ └──────┘ └──────┘ └──────┘
  (inline inputs, tap to edit)
```

**Mobile input specifications:**
- Width: 64px (fits 5 across with 4px gaps)
- Height: 48px (≥44px WCAG AA touch target)
- Border: 1px solid slate-200
- Background: white
- Text: 16px (prevents iOS auto-zoom), slate-700, center-aligned
- Label: 10px text-xs above input, slate-600

### Input States

| State | Visual | Behavior |
|-------|--------|----------|
| **Default** | White bg, slate-300 border, value shown | Displays current percentage |
| **Focus** | White bg, blue-500 border + ring, cursor | Selects all text, numeric keyboard opens (mobile) |
| **Typing** | Blue border, value updates live | Real-time display of typed value |
| **Valid Save** | Returns to default state | Toast confirmation, progress recalculates |
| **Invalid** | Red-500 border, shake animation | Toast error, reverts after 2s |
| **Disabled** | Slate-100 bg, opacity-50, cursor-not-allowed | No interaction when permission denied |

## Architecture Changes

### Component Hierarchy

**Current:**
```
ComponentRow
├─ PartialMilestoneEditor (popover + slider)
│  └─ Popover > Button > Slider > Update/Cancel
├─ MobilePartialMilestoneEditor (modal + slider)
│  └─ Dialog > Slider > Save/Cancel
└─ MilestoneCheckbox (unchanged)
```

**Proposed:**
```
ComponentRow
├─ PartialMilestoneInput (new inline input)
│  └─ <input type="number"> with validation
└─ MilestoneCheckbox (unchanged)
```

### Files to Modify

1. **Create**: `src/components/drawing-table/PartialMilestoneInput.tsx`
   - New component replacing PartialMilestoneEditor
   - Inline numeric input with validation
   - Handles focus, blur, Enter key, validation

2. **Modify**: `src/components/drawing-table/ComponentRow.tsx`
   - Replace `PartialMilestoneEditor` with `PartialMilestoneInput`
   - Remove `MobilePartialMilestoneEditor` modal logic
   - Remove modal state management (mobileModalOpen, editingMilestone)
   - Simplify getMilestoneControl() function (no mobile branching needed)

3. **Delete**:
   - `src/components/drawing-table/PartialMilestoneEditor.tsx` (no longer needed)
   - `src/components/drawing-table/MobilePartialMilestoneEditor.tsx` (no longer needed)

4. **Update Tests**:
   - `tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx`
   - Replace popover interaction tests with input field tests
   - Remove modal-specific tests
   - Add validation tests (0-100 range, invalid input handling)

### Data Flow

```
User interaction
    ↓
PartialMilestoneInput component
    ↓
onFocus: Select all text
    ↓
onChange: Real-time validation (0-100)
    ↓
onBlur or Enter: Call onMilestoneUpdate(componentId, milestoneName, value)
    ↓
useUpdateMilestone hook (existing)
    ↓
Optimistic UI update via TanStack Query
    ↓
RPC: update_component_milestone(p_component_id, p_milestone_name, p_new_value, p_user_id)
    ↓
Database trigger: calculate_component_percent() recalculates progress
    ↓
Cache invalidation + UI refresh
    ↓
Toast confirmation
```

No changes needed to:
- `useUpdateMilestone` hook (already handles numeric values)
- Database functions (already expect 0-100 numeric values)
- RLS policies (unchanged)
- Offline queue logic (already supports numeric values)

## Interaction Patterns

### Desktop Workflow

1. User clicks input field
2. Focus: Border changes to blue, all text selected
3. User types new value (e.g., "75")
4. User presses Enter or clicks outside
5. Validation: If 0-100, save; else show error
6. Toast: "Fabricate updated to 75%"
7. Progress bar updates automatically

**Time saved**: ~2 seconds per update (no popover open/close, no drag interaction)

### Mobile Workflow

1. User taps input field (48px touch target)
2. Focus: Blue border, text selected, numeric keyboard opens
3. User types new value on numeric keypad
4. User taps outside or presses Enter
5. Validation + save (same as desktop)
6. Keyboard auto-closes on blur

**Time saved**: ~3 seconds per update (no modal, no Save button)

### Validation Rules

| Input | Valid | Action |
|-------|-------|--------|
| 0-100 | ✅ Yes | Save to database, show success toast |
| <0 or >100 | ❌ No | Red border + shake, error toast, revert after 2s |
| Empty string | ❌ No | Revert to last saved value on blur |
| Decimal (e.g., 75.5) | ❌ No | Round to nearest integer, save |
| Non-numeric | ❌ No | Ignore character, prevent input |
| Leading zeros (e.g., 075) | ✅ Yes | Normalize to 75, save |

### Keyboard Shortcuts (Desktop)

| Key | Action |
|-----|--------|
| Tab | Move to next milestone input |
| Shift+Tab | Move to previous milestone input |
| Enter | Save current value, move to next input |
| Escape | Revert to previous value, blur input |
| Arrow Up | (Optional) Increment by 5 |
| Arrow Down | (Optional) Decrement by 5 |

## Accessibility (WCAG 2.1 AA)

### Semantic HTML
- `<input type="number" inputMode="numeric" pattern="[0-9]*">`
- `role="spinbutton"` (implicit for type="number")
- `aria-label="Fabricate milestone, currently 50 percent"`
- `aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"`
- `aria-invalid="true"` when value out of range

### Touch Targets (Mobile)
- Input fields: 64px × 48px (exceeds 44px minimum)
- 4px padding around inputs for easier tapping
- No overlapping touch areas

### Keyboard Navigation
- Full Tab navigation support
- Enter key saves and advances
- Escape key cancels edit
- No keyboard traps

### Screen Readers
- Input announces: "Fabricate milestone, currently 50 percent, edit text"
- On save: Live region announces "Fabricate updated to 75 percent"
- On error: "Invalid value. Must be between 0 and 100"

### Visual
- Color not sole indicator (border + text both change on error)
- Sufficient contrast: 4.5:1 minimum (slate-700 on white)
- Focus indicator: 2px blue ring (visible in all modes)

## Error Handling

### Network Errors
- **Scenario**: RPC call fails (timeout, 500 error)
- **Handling**:
  - Toast: "Update failed. Try again."
  - Optimistic update reverted (TanStack Query rollback)
  - Input remains editable (user can retry)
  - If offline: Queue to localStorage (existing offline support)

### Permission Changes
- **Scenario**: User loses `canUpdateMilestones` permission mid-session
- **Handling**:
  - Input disabled immediately (disabled state styling)
  - Current edit cancelled (revert to previous value)
  - Toast: "You no longer have permission to update milestones"

### Concurrent Updates
- **Scenario**: Two users update same milestone simultaneously
- **Resolution**: Last write wins (standard optimistic concurrency)
- **User experience**: Each user sees their own update confirmed, next refresh shows final value

### Invalid State
- **Missing template**: Show empty state (no inputs)
- **Corrupted current_milestones**: Reset to 0% for all partial milestones
- **Database constraint violation**: Show error toast + revert

## Performance Considerations

### Update Speed
- Current: ~4 steps, ~3-4 seconds per update
- Proposed: ~2 steps, ~1-2 seconds per update
- **Improvement**: ~50% faster per update

### Network Traffic
- No change (same RPC call, same payload size)
- Optimistic updates maintain <100ms perceived latency

### Rendering
- Lighter DOM (no popover/modal portals)
- Fewer event listeners (no slider drag events)
- **Expected**: Slight performance improvement on mobile

## Testing Strategy

### Unit Tests
1. PartialMilestoneInput component:
   - Renders with current value
   - Validates 0-100 range
   - Handles Enter key save
   - Handles Escape key cancel
   - Shows error state for invalid input
   - Disabled state prevents interaction

### Integration Tests (scenario-4-update-partial.test.tsx)
1. Display threaded pipe with partial milestones as input fields
2. Click input, type new value, press Enter → saves correctly
3. Click input, type invalid value (>100) → shows error, reverts
4. Click input, type value, click outside → saves on blur
5. Tab navigation between inputs works
6. Escape key reverts value
7. Empty input on blur → reverts to previous value
8. Disabled state when canUpdateMilestones=false
9. Multiple partial milestones update independently
10. Progress percentage recalculates after update

### E2E Tests (Mobile)
1. Tap input → numeric keyboard opens
2. Type value → saves on keyboard "Done"
3. Touch targets ≥44px verified
4. Works in portrait and landscape orientations

### Accessibility Tests
1. Keyboard-only navigation works (no mouse)
2. Screen reader announces input state and updates
3. Focus indicators visible in all states
4. Color contrast meets 4.5:1 minimum

## Migration Notes

### Breaking Changes
- None (internal component refactor only)
- Database schema unchanged
- API unchanged
- User data unchanged

### Deployment
1. Deploy frontend changes (component replacements)
2. No database migrations needed
3. No feature flag needed (direct replacement)
4. Monitor error logs for validation issues

### Rollback Plan
- Revert to previous commit (restores popover/modal components)
- No data cleanup needed
- No database changes to revert

## Success Metrics

### Quantitative
- **Update speed**: Reduce average update time from 3-4s to 1-2s (50% improvement)
- **Interaction steps**: Reduce from 4-5 steps to 2 steps (60% reduction)
- **Error rate**: Monitor validation errors (target <5% of updates)
- **Mobile usage**: Track mobile vs. desktop updates (expect mobile % to increase)

### Qualitative
- Field worker feedback: "Faster and easier to update"
- Support tickets: Fewer complaints about milestone updates
- User testing: 90%+ users prefer inline inputs over sliders

## Future Enhancements (Out of Scope)

1. **Preset buttons**: Add quick-select buttons (0%, 25%, 50%, 75%, 100%) below input
2. **Bulk update**: Update all 5 partial milestones at once (e.g., "Set all to 50%")
3. **Arrow key increment**: Up/Down arrows adjust by 5% increments
4. **Voice input**: Use browser speech recognition on mobile
5. **Calculation helper**: "Installed 20 of 40 joints" → auto-calculates 50%

## References

- Current implementation: `src/components/drawing-table/PartialMilestoneEditor.tsx`
- Test file: `tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx`
- Database schema: `supabase/migrations/00009_foundation_tables.sql` (threaded_pipe template)
- Progress calculation: `supabase/migrations/00020_fix_percent_complete_trigger.sql`
