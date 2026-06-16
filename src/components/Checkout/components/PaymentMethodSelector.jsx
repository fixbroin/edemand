"use client";
import CustomImageTag from "@/components/ReUseableComponents/CustomImageTag";
import RadioIndicator from "./RadioIndicator";
import { MdCreditCard } from "react-icons/md";

const PaymentMethodSelector = ({
    enabledMethods,
    onlineCount,
    paymentOption,
    icons,
    cardIcon,
    codIcon,
    onSelect,
    t,
    noMethodsLabel,
}) => {
    return (
        <div className="mb-6 rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Header */}
            <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <MdCreditCard className="w-5 h-5 primary_text_color" />
                    <h3 className="text-lg font-semibold text_color">{t("selectPaymentOption")}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {enabledMethods.length === 0 ? (
                    <div className="text-red-500 text-center py-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                        {noMethodsLabel}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {enabledMethods.map((method) => {
                            const isCod = method.methodType === "cod";
                            const isSingleOnline = !isCod && onlineCount === 1;
                            const icon = isSingleOnline
                                ? cardIcon
                                : icons[method.methodIcon] ?? codIcon;
                            const label = isCod
                                ? method.method
                                : isSingleOnline
                                    ? t("payNow")
                                    : method.method;
                            const isSelected = paymentOption === method.methodType;

                            return (
                                <button
                                    key={method.methodType}
                                    onClick={() => onSelect(method)}
                                    className={`flex items-center justify-between gap-3 px-4 py-4 border rounded-[12px] w-full transition-all duration-300 ease-in-out ${isSelected 
                                        ? "border-primary primary_bg_color/5 ring-1 ring-primary" 
                                        : "border-gray-200 dark:border-gray-800 hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                            <CustomImageTag
                                                src={icon}
                                                alt={method.method}
                                                className="w-full h-full object-contain p-1"
                                                imgClassName="object-contain"
                                            />
                                        </div>
                                        <span className={`font-medium ${isSelected ? "primary_text_color font-bold" : "text_color"}`}>
                                            {label}
                                        </span>
                                    </div>
                                    <RadioIndicator selected={isSelected} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentMethodSelector;
