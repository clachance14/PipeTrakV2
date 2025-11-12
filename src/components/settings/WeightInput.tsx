/**
 * WeightInput component (Feature 026 - User Story 2)
 * Numeric input for milestone weight with validation (0-100)
 */

import { cn } from '@/lib/utils';

interface WeightInputProps {
  milestoneName: string;
  value: number;
  onChange: (milestoneName: string, value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function WeightInput({
  milestoneName,
  value,
  onChange,
  error,
  disabled = false,
}: WeightInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Convert empty string to 0
    if (inputValue === '') {
      onChange(milestoneName, 0);
      return;
    }

    // Parse as integer
    const numericValue = parseInt(inputValue, 10);

    // Only call onChange if it's a valid number
    if (!isNaN(numericValue)) {
      onChange(milestoneName, numericValue);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`weight-${milestoneName}`} className="text-sm font-medium">
        {milestoneName}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`weight-${milestoneName}`}
          type="number"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={milestoneName}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-invalid={error ? 'true' : 'false'}
          role="spinbutton"
          className={cn(
            'w-20 px-3 py-2 border rounded-md text-right',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-gray-300'
          )}
        />
        <span className="text-sm text-gray-600">%</span>
      </div>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
