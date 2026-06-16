"use client";
import { FaChevronRight, FaPercentage } from "react-icons/fa";
import { MdLocalOffer } from "react-icons/md";
import { useTranslation } from "@/components/Layout/TranslationContext";
import OfferCard from "./OfferCard";

/**
 * OffersSection
 * Renders the promo/coupon area in the summary sidebar:
 *  - Applied coupon card with Remove action
 *  - "Save Big with N more offers" bar (opens modal)
 *  - Single offer card with Apply action
 * Hidden entirely when `isCustomJob` is true or there are no offers.
 */
const OffersSection = ({
    isCustomJob,
    offers,
    appliedCoupon,
    hasAppliedCoupon,
    onOpenOffersModal,
    onApply,
    onRemove,
}) => {
    const t = useTranslation();

    if (isCustomJob || offers.length === 0) return null;

    return (
        <div className="mb-6 rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Header */}
            <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <MdLocalOffer className="w-5 h-5 primary_text_color" />
                    <h3 className="text-lg font-semibold text_color">{t("offers") || "Offers"}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {hasAppliedCoupon ? (
                    <OfferCard
                        offer={appliedCoupon}
                        actionLabel={t("remove")}
                        onAction={onRemove}
                    />
                ) : offers.length > 1 ? (
                    <div
                        className="flex items-center justify-between bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/20 p-4 rounded-[12px] cursor-pointer hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                        onClick={onOpenOffersModal}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-500/20 p-2 rounded-full">
                                <FaPercentage size={16} />
                            </div>
                            <span className="font-semibold text-sm sm:text-base">
                                {t("saveBigwith")} {offers.length} {t("moreOffers")}
                            </span>
                        </div>
                        <span className="font-bold rtl:rotate-180">
                            <FaChevronRight size={18} />
                        </span>
                    </div>
                ) : (
                    <OfferCard
                        offer={offers[0]}
                        actionLabel={t("apply")}
                        onAction={() => onApply(offers[0])}
                    />
                )}
            </div>
        </div>
    );
};

export default OffersSection;
