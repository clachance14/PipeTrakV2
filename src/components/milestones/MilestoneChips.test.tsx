import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneChips } from './MilestoneChips';

describe('MilestoneChips', () => {
  const mockMilestonesConfig = [
    {
      name: 'Installed',
      weight: 20,
      order: 1,
      is_partial: false,
      requires_welder: false,
    },
    {
      name: 'Fit Up',
      weight: 30,
      order: 2,
      is_partial: true,
      requires_welder: true,
    },
    {
      name: 'Welded',
      weight: 50,
      order: 3,
      is_partial: true,
      requires_welder: true,
    },
  ];

  describe('Rendering', () => {
    it('renders correct number of chips', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      const { container } = render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
        />
      );

      const chips = container.querySelectorAll('.rounded-full.cursor-default');
      expect(chips.length).toBe(3);
    });

    it('renders chips in order from milestonesConfig', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
        />
      );

      const chips = screen.getAllByTitle(/Installed|Fit Up|Welded/);
      expect(chips[0]).toHaveTextContent('Installed');
      expect(chips[1]).toHaveTextContent('Fit Up');
      expect(chips[2]).toHaveTextContent('Welded');
    });

    it('handles empty milestonesConfig', () => {
      const { container } = render(
        <MilestoneChips
          milestonesConfig={[]}
          currentMilestones={{}}
        />
      );

      const chips = container.querySelectorAll('.rounded-full.cursor-default');
      expect(chips.length).toBe(0);
    });

    it('handles missing currentMilestones data', () => {
      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={{}}
        />
      );

      const chips = screen.getAllByTitle(/Installed|Fit Up|Welded/);
      expect(chips.length).toBe(3);
      // All should be slate (not started)
      chips.forEach(chip => {
        expect(chip).toHaveClass('bg-slate-100', 'text-slate-600');
      });
    });
  });

  describe('Color Styling', () => {
    it('applies green for complete discrete milestone (value === 100)', () => {
      const currentMilestones = {
        'Installed': 100,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[0]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Installed: Complete');
      expect(chip).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });

    it('applies green for complete discrete milestone (legacy value === true)', () => {
      const currentMilestones = {
        'Installed': true,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[0]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Installed: Complete');
      expect(chip).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });

    it('applies slate for not-started discrete milestone', () => {
      const currentMilestones = {
        'Installed': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[0]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Installed: Not started');
      expect(chip).toHaveClass('bg-slate-100', 'text-slate-600', 'border-slate-200');
    });

    it('applies green for complete partial milestone (value === 100)', () => {
      const currentMilestones = {
        'Fit Up': 100,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: Complete');
      expect(chip).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });

    it('applies amber for partial progress milestone (0 < value < 100)', () => {
      const currentMilestones = {
        'Fit Up': 50,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: 50%');
      expect(chip).toHaveClass('bg-amber-100', 'text-amber-800', 'border-amber-200');
    });

    it('applies slate for not-started partial milestone (value === 0)', () => {
      const currentMilestones = {
        'Fit Up': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: Not started');
      expect(chip).toHaveClass('bg-slate-100', 'text-slate-600', 'border-slate-200');
    });

    it('applies slate for partial milestone with undefined value', () => {
      const currentMilestones = {};

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: Not started');
      expect(chip).toHaveClass('bg-slate-100', 'text-slate-600', 'border-slate-200');
    });

    it('badges have cursor-default (not clickable)', () => {
      const currentMilestones = {
        'Installed': 100,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[0]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Installed: Complete');
      expect(chip).toHaveClass('cursor-default');
    });
  });

  describe('Percentage Display', () => {
    it('does not show inline percentage in main view', () => {
      const currentMilestones = {
        'Fit Up': 75,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: 75%');
      expect(chip).toHaveTextContent('Fit Up');
      expect(chip).not.toHaveTextContent('(75%)');
    });

    it('shows percentage in tooltip for partial milestone', () => {
      const currentMilestones = {
        'Fit Up': 75,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: 75%');
      expect(chip).toBeInTheDocument();
    });

    it('shows "Complete" in tooltip for 100% milestone', () => {
      const currentMilestones = {
        'Fit Up': 100,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: Complete');
      expect(chip).toHaveTextContent('Fit Up');
      expect(chip).not.toHaveTextContent('%');
    });

    it('shows "Not started" in tooltip for 0% milestone', () => {
      const currentMilestones = {
        'Fit Up': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: Not started');
      expect(chip).toHaveTextContent('Fit Up');
      expect(chip).not.toHaveTextContent('(0%)');
    });
  });

  describe('Tooltip', () => {
    it('shows full name and percentage for partial milestone', () => {
      const currentMilestones = {
        'Fit Up': 75,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[1]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Fit Up: 75%');
      expect(chip).toBeInTheDocument();
    });

    it('shows full name and status for complete discrete milestone', () => {
      const currentMilestones = {
        'Installed': 100,
      };

      render(
        <MilestoneChips
          milestonesConfig={[mockMilestonesConfig[0]]}
          currentMilestones={currentMilestones}
        />
      );

      const chip = screen.getByTitle('Installed: Complete');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('maxVisible Truncation', () => {
    it('respects maxVisible limit', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={2}
        />
      );

      // Should only show first 2 milestones in main view
      expect(screen.getByTitle(/Installed/)).toBeInTheDocument();
      expect(screen.getByTitle(/Fit Up/)).toBeInTheDocument();
      // Third milestone (Welded) should not be visible in main view
      expect(screen.queryByText('Welded')).not.toBeInTheDocument();
    });

    it('shows "+N" button when truncated', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={1}
        />
      );

      const moreButton = screen.getByLabelText('Show 2 more milestones');
      expect(moreButton).toBeInTheDocument();
      expect(moreButton).toHaveTextContent('+2');
      expect(moreButton).toHaveClass('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
    });

    it('does not show "+N" when all chips visible', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={3}
        />
      );

      expect(screen.queryByLabelText(/Show.*more milestones/)).not.toBeInTheDocument();
    });

    it('does not show "+N" when maxVisible is undefined', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
        />
      );

      expect(screen.queryByLabelText(/Show.*more milestones/)).not.toBeInTheDocument();
    });

    it('popover button has aria-label', () => {
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={1}
        />
      );

      const moreButton = screen.getByLabelText('Show 2 more milestones');
      expect(moreButton).toBeInTheDocument();
    });

    it('opens popover showing all milestones when clicked', async () => {
      const user = userEvent.setup();
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={1}
        />
      );

      const moreButton = screen.getByLabelText('Show 2 more milestones');
      await user.click(moreButton);

      // Popover should show all milestones
      expect(screen.getByText('All Milestones')).toBeInTheDocument();

      // All three milestones should now be visible in the popover
      const allBadges = screen.getAllByTitle(/Installed|Fit Up|Welded/);
      // We should see duplicates: 1 in main view + 3 in popover = 4 total
      expect(allBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('shows percentages in popover for partial milestones', async () => {
      const user = userEvent.setup();
      const currentMilestones = {
        'Installed': 100,
        'Fit Up': 50,
        'Welded': 0,
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
          maxVisible={1}
        />
      );

      const moreButton = screen.getByLabelText('Show 2 more milestones');
      await user.click(moreButton);

      // In popover, partial milestones should show percentages
      const fitUpInPopover = screen.getByText('Fit Up (50%)');
      expect(fitUpInPopover).toBeInTheDocument();
    });
  });


  describe('Mixed Milestone States', () => {
    it('renders multiple milestones with different states correctly', () => {
      const currentMilestones = {
        'Installed': 100,    // Complete discrete
        'Fit Up': 50,        // Partial progress
        'Welded': 0,         // Not started
      };

      render(
        <MilestoneChips
          milestonesConfig={mockMilestonesConfig}
          currentMilestones={currentMilestones}
        />
      );

      const installedChip = screen.getByTitle('Installed: Complete');
      expect(installedChip).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');

      const fitUpChip = screen.getByTitle('Fit Up: 50%');
      expect(fitUpChip).toHaveClass('bg-amber-100', 'text-amber-800', 'border-amber-200');

      const weldedChip = screen.getByTitle('Welded: Not started');
      expect(weldedChip).toHaveClass('bg-slate-100', 'text-slate-600', 'border-slate-200');
    });
  });
});
