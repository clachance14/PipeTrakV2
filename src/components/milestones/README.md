# MilestoneChips Component

Shared component for rendering milestone progress chips with consistent styling and behavior across the application.

## Usage

```typescript
import { MilestoneChips } from '@/components/milestones';

function ComponentsTable() {
  const milestonesConfig = [
    { name: 'Installed', weight: 20, order: 1, is_partial: false, requires_welder: false },
    { name: 'Fit Up', weight: 30, order: 2, is_partial: true, requires_welder: true },
    { name: 'Welded', weight: 50, order: 3, is_partial: true, requires_welder: true },
  ];

  const currentMilestones = {
    'Installed': 100,
    'Fit Up': 50,
    'Welded': 0,
  };

  return (
    <MilestoneChips
      milestonesConfig={milestonesConfig}
      currentMilestones={currentMilestones}
    />
  );
}
```

## Props

- `milestonesConfig`: Array of milestone definitions from the project's milestone template
- `currentMilestones`: Object mapping milestone names to their current values (boolean or number)
- `compact` (optional): Use 3-letter abbreviations (RCV, INS, FIT, WLD, etc.) and smaller styling for narrow columns
- `maxVisible` (optional): Limit number of visible chips and show "+N more" for overflow

## Color Logic

### Discrete Milestones (`is_partial: false`)
- **Complete** (value === 100 or value === true): Green background (`bg-green-500 text-white`)
- **Not Started** (any other value): Gray background (`bg-gray-200 text-gray-600`)

### Partial Milestones (`is_partial: true`)
- **Complete** (value === 100): Green background (`bg-green-500 text-white`)
- **Partial Progress** (0 < value < 100): Amber background (`bg-amber-400 text-amber-900`)
- **Not Started** (value === 0 or undefined): Gray background (`bg-gray-200 text-gray-600`)

## Display Rules

1. Chips are rendered in order from `milestonesConfig.order` (template order)
2. Partial milestones with progress 1-99 show percentage: `{name} ({percent}%)`
3. Partial milestones at 100% show percentage: `{name} (100%)`
4. Partial milestones at 0% show name only: `{name}`
5. Discrete milestones never show percentage
6. Tooltips always show full name and percentage (for partial milestones)
7. If `maxVisible` is set and chips exceed it, remaining count shown as "+N more"

## Examples

### Basic Usage
```typescript
<MilestoneChips
  milestonesConfig={milestones}
  currentMilestones={component.current_milestones}
/>
```

### Compact Mode (for narrow columns)
```typescript
<MilestoneChips
  milestonesConfig={milestones}
  currentMilestones={component.current_milestones}
  compact={true}
/>
```

### Limited Display (show first 2, then "+N more")
```typescript
<MilestoneChips
  milestonesConfig={milestones}
  currentMilestones={component.current_milestones}
  maxVisible={2}
/>
```

## Accessibility

- All chips have `title` attributes for tooltips
- Semantic color coding (green=complete, amber=partial, gray=not started)
- Clear text labels with percentages for progress tracking

## Testing

Comprehensive test coverage includes:
- Rendering with various milestone states
- Color application for all states
- Percentage display logic
- Truncation with maxVisible
- Compact mode abbreviation
- Tooltip content
- Empty/missing data handling
