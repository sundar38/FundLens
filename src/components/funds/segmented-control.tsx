"use client";

import { Button } from "@/components/ui/button";

type SegmentedControlProps<T extends string | number> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// A row of toggle buttons where exactly one is selected (chart range, SIP years).
const SegmentedControl = <T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1 rounded-lg border p-0.5">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isSelected ? "default" : "ghost"}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
