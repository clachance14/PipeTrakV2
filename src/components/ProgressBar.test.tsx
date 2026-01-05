import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MiniProgressBar } from './ProgressBar';

describe('MiniProgressBar', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<MiniProgressBar value={50} />);
      const progressBar = container.querySelector('.flex.items-center');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders with showLabel=true', () => {
      render(<MiniProgressBar value={45.2} showLabel />);
      expect(screen.getByText('45.2%')).toBeInTheDocument();
    });

    it('does not render label when showLabel=false', () => {
      render(<MiniProgressBar value={45.2} showLabel={false} />);
      expect(screen.queryByText('45.2%')).not.toBeInTheDocument();
    });

    it('does not render label by default', () => {
      render(<MiniProgressBar value={45.2} />);
      expect(screen.queryByText('45.2%')).not.toBeInTheDocument();
    });
  });

  describe('value clamping', () => {
    it('clamps negative values to 0', () => {
      const { container } = render(<MiniProgressBar value={-10} showLabel />);
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('clamps values over 100 to 100', () => {
      const { container } = render(<MiniProgressBar value={150} showLabel />);
      expect(screen.getByText('100.0%')).toBeInTheDocument();
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('accepts valid values between 0-100', () => {
      const { container } = render(<MiniProgressBar value={75.5} showLabel />);
      expect(screen.getByText('75.5%')).toBeInTheDocument();
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveStyle({ width: '75.5%' });
    });
  });

  describe('color thresholds', () => {
    it('renders transparent background for 0%', () => {
      const { container } = render(<MiniProgressBar value={0} />);
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveClass('bg-transparent');
    });

    it('renders red for 1-25%', () => {
      const { container: container1 } = render(<MiniProgressBar value={1} />);
      const fillBar1 = container1.querySelector('[style*="width"]');
      expect(fillBar1).toHaveClass('bg-red-500');

      const { container: container2 } = render(<MiniProgressBar value={25} />);
      const fillBar2 = container2.querySelector('[style*="width"]');
      expect(fillBar2).toHaveClass('bg-red-500');
    });

    it('renders amber for 26-75%', () => {
      const { container: container1 } = render(<MiniProgressBar value={26} />);
      const fillBar1 = container1.querySelector('[style*="width"]');
      expect(fillBar1).toHaveClass('bg-amber-500');

      const { container: container2 } = render(<MiniProgressBar value={50} />);
      const fillBar2 = container2.querySelector('[style*="width"]');
      expect(fillBar2).toHaveClass('bg-amber-500');

      const { container: container3 } = render(<MiniProgressBar value={75} />);
      const fillBar3 = container3.querySelector('[style*="width"]');
      expect(fillBar3).toHaveClass('bg-amber-500');
    });

    it('renders blue for 76-99%', () => {
      const { container: container1 } = render(<MiniProgressBar value={76} />);
      const fillBar1 = container1.querySelector('[style*="width"]');
      expect(fillBar1).toHaveClass('bg-blue-500');

      const { container: container2 } = render(<MiniProgressBar value={99} />);
      const fillBar2 = container2.querySelector('[style*="width"]');
      expect(fillBar2).toHaveClass('bg-blue-500');
    });

    it('renders green for 100%', () => {
      const { container } = render(<MiniProgressBar value={100} />);
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveClass('bg-green-500');
    });
  });

  describe('size variants', () => {
    it('renders small size by default', () => {
      const { container } = render(<MiniProgressBar value={50} />);
      const barContainer = container.querySelector('.w-16');
      expect(barContainer).toHaveClass('h-1');
    });

    it('renders small size when size=sm', () => {
      const { container } = render(<MiniProgressBar value={50} size="sm" />);
      const barContainer = container.querySelector('.w-16');
      expect(barContainer).toHaveClass('h-1');
    });

    it('renders medium size when size=md', () => {
      const { container } = render(<MiniProgressBar value={50} size="md" />);
      const barContainer = container.querySelector('.w-16');
      expect(barContainer).toHaveClass('h-1.5');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MiniProgressBar value={50} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has transition animation on fill bar', () => {
      const { container } = render(<MiniProgressBar value={50} />);
      const fillBar = container.querySelector('[style*="width"]');
      expect(fillBar).toHaveClass('transition-all', 'duration-300');
    });

    it('has tabular-nums on label for consistent spacing', () => {
      render(<MiniProgressBar value={50} showLabel />);
      const label = screen.getByText('50.0%');
      expect(label).toHaveClass('tabular-nums');
    });
  });

  describe('width calculation', () => {
    it('sets correct width style for various percentages', () => {
      const testCases = [
        { value: 0, expected: '0%' },
        { value: 25, expected: '25%' },
        { value: 50.5, expected: '50.5%' },
        { value: 75, expected: '75%' },
        { value: 100, expected: '100%' }
      ];

      testCases.forEach(({ value, expected }) => {
        const { container } = render(<MiniProgressBar value={value} />);
        const fillBar = container.querySelector('[style*="width"]');
        expect(fillBar).toHaveStyle({ width: expected });
      });
    });
  });
});
