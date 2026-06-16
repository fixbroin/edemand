import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useTranslation } from "@/components/Layout/TranslationContext";

const CustomDateTimePicker = ({ value, onChange, onClose, minDateTime = null, type = 'start' }) => {
  const t = useTranslation();

  const initRef = value ? dayjs(value) : dayjs();
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [selectedHour, setSelectedHour] = useState(initRef.format("hh"));
  const [selectedMinute, setSelectedMinute] = useState(initRef.format("mm"));
  const [selectedPeriod, setSelectedPeriod] = useState(initRef.format("A"));

  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  // Auto-scroll columns to selected value on open
  useEffect(() => {
    const scrollTo = (ref, value, items) => {
      if (!ref.current) return;
      const idx = items.indexOf(value);
      if (idx < 0) return;
      const itemH = ref.current.scrollHeight / items.length;
      ref.current.scrollTop = Math.max(0, idx * itemH - ref.current.clientHeight / 2 + itemH / 2);
    };
    const timer = setTimeout(() => {
      scrollTo(hourRef, selectedHour, hours);
      scrollTo(minuteRef, selectedMinute, minutes);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const isDateDisabled = (date) => {
    const today = dayjs().startOf("day");
    const d = dayjs(date);
    if (d.isBefore(today)) return true;
    if (type === "endDateTime" && minDateTime) {
      return d.isBefore(dayjs(minDateTime), "day");
    }
    return false;
  };

  const isTimeDisabled = (hour, minute, period) => {
    if (!selectedDate) return false;

    let hour24 = parseInt(hour);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;

    const sel = dayjs(selectedDate).hour(hour24).minute(parseInt(minute)).second(0);
    const floor = minDateTime ? dayjs(minDateTime) : dayjs();

    if (!sel.isSame(floor, "day")) return sel.isBefore(floor, "day");

    if (type === "endDateTime") return !sel.isAfter(floor, "minute");
    return sel.isBefore(floor, "minute");
  };

  const handleTimeSelection = (kind, val) => {
    const disabled =
      kind === "hour" ? isTimeDisabled(val, selectedMinute, selectedPeriod)
      : kind === "minute" ? isTimeDisabled(selectedHour, val, selectedPeriod)
      : isTimeDisabled(selectedHour, selectedMinute, val);
    if (disabled) return;
    if (kind === "hour") setSelectedHour(val);
    else if (kind === "minute") setSelectedMinute(val);
    else setSelectedPeriod(val);
  };

  const handleOkClick = () => {
    if (!selectedDate) { toast.error(t("pleaseSelectDate")); return; }

    let hour = parseInt(selectedHour);
    if (selectedPeriod === "PM" && hour !== 12) hour += 12;
    if (selectedPeriod === "AM" && hour === 12) hour = 0;

    const newDate = dayjs(selectedDate).hour(hour).minute(parseInt(selectedMinute)).second(0).toDate();
    const floor = minDateTime ? dayjs(minDateTime) : dayjs();
    const tooEarly =
      type === "endDateTime"
        ? !dayjs(newDate).isAfter(floor, "minute")
        : dayjs(newDate).isBefore(floor, "minute");

    if (tooEarly) {
      toast.error(
        type === "endDateTime"
          ? t("pleaseSelectTimeAfterStartTime")
          : t("pleaseSelectFutureTime") || "Please select a future time"
      );
      return;
    }

    onChange?.(newDate);
    onClose?.();
  };

  const handleNowClick = () => {
    const now = new Date();
    setSelectedDate(now);
    setSelectedHour(dayjs(now).format("hh"));
    setSelectedMinute(dayjs(now).format("mm"));
    setSelectedPeriod(dayjs(now).format("A"));
  };

  return (
    <div className="flex flex-col space-y-4 max-w-full">
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Calendar */}
        <div className="flex-1 border rounded-lg p-2 h-full max-w-[350px] w-full">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={isDateDisabled}
            className="w-full custom-calendar"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-2",
              caption: "flex justify-center pt-1 relative items-center text-sm",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex justify-between",
              head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
              row: "flex w-full mt-1",
              cell: "text-center text-sm relative p-0",
              day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
              day_selected: "primary_bg_color text-primary-foreground hover:primary_bg_color hover:text-primary-foreground rounded-full",
              day_today: "bg-accent text-accent-foreground rounded-full",
              day_outside: "opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
          />
        </div>

        {/* Time Picker */}
        <div className="w-full border rounded-lg p-2">
          <div className="mb-3">
            <h3 className="text-sm font-medium">{t("selectTime")}</h3>
          </div>
          <div className="flex gap-2 h-[300px] w-full">
            {/* Hours */}
            <div className="flex-1 overflow-y-auto scrollbar-thin border rounded-lg scroll-smooth" ref={hourRef}>
              {hours.map((hour) => {
                const disabled = isTimeDisabled(hour, selectedMinute, selectedPeriod);
                return (
                  <button
                    key={hour}
                    onClick={() => handleTimeSelection("hour", hour)}
                    disabled={disabled}
                    className={cn(
                      "w-full py-2 text-sm rounded transition-colors",
                      !disabled && "hover:bg-gray-100 dark:hover:bg-gray-800",
                      selectedHour === hour && "primary_bg_color text-white",
                      disabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            {/* Minutes */}
            <div className="flex-1 overflow-y-auto scrollbar-thin border rounded-lg scroll-smooth" ref={minuteRef}>
              {minutes.map((minute) => {
                const disabled = isTimeDisabled(selectedHour, minute, selectedPeriod);
                return (
                  <button
                    key={minute}
                    onClick={() => handleTimeSelection("minute", minute)}
                    disabled={disabled}
                    className={cn(
                      "w-full py-2 text-sm rounded transition-colors",
                      !disabled && "hover:bg-gray-100 dark:hover:bg-gray-800",
                      selectedMinute === minute && "primary_bg_color text-white",
                      disabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>

            {/* AM/PM */}
            <div className="w-14 h-fit border rounded-lg">
              {["AM", "PM"].map((period) => {
                const disabled = isTimeDisabled(selectedHour, selectedMinute, period);
                return (
                  <button
                    key={period}
                    onClick={() => handleTimeSelection("period", period)}
                    disabled={disabled}
                    className={cn(
                      "w-full py-2 text-sm rounded transition-colors",
                      !disabled && "hover:bg-gray-100 dark:hover:bg-gray-800",
                      selectedPeriod === period && "primary_bg_color text-white",
                      disabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {t(period.toLowerCase())}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          variant="outline"
          onClick={handleNowClick}
          className="hover:bg-gray-50 text-sm h-8 hover:text-black"
        >
          {t("now")}
        </Button>
        <Button
          onClick={handleOkClick}
          className="primary_bg_color hover:opacity-90 text-white dark:text-black text-sm h-8"
        >
          {t("ok")}
        </Button>
      </div>
    </div>
  );
};

export default CustomDateTimePicker;
