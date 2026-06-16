"use client";
import React from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { darkThemeStyles, useGoogleMapsLoader, useIsDarkMode } from "@/utils/Helper";
import { FaCheckCircle } from "react-icons/fa";
import { IoCallOutline, IoLocationOutline, IoPencil, IoTrash } from "react-icons/io5";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const AddressCard = ({ data, onDelete, onEdit, t }) => {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const isDarkMode = useIsDarkMode();

  const center = {
    lat: Number(data?.lattitude) || 0,
    lng: Number(data?.longitude) || 0,
  };

  const isDefault = data?.is_default === "1" || data?.is_default === 1;

  return (
    <div
      className={`isolate relative group border rounded-2xl overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-md border_color`}
      style={{ borderWidth: isDefault ? "1.5px" : "1px" }}
    >
      {/* Map Section */}
      <div className="relative h-40 flex-shrink-0 bg-gray-100">
        {loadError ? (
          <div className="w-full h-full background_color flex items-center justify-center">
            <p className="text-xs text-red-400">Map unavailable</p>
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            options={{
              streetViewControl: false,
              fullscreenControl: false,
              zoomControl: false,
              mapTypeControl: false,
              clickableIcons: false,
              styles: isDarkMode ? darkThemeStyles : [],
            }}
          >
            <MarkerF position={center} />
          </GoogleMap>
        ) : (
          <div className="w-full h-full background_color flex items-center justify-center">
            <p className="text-xs description_color">{t("loadingMap")}</p>
          </div>
        )}

        {/* Hover overlay with actions */}
        <div
          className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
        >
          <button
            className="flex items-center gap-1.5 bg-white text-gray-800 text-sm font-medium py-1.5 px-4 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            onClick={onEdit}
          >
            <IoPencil size={13} />
            {t("edit")}
          </button>
          <button
            className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-medium py-1.5 px-4 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            onClick={onDelete}
          >
            <IoTrash size={13} />
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* City + Type + Default */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold capitalize truncate">
            {(data?.city_name || data?.city)
              ? `${data?.city_name || data?.city}${data?.type ? ` - ${data.type}` : ''}`
              : data?.type || "—"}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isDefault && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 light_bg_color primary_text_color rounded-full">
                <FaCheckCircle size={10} />
                {t("default")}
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        {data?.address && (
          <div className="flex items-start gap-1.5">
            <IoLocationOutline size={14} className="mt-0.5 flex-shrink-0" />
            <span className="text-xs line-clamp-2 leading-relaxed">
              {data.address}
            </span>
          </div>
        )}

        {/* Mobile */}
        {data?.mobile && (
          <div className="flex items-center gap-1.5">
            <IoCallOutline size={13} className="flex-shrink-0" />
            <span className="text-xs">{data.mobile}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressCard;
