"use client";
import React from "react";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { IoMdNotifications } from "react-icons/io";
import { useTranslation } from "../Layout/TranslationContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getNotificationRedirectUrl, isNotificationRedirectable } from "@/utils/notificationRedirect";
import { formatTimeAgo } from "@/utils/Helper";

const NotificationCard = ({ data }) => {
  const t = useTranslation();
  const router = useRouter();

  // Use the centralized notification redirect utility
  // This handles all notification types including booking, job, blog, etc.
  const getRedirectUrl = (data) => {
    const redirectUrl = getNotificationRedirectUrl(data);

    // Show error messages for specific cases that need additional data
    if (!redirectUrl && data?.type === "provider" && !data?.provider_slug) {
      toast.error(t("providerNotAvailable"));
      return "";
    }

    if (!redirectUrl && data?.type === "category" && !data?.category_slug) {
      toast.error(t("categoryNotAvailable"));
      return "";
    }

    return redirectUrl || "";
  };

  // Check if notification is redirectable using the utility function
  const isRedirectable = isNotificationRedirectable(data);

  // Handle redirect when card is clicked
  const handleRedirect = (data) => {

    const url = getRedirectUrl(data);

    if (!url) {
      return;
    }

    // For external URLs, open in a new tab
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // For internal navigation, use router
      router.push(url);
    }
  };


  return (
    <div
      className={`flex items-start justify-between border-b last:border-b-0 p-4 gap-4 first:rounded-t-xl last:rounded-b-xl
      ${isRedirectable ? "hover:light_bg_color transition-all duration-300 cursor-pointer" : ""}`}
      onClick={() => isRedirectable && handleRedirect(data)}
      role={isRedirectable ? "button" : "none"}
      tabIndex={isRedirectable ? 0 : -1}
      onKeyDown={(e) => {
        if (isRedirectable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleRedirect(data);
        }
      }}
    >
      {/* Image */}
      {data?.image ? (
        <div className="w-16 aspect-square rounded overflow-hidden">
          <CustomImageTag
            src={data?.image}
            alt={data?.title}
            className="w-full h-full object-cover"
            imgClassName="object-cover"
            width={0}
            height={0}
            loading="lazy"
          />
        </div>
      ) :
        <div className="w-16 h-16 rounded overflow-hidden light_bg_color primary_text_color flex items-center justify-center">
          <IoMdNotifications size={40} />
        </div>}
      {/* Notification Content */}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{data?.title}</h3>
          <div className="description_color text-sm whitespace-nowrap">
            {formatTimeAgo(data?.date_sent, t)}
          </div>
        </div>
        <p className="text-sm description_color mb-2 text-wrap max-w-[80%]">{data?.message}</p>

      </div>
    </div>
  );
};

export default NotificationCard;
