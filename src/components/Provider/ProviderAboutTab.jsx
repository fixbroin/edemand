import {
  darkThemeStyles,
  showDistance,
  useGoogleMapsLoader,
  useIsDarkMode,
} from "@/utils/Helper";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import React, { useState, useEffect, useRef } from "react";
import { GrLocation } from "react-icons/gr";
import { useTranslation } from "../Layout/TranslationContext";
import DOMPurify from "dompurify";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { FaStar } from "react-icons/fa6";
import { IoLocationOutline } from "react-icons/io5";
import Lightbox from "../ReUseableComponents/CustomLightBox/LightBox";

const ProviderAboutTab = ({ providerData }) => {
  const t = useTranslation();
  const isDarkMode = useIsDarkMode();

  const { isLoaded, loadError } = useGoogleMapsLoader();

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const [isExpanded, setIsExpanded] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [isTruncated, setIsTruncated] = useState(false);
  const aboutRef = useRef(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Convert time from 24-hour format to 12-hour format
  const convertTo12HourFormat = (time) => {
    const [hours, minutes] = time?.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12; // Convert 0 or 24 to 12
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const hasShiftsByDay =
    providerData?.shifts_by_day &&
    Object.keys(providerData.shifts_by_day).length > 0;

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const todayIndex = new Date().getDay();

  // Supports shifts_by_day (new) and flat fields (old)
  const openingHours = days?.map((day) => {
    const dayKey = day.toLowerCase();

    if (hasShiftsByDay && providerData.shifts_by_day[dayKey]) {
      const dayData = providerData.shifts_by_day[dayKey];
      if (dayData.is_open !== "1") return { day: t(day), shifts: null };

      const shifts = dayData.shifts
        .filter((s) => s.is_open === "1")
        .map((s) => ({
          time: `${convertTo12HourFormat(s.opening_time)} - ${convertTo12HourFormat(s.closing_time)}`,
          onLeave: s.on_leave === "1",
          openingMinutes: timeToMinutes(s.opening_time),
          closingMinutes: timeToMinutes(s.closing_time),
        }));

      return { day: t(day), shifts: shifts.length ? shifts : null };
    }

    // Old flat-field format
    const isOpen = providerData[`${dayKey}_is_open`] === "1";
    if (!isOpen) return { day: t(day), shifts: null };

    return {
      day: t(day),
      shifts: [
        {
          time: `${convertTo12HourFormat(providerData[`${dayKey}_opening_time`])} - ${convertTo12HourFormat(providerData[`${dayKey}_closing_time`])}`,
          onLeave: false,
          openingMinutes: timeToMinutes(providerData[`${dayKey}_opening_time`]),
          closingMinutes: timeToMinutes(providerData[`${dayKey}_closing_time`]),
        },
      ],
    };
  });

  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const todaySchedule = openingHours[todayIndex];

  const isOpenNow =
    todaySchedule?.shifts?.some(
      (s) =>
        !s.onLeave &&
        currentMinutes >= s.openingMinutes &&
        currentMinutes < s.closingMinutes
    ) ?? false;

  useEffect(() => {
    const descriptionToUse = providerData?.translated_long_description || providerData?.long_description;

    if (descriptionToUse) {
      const sanitizedHTML = DOMPurify.sanitize(descriptionToUse);
      const tempElement = document.createElement("div");
      tempElement.innerHTML = sanitizedHTML;
      const plainText = tempElement.textContent || tempElement.innerText || "";

      setFullDescription(sanitizedHTML);
      setIsTruncated(plainText.trim().length > 150);
    }
  }, [providerData]);

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  // Error or loading states
  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Center coordinates for the map
  const center = {
    lat: Number(providerData?.latitude) || 0,
    lng: Number(providerData?.longitude) || 0,
  };
  return (
    <div className="space-y-6">
      {/* Banner and Basic Info */}
      <div className="rounded-[18px] provider_info_card dark:card_bg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 pb-0">
          <CustomImageTag
            src={providerData?.banner_image}
            alt={providerData?.company_name}
            imgClassName="w-full aspect-provider-banner object-cover rounded-xl"
          />
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
              <CustomImageTag
                src={providerData?.image}
                alt={providerData?.company_name}
                className="w-full aspect-square object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {providerData?.translated_company_name || providerData?.company_name}
              </h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {providerData?.ratings > 0 && (
                  <div className="flex items-center gap-1">
                    <FaStar className="w-3.5 h-3.5 rating_icon_color" />
                    <span className="text-sm font-medium">{providerData?.ratings}</span>
                  </div>
                )}
                {providerData?.distance > 0 && (
                  <div className="flex items-center gap-1 text-sm description_color">
                    <IoLocationOutline className="primary_text_color font-bold" size={16} />
                    {showDistance(providerData?.distance)}
                  </div>
                )}
                {providerData?.total_services > 0 && (
                  <div className="text-sm primary_text_color font-medium">
                    {providerData?.total_services} {t("services")}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm description_color leading-relaxed">
              {providerData?.translated_about || providerData?.about}
            </p>
          </div>
        </div>
      </div>

      {/* Company Information */}
      {(providerData?.translated_long_description || providerData?.long_description) && (
        <div className="rounded-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            {t("companyInformation")}
          </h2>
          <div className="space-y-4">
            <div
              className={`text-sm description_color leading-relaxed overflow-hidden ${!isExpanded && isTruncated ? "line-clamp-4  " : ""}`}
              dangerouslySetInnerHTML={{ __html: fullDescription }}
            />

            {isTruncated && (
              <button
                className="text-sm hover:underline"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? t("viewLess") : t("viewMore")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photo Gallery section */}
      {providerData?.other_images?.length > 0 && (
        <div className="light_bg_color rounded-lg overflow-hidden mt-4 relative p-5">
          <h2 className="text-[20px] font-semibold">{t("photos")}</h2>
          <div className="photos grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
            {providerData?.other_images?.map((image, index) => (
              <div
                className="photo cursor-pointer"
                key={index}
                onClick={() => openLightbox(index)}
              >
                <CustomImageTag
                  src={image}
                  alt={`other_image_${index}`}
                  imgClassName="rounded-md w-full aspect-service-other object-cover"
                />
              </div>
            ))}
          </div>
          {isLightboxOpen && (
            <Lightbox
              isLightboxOpen={isLightboxOpen}
              images={providerData.other_images}
              initialIndex={currentImageIndex}
              onClose={closeLightbox}
            />
          )}
        </div>
      )}

      {/* Business Hours */}
      <div className="rounded-lg">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("bussinessHours")}
          </h2>
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              isOpenNow
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
            }`}
          >
            {isOpenNow && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-50" style={{ animationDuration: "1.5s" }} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
            {isOpenNow ? t("openNow") : t("closedNow")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 light_bg_color p-[18px] rounded-md">
          {openingHours?.map((schedule, index) => {
            const isToday = index === todayIndex;
            const isClosed = !schedule?.shifts?.length;
            return (
              <div
                key={index}
                className={`card_bg p-3 shadow-sm rounded-md border-l-4 flex flex-col gap-2 ${
                  isToday ? "primary_border_color" : "border-transparent"
                }`}
              >
                <p
                  className={`font-medium ${
                    isToday ? "primary_text_color" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {schedule?.day}
                </p>
                {isClosed ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t("closed")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {schedule.shifts.map((shift, si) =>
                      shift.onLeave ? (
                        <span
                          key={si}
                          className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 flex items-center gap-1.5"
                        >
                          <span className="line-through">{shift.time}</span>
                          <span>· {t("onLeave")}</span>
                        </span>
                      ) : (
                        <span
                          key={si}
                          className="text-xs px-2 py-1 rounded-full border description_color border-gray-200 dark:border-gray-600"
                        >
                          {shift.time}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Us */}
      {providerData?.latitude && providerData?.longitude && providerData?.address && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t("contactUs")}
          </h2>

          {/* Map */}
          <div className="w-full h-[320px] rounded-lg mb-4 relative overflow-hidden">
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={center}
              zoom={15}
              options={{
                streetViewControl: false,
                styles: isDarkMode ? darkThemeStyles : [],
              }}
            >
              {providerData?.latitude && providerData?.longitude && <MarkerF position={center} />}
            </GoogleMap>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center p-[12px] light_bg_color rounded-md primary_text_color">
              <GrLocation className="h-5 w-5 mt-1 flex-shrink-0" />
            </div>
            <div>
              <p className="text-sm primary_text_color">{t("address")}</p>
              <p className="text-xs sm:text-base md:text-lg font-medium">
                {providerData?.address}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderAboutTab;
