"use client";
import React, { useEffect, useState, useRef } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useGoogleMapsLoader, useRTL } from "@/utils/Helper";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/scrollbar";
import { BsPlusLg } from "react-icons/bs";
import { IoCheckmark, IoStar, IoStarOutline } from "react-icons/io5";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setDilveryDetails } from "@/redux/reducers/cartSlice";
import { getUserData } from "@/redux/reducers/userDataSlice";
import { AddAddressApi, GetAddressCustomFieldsApi } from "@/api/apiRoutes";
import { useTranslation } from "@/components/Layout/TranslationContext";
import MiniLoader from "../MiniLoader";
import AddressMap from "../LocationMapBox/AddressMap.jsx";
import { logClarityEvent } from "@/utils/clarityEvents";
import { AUTH_EVENTS } from "@/constants/clarityEventNames";

const inputBase =
  "w-full px-3 py-2.5 border background_color rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border_color focus:light_bg_color";

const FormField = ({ label, required, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold description_color flex items-center gap-1 flex-wrap">
      {label}
      {required && <span className="text-red-500 font-bold">*</span>}
      {hint && (
        <span className="text-[10px] font-normal opacity-50 ml-1">({hint})</span>
      )}
    </label>
    {children}
  </div>
);

const FieldSkeleton = () => (
  <div className="flex flex-col gap-1 animate-pulse">
    <div className="h-3 w-1/3 background_color rounded opacity-50" />
    <div className="h-10 w-full background_color rounded-lg opacity-40" />
  </div>
);

const AddressDrawer = ({
  open,
  onClose,
  defaultAddress,
  setDefaultAddress,
  addresses,
  setAddresses,
  onUpdateAddress,
}) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const dilveryDetails = useSelector((state) => state.cart);
  const userData = useSelector(getUserData);
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const isRTL = useRTL();
  const [isClicked, setIsClicked] = useState(false);
  const [activeAddress, setActiveAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const customFieldsFetchedRef = useRef(false);

  const addressTypes = ["home", "office", "other"];

  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    if (defaultAddress && open) {
      setActiveAddress(defaultAddress);
      const reorderedAddresses = addresses.filter(
        (add) => add.id !== defaultAddress.id
      );
      setAddresses([defaultAddress, ...reorderedAddresses]);
    }
  }, [defaultAddress, open]);

  // Fetch custom field definitions (and optionally values for an address) once per open
  useEffect(() => {
    if (open && !customFieldsFetchedRef.current) {
      customFieldsFetchedRef.current = true;
      fetchCustomFields(defaultAddress?.id || "");
    }
    if (!open) {
      customFieldsFetchedRef.current = false;
    }
  }, [open]);

  const fetchCustomFields = async (addressId) => {
    setCustomFieldsLoading(true);
    try {
      const response = await GetAddressCustomFieldsApi({ address_id: addressId });
      if (response?.error === false) {
        const fields = (response?.data?.custom_fields || []).filter(
          (f) => f.visible
        );
        setCustomFields(fields);
        applyStoredCustomFieldValues(response?.data?.customer_address_custom_fields || []);
      }
    } catch (error) {
      console.error("Error fetching address custom fields:", error);
    } finally {
      setCustomFieldsLoading(false);
    }
  };

  const fetchCustomFieldValues = async (addressId) => {
    try {
      const response = await GetAddressCustomFieldsApi({ address_id: addressId });
      if (response?.error === false) {
        applyStoredCustomFieldValues(response?.data?.customer_address_custom_fields || []);
      }
    } catch (error) {
      console.error("Error fetching custom field values:", error);
    }
  };

  const applyStoredCustomFieldValues = (storedValues) => {
    const valuesMap = {};
    storedValues.forEach((item) => {
      valuesMap[item.custom_field_id] = item.value;
    });
    setCustomFieldValues(valuesMap);
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const [formValues, setFormValues] = useState({
    id: defaultAddress?.id ? defaultAddress?.id : "",
    mobile: defaultAddress?.mobile ? defaultAddress?.mobile : userData?.phone ? userData?.phone : "",
    type: defaultAddress?.type ? defaultAddress?.type : "",
    is_default: defaultAddress?.is_default === "1" ? true : false,
  });


  const [mapCoordinates, setMapCoordinates] = useState({
    lat: defaultAddress?.lattitude ? Number(defaultAddress?.lattitude) : "",
    lng: defaultAddress?.longitude ? Number(defaultAddress?.longitude) : "",
  });

  useEffect(() => {
    if (defaultAddress) {
      setFormValues({
        id: defaultAddress.id || "",
        mobile: defaultAddress.mobile || userData?.phone || "",
        type: defaultAddress.type || "",
        is_default: defaultAddress.is_default === "1",
      });

      setMapCoordinates({
        lat: defaultAddress.lattitude ? Number(defaultAddress.lattitude) : "",
        lng: defaultAddress.longitude ? Number(defaultAddress.longitude) : "",
      });
    }
  }, [defaultAddress]);

  const handleSelectAddress = async (address) => {
    const validLat = Number(address?.lattitude);
    const validLng = Number(address?.longitude);

    if (isNaN(validLat) || isNaN(validLng)) {
      toast.error(t("invalidCoordinates"));
      return;
    }

    setActiveAddress(address);
    setIsClicked(false);

    const selectedAddress = addresses.find((add) => add.id === address?.id);

    if (selectedAddress) {
      setFormValues({
        id: selectedAddress.id || "",
        mobile: selectedAddress.mobile || userData?.phone || "",
        type: selectedAddress.type || "",
        is_default: selectedAddress.is_default === "1",
      });

      setMapCoordinates({ lat: validLat, lng: validLng });

      // Fetch custom field values for this address
      if (selectedAddress.id) {
        await fetchCustomFieldValues(selectedAddress.id);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormValues((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (type) => {
    setFormValues((prev) => ({ ...prev, type }));
  };

  const handleSetDefaultAddress = () => {
    setFormValues((prev) => ({ ...prev, is_default: !prev.is_default }));
  };

  const onLocationChange = (newAddresses) => {
    setMapCoordinates({ lat: newAddresses.lat, lng: newAddresses.lng });
  };

  const clearForm = () => {
    setFormValues({
      id: "",
      mobile: userData?.phone ? userData?.phone : "",
      type: "",
      is_default: false,
    });
    setMapCoordinates({ lat: "", lng: "" });
    setCustomFieldValues({});
  };

  const handleButtonClick = () => {
    setIsClicked((prevState) => !prevState);
    setActiveAddress(null);
    clearForm();
    setMapCoordinates({ lat: "", lng: "" });
  };

  const validateRequiredCustomFields = () => {
    for (const field of customFields) {
      if (!!field.required && !customFieldValues[field.id]) {
        toast.error(`${t("pleaseEnter")} ${field.translated_label}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveAddress = async () => {
    if (!formValues.type) {
      toast.error(t("pleaseSelectAddressType"));
      return;
    }
    if (!formValues.mobile) {
      toast.error(t("pleaseEnterMobileNumber"));
      return;
    }
    if (!validateRequiredCustomFields()) return;

    const newAddress = {
      id: formValues.id || "",
      type: formValues.type,
      mobile: formValues.mobile,
      lattitude: mapCoordinates.lat,
      longitude: mapCoordinates.lng,
      is_default: formValues.is_default ? "1" : "0",
    };

    // Build custom_fields array for API
    const customFieldsPayload = customFields
      .map((f) => ({
        custom_field_id: f.id,
        value: customFieldValues[f.id] || "",
      }))
      .filter((f) => f.value !== "");

    setIsLoading(true);

    try {
      const response = await AddAddressApi({
        id: newAddress.id,
        type: newAddress.type,
        mobile: newAddress.mobile,
        lattitude: newAddress.lattitude,
        longitude: newAddress.longitude,
        is_default: newAddress.is_default,
        custom_fields: customFieldsPayload.length > 0
          ? JSON.stringify(customFieldsPayload)
          : "",
      });

      if (response?.error === false) {
        const updatedAddress = response?.data;

        onUpdateAddress(updatedAddress);
        setAddresses((prevAddresses) => {
          const existingAddress = prevAddresses.find(
            (addr) => addr.id === updatedAddress.id
          );
          if (existingAddress) {
            return [
              updatedAddress,
              ...prevAddresses.filter((addr) => addr.id !== updatedAddress.id),
            ];
          } else {
            return [updatedAddress, ...prevAddresses];
          }
        });

        setDefaultAddress(updatedAddress);

        dispatch(
          setDilveryDetails({
            ...dilveryDetails,
            dilevryLocation: updatedAddress,
          })
        );

        logClarityEvent(AUTH_EVENTS.ADDRESS_ADDED, {
          address_id: updatedAddress?.id,
          is_default: updatedAddress?.is_default === "1",
          has_coordinates: Boolean(
            updatedAddress?.lattitude && updatedAddress?.longitude
          ),
        });

        setIsLoading(false);
        handleClose();
        toast.success(response?.message);
      }
    } catch (error) {
      toast.error(error?.message);
      console.log(error);
      setIsLoading(false);
    }
  };

  const breakpoints = {
    320: { slidesPerView: 1.2 },
    576: { slidesPerView: 1.5 },
    992: { slidesPerView: 2 },
    1200: { slidesPerView: 2.2 },
  };

  // Custom fields to render: exclude file type fields for now; sort by sort_order
  const visibleCustomFields = customFields
    .filter((f) => f.field_type !== "file")
    .sort((a, b) => a.sort_order - b.sort_order);

  // Form is valid only when all required fields are filled
  const isFormValid =
    !!formValues.type &&
    !!formValues.mobile &&
    customFields.every(
      (f) => !f.required || !!customFieldValues[f.id]
    );

  return (
    <Drawer open={open} onClose={handleClose} closeOnClickOutside={false}>
      <DrawerContent
        className={cn(
          "max-w-full md:max-w-[90%] lg:max-w-[85%] xl:max-w-7xl mx-auto rounded-tr-[18px] rounded-tl-[18px]",
          "transition-all duration-300",
          "after:!content-none",
          "!h-auto"
        )}
      >
        <div className="address w-full flex flex-col lg:flex-row gap-6 py-4 px-4 md:p-6 lg:p-8 xl:p-10">
          {/* Left side: Map */}
          <div className="w-full lg:w-1/2">
            <div className="schedule_cal w-full">
              <div className="w-full rounded-lg overflow-hidden h-[300px] md:h-[350px] lg:h-[650px]">
                {isLoaded ? (
                  <>
                    <AddressMap
                      isClicked={true}
                      latitude={mapCoordinates?.lat}
                      longitude={mapCoordinates?.lng}
                      isLoaded={isLoaded}
                      loadError={loadError}
                      onLocationChange={onLocationChange}
                    />
                  </>
                ) : (
                  <p>Loading Map...</p>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Address fields */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4 md:gap-5 max-h-[80vh] lg:max-h-[650px]">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl md:text-2xl font-bold">
                {isClicked ? t("addNewAddress") : t("selectAddress")}
              </h2>
              <button
                onClick={handleButtonClick}
                className="flex items-center gap-2 light_bg_color primary_text_color px-3 py-1 md:px-4 md:py-1 rounded-lg text-sm md:text-base font-normal"
              >
                <span>{t("addAddress")}</span>
                <span
                  className={`transition-transform duration-300 ${isClicked ? "rotate-45" : "rotate-0"
                    }`}
                >
                  <BsPlusLg size={18} />
                </span>
              </button>
            </div>
            {addresses && addresses.length > 0 &&
              <div className="address_div w-full">
                <Swiper
                  spaceBetween={10}
                  slidesPerView="auto"
                  modules={[FreeMode]}
                  freeMode={true}
                  key={isRTL}
                  dir={isRTL ? "rtl" : "ltr"}
                  className="!pb-2"
                >
                  {addresses.map((address) => (
                    <SwiperSlide
                      key={address.id}
                      className="!w-auto !h-auto min-w-[180px] max-w-[250px]"
                    >
                      <div
                        onClick={() => handleSelectAddress(address)}
                        className={`h-full p-3 border ${activeAddress?.id === address.id ? "border_color" : ""
                          } flex flex-col gap-2 items-start rounded-xl cursor-pointer`}
                      >
                        <div
                          className={`text-sm md:text-base flex items-center justify-between ${activeAddress?.id === address.id
                              ? "primary_text_color"
                              : "description_color"
                            } w-full`}
                        >
                          <span>{address.type}</span>
                          {activeAddress?.id === address.id && (
                            <IoCheckmark size={16} />
                          )}
                        </div>
                        <div className="text-base font-medium line-clamp-1">
                          {address.city_name || address.city}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            }

            {/* Scrollable fields */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0">

              {/* Mobile */}
              <FormField label={t("mobile")} required>
                <input
                  name="mobile"
                  type="text"
                  value={formValues.mobile}
                  onChange={handleInputChange}
                  placeholder={`${t("enter")} ${t("mobile")}`}
                  className={inputBase}
                />
              </FormField>

              {/* Dynamic custom fields */}
              {customFieldsLoading ? (
                <>
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <FieldSkeleton />
                </>
              ) : (
                visibleCustomFields.map((field) => (
                  <FormField
                    key={field.id}
                    label={field.translated_label}
                    required={!!field.required}
                  >
                    <input
                      type="text"
                      value={customFieldValues[field.id] || ""}
                      onChange={(e) =>
                        handleCustomFieldChange(field.id, e.target.value)
                      }
                      placeholder={`${t("enter")} ${field.translated_label}`}
                      className={inputBase}
                    />
                  </FormField>
                ))
              )}

              {/* Address Type */}
              <FormField label={t("addressType")} required>
                <div className="flex items-center gap-2 flex-wrap">
                  {addressTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type)}
                      className={`py-2 px-4 border rounded-lg transition-all text-sm font-medium ${formValues.type === type
                          ? "light_bg_color primary_text_color border_color"
                          : "background_color description_color"
                        }`}
                    >
                      {t(type)}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Set as default — toggle card */}
              <label
                htmlFor="setDefaultAddress"
                className={`flex items-center justify-between cursor-pointer px-4 py-3 border rounded-xl transition-all duration-300 ${formValues.is_default
                    ? "light_bg_color border_color"
                    : "background_color"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`transition-colors duration-300 ${formValues.is_default ? "primary_text_color" : "description_color"}`}>
                    {formValues.is_default
                      ? <IoStar size={18} />
                      : <IoStarOutline size={18} />
                    }
                  </span>
                  <span className={`text-sm font-medium transition-colors duration-300 ${formValues.is_default ? "primary_text_color" : ""}`}>
                    {t("setDefaultAddress")}
                  </span>
                </div>
                {/* Toggle switch */}
                <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-300 flex-shrink-0 ${formValues.is_default ? "primary_bg_color" : "bg-gray-200"
                  }`}>
                  <div className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-300 ${formValues.is_default ? "translate-x-[20px]" : "translate-x-[2px]"
                    }`} />
                </div>
                <input
                  type="checkbox"
                  id="setDefaultAddress"
                  checked={formValues.is_default}
                  onChange={handleSetDefaultAddress}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Sticky submit button */}
            <div className="flex-shrink-0 pt-3 border-t flex items-center gap-3">
              {/* Clear button */}
              <button
                onClick={clearForm}
                className="px-5 py-3 border rounded-xl text-sm font-medium description_color background_color transition-all duration-200 hover:border_color hover:primary_text_color flex-shrink-0"
              >
                {t("clear") || "Clear"}
              </button>

              {/* Continue button */}
              {isLoading ? (
                <button className="primary_bg_color primary_text_color py-3 px-8 rounded-xl flex-1 flex items-center justify-center">
                  <MiniLoader />
                </button>
              ) : (
                <button
                  onClick={handleSaveAddress}
                  disabled={!isFormValid}
                  className={`flex-1 p-3 rounded-xl text-sm md:text-base font-medium text-white transition-all duration-200 ${isFormValid
                      ? "primary_bg_color cursor-pointer"
                      : "bg-gray-300 cursor-not-allowed opacity-60"
                    }`}
                >
                  {t("continue")}
                </button>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddressDrawer;
