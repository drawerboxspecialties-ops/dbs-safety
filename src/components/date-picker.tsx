"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-9 w-full items-center justify-start rounded-lg border border-border bg-background px-3 text-left text-sm font-normal hover:bg-muted"
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected ? format(selected, "MMMM d, yyyy") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (!day) return;
            const iso = new Date(day.getTime() - day.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 10);
            onChange(iso);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
