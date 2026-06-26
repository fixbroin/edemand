import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "@/components/Layout/TranslationContext";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  const t = useTranslation();

  // Create formatters for the calendar
  const formatters = {
    formatWeekdayName: (date) => {
      // 1. Get the short key (e.g., "mon")
      const shortKey = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

      // 2. Try to get the translated short version
      const translatedShort = t(shortKey);

      // 3. If a translation exists and is different from the key, use it
      if (translatedShort && translatedShort !== shortKey) {
        return translatedShort;
      }

      // 4. Fallback: Use long name and slice
      const longKey = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const translatedLong = t(longKey);

      return translatedLong?.slice(0, 3);
    },
    formatCaption: (date, options) => {
      const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
      const year = date.getFullYear();
      return `${t(month)} ${year}`;
    },
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 w-full", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 pb-[20px] w-full",
        month: "space-y-6 w-full", // Increased spacing between months
        caption: "flex justify-center pt-2 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2", // Adjust table spacing
        head_row: "flex w-full justify-between",
        head_cell:
          "text-muted-foreground rounded-md w-[14.28%] max-w-[56px] font-normal text-[1rem] flex items-center justify-center", // Fluid width
        row: "flex w-full mt-3 justify-between",
        cell: "aspect-square w-[14.28%] max-w-[56px] text-center text-lg p-1 relative rounded-full focus-within:relative focus-within:z-20 flex items-center justify-center", // Fluid cell width and aspect-square
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "aspect-square h-full w-full max-w-[56px] p-0 font-medium rounded-full flex items-center justify-center" // Fluid day buttons
        ),
        day_range_end: "day-range-end",
        day_selected: "primary_bg_color text-white hover:bg-primary hover:text-white", // Custom color
        day_today: "bg-accent text-accent-foreground font-bold",
        day_outside: "text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      formatters={formatters}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
