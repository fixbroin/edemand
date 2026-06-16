import { BsHouse } from "react-icons/bs";
import { IoStorefrontOutline } from "react-icons/io5";
import { useTranslation } from "@/components/Layout/TranslationContext";
import RadioIndicator from "./RadioIndicator";
import { LuWrench } from "react-icons/lu";

const ServiceTypeSelector = ({ availableOnHome, availableOnStore, serviceType, onSelect }) => {
    const t = useTranslation();

    return (
        <div className="mb-6 rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Header */}
            <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <LuWrench className="w-5 h-5 primary_text_color" />
                    <h3 className="text-lg font-semibold text_color">{t("servicePerformAt")}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex flex-wrap sm:flex-nowrap w-full gap-3">
                    {availableOnHome && (
                        <button
                            onClick={() => onSelect("home")}
                            disabled={serviceType === "home"}
                            className={`flex items-center justify-between m-0 px-4 py-4 border rounded-[12px] w-full transition-all duration-300 ease-in-out ${serviceType === "home" 
                                ? "border-primary primary_bg_color/5 ring-1 ring-primary" 
                                : "border-gray-200 dark:border-gray-800 hover:border-primary/50"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${serviceType === "home" ? "primary_bg_color text-white" : "bg-gray-100 dark:bg-white/10 description_color"}`}>
                                    <BsHouse size={20} />
                                </div>
                                <span className={`font-medium ${serviceType === "home" ? "primary_text_color font-bold" : "text_color"}`}>
                                    {t("atDoorstep")}
                                </span>
                            </div>
                            <RadioIndicator selected={serviceType === "home"} />
                        </button>
                    )}

                    {availableOnStore && (
                        <button
                            onClick={() => onSelect("store")}
                            disabled={serviceType === "store"}
                            className={`flex items-center justify-between m-0 px-4 py-4 border rounded-[12px] w-full transition-all duration-300 ease-in-out ${serviceType === "store" 
                                ? "border-primary primary_bg_color/5 ring-1 ring-primary" 
                                : "border-gray-200 dark:border-gray-800 hover:border-primary/50"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${serviceType === "store" ? "primary_bg_color text-white" : "bg-gray-100 dark:bg-white/10 description_color"}`}>
                                    <IoStorefrontOutline size={20} />
                                </div>
                                <span className={`font-medium ${serviceType === "store" ? "primary_text_color font-bold" : "text_color"}`}>
                                    {t("atStore")}
                                </span>
                            </div>
                            <RadioIndicator selected={serviceType === "store"} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceTypeSelector;
