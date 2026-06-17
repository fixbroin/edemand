"use client";
import { useEffect, useState, useRef } from "react";
import {
  changeOrderStatusApi,
  checkSlotsApi,
  getAvailableSlotApi,
  releaseSlotLockApi,
} from "@/api/apiRoutes";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { FaCheck, FaInfoCircle, FaCalendarTimes } from "react-icons/fa";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  selectCartProvider,
  selectDeliveryDetails,
  setDilveryDetails,
} from "@/redux/reducers/cartSlice";
import CustomTimePicker from "./CustomTimePicker";
import { useRouter } from "next/router";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { selectReorderMode } from "@/redux/reducers/reorderSlice";
import { Skeleton } from "@/components/ui/skeleton";
import { logClarityEvent } from "@/utils/clarityEvents";
import { BOOKING_EVENTS } from "@/constants/clarityEventNames";

const SelectDateAndTimeDrawer = ({
  dilveryDetails,
  providerId,
  open,
  onClose,
  isRechedule,
  orderID,
  customJobId,
  advance_booking_days,
}) => {
  const t = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();

  const isReorderMode = useSelector(selectReorderMode);
  const reorderState = useSelector((state) => state.reorder);
  const currentCartProviderData = useSelector((state) =>
    isReorderMode ? reorderState?.provider : selectCartProvider(state)
  );
  const bookingDays = currentCartProviderData?.advance_booking_days || advance_booking_days;
  const reduxDilveryDetails = useSelector(selectDeliveryDetails);

  const [selectedDate, setSelectedDate] = useState(
    dilveryDetails?.dilveryDate ? dayjs(dilveryDetails?.dilveryDate) : dayjs()
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(
    dilveryDetails?.dilveryDate ? dilveryDetails?.dilveryTime : null
  );
  const [selectedTimeSlotMessage, setSelectedTimeSlotMessage] = useState(
    dilveryDetails?.dilveryTimeMessage || null
  );
  const [customTime, setCustomTime] = useState(null);
  const [isCustomTimeSelected, setIsCustomTimeSelected] = useState(false);
  const [timeSlots, setTimeSlotes] = useState([]);
  const [slotsError, setSlotsError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const timeSlotsRef = useRef(null);

  useEffect(() => {
    if (open) {
      logClarityEvent(BOOKING_EVENTS.TIMESLOT_PICKER_OPENED, {
        provider_id: providerId,
        custom_job_id: customJobId,
      });
    }
  }, [open, providerId, customJobId]);

  useEffect(() => {
    if (!selectedDate) setSelectedDate(dayjs());
  }, []);

  useEffect(() => {
    if (customTime && isCustomTimeSelected) {
      setSelectedTimeSlot(customTime);
      setSelectedTimeSlotMessage(null);
    }
  }, [customTime, isCustomTimeSelected]);

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot.time);
    setSelectedTimeSlotMessage(timeSlot.message || null);
    setIsCustomTimeSelected(false);
    logClarityEvent(BOOKING_EVENTS.TIMESLOT_SLOT_SELECTED, {
      provider_id: providerId,
      slot: timeSlot.time,
      has_message: Boolean(timeSlot.message),
    });
  };

  const fetchTimeSlots = async () => {
    const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
    setIsLoading(true);
    try {
      const response = await getAvailableSlotApi({
        partner_id: providerId,
        selectedDate: formattedDate,
        custom_job_request_id: customJobId ? customJobId : "",
      });
      if (response?.error === false) {
        setTimeSlotes(response?.data?.all_slots);
        setSlotsError(null);
      } else {
        setTimeSlotes([]);
        setSlotsError(response?.message || null);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
      // Smooth scroll to time slots section on mobile when date is selected
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [selectedDate]);

  const handleClose = () => {
    if (reduxDilveryDetails?.slotLockId) {
      releaseSlotLockApi({ lock_id: reduxDilveryDetails.slotLockId }).catch(() => {});
      dispatch(setDilveryDetails({ ...reduxDilveryDetails, slotLockId: null }));
    }
    onClose();
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setSelectedTimeSlotMessage(null);
    setCustomTime(null);
    setIsCustomTimeSelected(false);
  };

  const changeOrderStatus = async () => {
    try {
      const response = await changeOrderStatusApi({
        order_id: orderID,
        status: "rescheduled",
        date: dayjs(selectedDate).format("YYYY-MM-DD"),
        time: selectedTimeSlot,
      });
      if (response?.error === false) {
        toast.success(response?.message);
        logClarityEvent(BOOKING_EVENTS.BOOKING_RESCHEDULED, {
          order_id: orderID,
          date: dayjs(selectedDate).format("YYYY-MM-DD"),
          time: selectedTimeSlot,
        });
        onClose();
        router.push(`/booking/inv-${orderID}`);
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate && !selectedTimeSlot) {
      toast.error(t("pleaseSelectDateAndTimeSlot"));
      logClarityEvent(BOOKING_EVENTS.TIMESLOT_VALIDATION_FAILED, { reason: "missing_date_and_time" });
    } else if (!selectedDate) {
      toast.error(t("pleaseSelectDate"));
      logClarityEvent(BOOKING_EVENTS.TIMESLOT_VALIDATION_FAILED, { reason: "missing_date" });
    } else if (!selectedTimeSlot) {
      toast.error(t("pleaseSelectTimeSlot"));
      logClarityEvent(BOOKING_EVENTS.TIMESLOT_VALIDATION_FAILED, { reason: "missing_time" });
    } else {
      try {
        const response = await checkSlotsApi({
          partner_id: providerId,
          date: dayjs(selectedDate).format("YYYY-MM-DD"),
          time: selectedTimeSlot,
          custom_job_request_id: customJobId ? customJobId : "",
          order_id: isReorderMode ? reorderState.orderId : orderID ? orderID : "",
          // is_reorder: isReorderMode ? 1 : "",
        });
        if (response?.error === false) {
          if (!isRechedule) {
            dispatch(
              setDilveryDetails({
                ...dilveryDetails,
                dilveryDate: selectedDate,
                dilveryTime: selectedTimeSlot,
                dilveryTimeMessage: selectedTimeSlotMessage,
                slotLockId: response?.data?.lock_id || null,
              })
            );
            onClose();
          } else {
            changeOrderStatus();
          }
        } else {
          toast.error(response?.message);
        }
      } catch (error) {
        console.error("Error setting delivery details:", error);
      }
    }
  };

  const availableCount = timeSlots.filter((s) => s.is_available === 1).length;

  const TimeSlotSkeleton = () => (
    <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-2">
      {[...Array(12)].map((_, index) => (
        <Skeleton key={index} className="w-full h-14 rounded-xl" />
      ))}
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} modal>
      <DrawerContent
        className={cn(
          "max-w-full md:max-w-[90%] lg:max-w-[85%] xl:max-w-7xl mx-auto rounded-tr-[18px] rounded-tl-[18px]",
          "h-[96vh] overflow-hidden",
          "transition-all duration-300",
          "after:!content-none"
        )}
      >
        <DrawerTitle className="hidden" />
        <div className="select_date h-full overflow-y-auto flex flex-col lg:flex-row gap-6 py-4 px-4 md:p-6 lg:p-8 pb-20 md:pb-10">

          {/* Left — Calendar */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{t("schedule")}</h2>
            <div className="schedule_cal w-full border rounded-xl md:rounded-2xl p-2 md:p-3">
              <Calendar
                mode="single"
                selected={selectedDate.toDate()}
                onSelect={(date) => setSelectedDate(dayjs(date))}
                showOutsideDays={true}
                disabled={{
                  before: new Date(),
                  after: dayjs().add(bookingDays - 1, "day").toDate(),
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Right — Time Slots */}
          <div className="w-full lg:w-1/2 flex flex-col" ref={timeSlotsRef}>
            {/* Header row: title + date + available count */}
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{t("selectTimeSlot")}</h2>
                {selectedDate && (
                  <p className="text-sm description_color mt-0.5">
                    {dayjs(selectedDate).format("dddd, MMMM D")}
                  </p>
                )}
              </div>
              {!isLoading && timeSlots.length > 0 && (
                <span className="text-xs description_color bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 mt-1 whitespace-nowrap">
                  {availableCount} {t("available")}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4 md:gap-5 flex-grow">
              {isLoading ? (
                <>
                  <TimeSlotSkeleton />
                  <div className="p-2 md:p-3 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-12" />
                </>
              ) : timeSlots?.length > 0 ? (
                <>
                  <div className="time_slots grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 mb-2 max-h-[500px] overflow-y-visible pr-1">
                    {timeSlots?.map((timeSlot) => {
                      const isFull = timeSlot.is_available === 0;
                      const isSelected = selectedTimeSlot === timeSlot.time;

                      return (
                        <button
                          key={timeSlot.time}
                          disabled={isFull}
                          className={cn(
                            "relative px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between rounded-xl border transition-all duration-150",
                            isFull
                              ? "card_bg opacity-40 cursor-not-allowed"
                              : isSelected
                                ? "primary_text_color border_color selected_shadow primary_light_bg"
                                : "card_bg description_color hover:border_color hover:primary_text_color"
                          )}
                          onClick={() => {
                            if (!isFull) handleTimeSlotSelect(timeSlot);
                          }}
                        >
                          <span className="text-sm md:text-base font-medium">
                            {dayjs(new Date(`1970-01-01T${timeSlot.time}`)).format("h:mm A")}
                          </span>
                          {isSelected && (
                            <span className="primary_text_color">
                              <FaCheck size={13} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi-day continuation banner */}
                  {selectedTimeSlotMessage && (
                    <div className="warning_banner rounded-xl p-3 flex items-start gap-2">
                      <FaInfoCircle size={15} className="mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-snug">{selectedTimeSlotMessage}</span>
                    </div>
                  )}

                  {/* Custom time picker */}
                  <div className="p-2 md:p-3 flex items-center justify-between w-full light_bg_color border_color primary_text_color rounded-xl border">
                    <CustomTimePicker
                      value={customTime}
                      setSelectedTimeSlot={(time) => {
                        setSelectedTimeSlot(dayjs(time).format("HH:mm:00"));
                        setSelectedTimeSlotMessage(null);
                        setIsCustomTimeSelected(true);
                        logClarityEvent(BOOKING_EVENTS.TIMESLOT_CUSTOM_TIME_ENTERED, {
                          provider_id: providerId,
                          custom_time: dayjs(time).format("HH:mm:00"),
                        });
                      }}
                      onChange={(time) => {
                        setCustomTime(time);
                        setIsCustomTimeSelected(true);
                      }}
                    />
                  </div>

                  {/* Continue button — shows selected time when chosen */}
                  <div className="continue flex items-center mt-auto">
                    <button
                      className={cn(
                        "rounded-xl p-3 w-full font-medium transition-colors duration-150 text-sm md:text-base",
                        !selectedTimeSlot
                          ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400 dark:text-gray-500"
                          : "primary_bg_color text-white"
                      )}
                      onClick={handleSchedule}
                      disabled={!selectedTimeSlot}
                    >
                      {selectedTimeSlot
                        ? `${t("continue")} · ${dayjs(new Date(`1970-01-01T${selectedTimeSlot}`)).format("h:mm A")}`
                        : t("continue")}
                    </button>
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex-grow flex flex-col items-center justify-center gap-3 min-h-[400px] md:min-h-[450px]">
                  <span className="description_color opacity-40">
                    <FaCalendarTimes size={40} />
                  </span>
                  <p className="text-center text-base font-medium description_color">
                    {slotsError || t("providerIsClosed")}
                  </p>
                  {!slotsError && (
                    <p className="text-center text-sm description_color opacity-70">
                      {t("tryAnotherDate")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SelectDateAndTimeDrawer;
