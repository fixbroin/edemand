import { FaLocationDot, FaCirclePlus } from "react-icons/fa6";
import { FiAlertTriangle } from "react-icons/fi";
import { useTranslation } from "@/components/Layout/TranslationContext";

const AddressSection = ({ defaultAddress, addresses, onOpenDrawer }) => {
    const t = useTranslation();

    return (
        <div className="mb-6 rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Header */}
            <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <FaLocationDot className="w-5 h-5 primary_text_color" />
                    <h3 className="text-lg font-semibold text_color">{t("address")}</h3>
                </div>
                <button 
                    onClick={onOpenDrawer} 
                    className="text-sm font-bold primary_text_color hover:opacity-80 transition-opacity"
                >
                    {defaultAddress && addresses.length > 0 ? t("change") || "Change" : t("select") || "Select"}
                </button>
            </div>

            {/* Content */}
            <div className="p-5">
                {defaultAddress && addresses.length > 0 ? (
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full flex-shrink-0 mt-1">
                            <FaLocationDot className="w-5 h-5 primary_text_color" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-base text_color">
                                    {defaultAddress?.type || t("home")}
                                </span>
                                {defaultAddress?.mobile && (
                                    <span className="text-sm description_color ml-2">
                                        • {defaultAddress.mobile}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm description_color leading-relaxed line-clamp-2">
                                {defaultAddress?.address}, {defaultAddress?.area}, {defaultAddress?.city_name || defaultAddress?.city}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div 
                        className="flex flex-col items-center justify-center py-6 text-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 rounded-xl transition-colors" 
                        onClick={onOpenDrawer}
                    >
                        <FiAlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
                        <p className="font-semibold text-base text_color mb-1">No address selected</p>
                        <p className="text-sm description_color">Click to provide service location</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddressSection;
