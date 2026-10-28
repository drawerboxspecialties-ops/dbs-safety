"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
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
    <div className="flex h-9 w-full items-stretch gap-1">
      <Popover>
        <PopoverTrigger
          className="inline-flex h-9 min-w-0 flex-1 items-center justify-start rounded-lg border border-border bg-background px-3 text-left text-sm font-normal hover:bg-muted"
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">
            {selected ? format(selected, "MMMM d, yyyy") : "No date"}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (!day) {
                onChange("");
                return;
              }
              const iso = new Date(
                day.getTime() - day.getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 10);
              onChange(iso);
            }}
            captionLayout="dropdown"
          />
          <div className="border-t p-2">
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onChange("")}
            >
              Leave date empty
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {value ? (
        <button
          type="button"
          title="Clear date"
          aria-label="Clear date"
          onClick={() => onChange("")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
