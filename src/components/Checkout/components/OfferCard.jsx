import CustomImageTag from "@/components/ReUseableComponents/CustomImageTag";
import { useTranslation } from "@/components/Layout/TranslationContext";

const MONTH_KEYS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

const OfferCard = ({ offer, actionLabel, onAction }) => {
    const t = useTranslation();

    const formatDate = (date) => {
        // API returns dates in DD-MM-YYYY format
        const [day, month, year] = date.split("-");
        const monthName = t(MONTH_KEYS[parseInt(month, 10) - 1]);
        return `${parseInt(day, 10)} ${monthName} ${year}`;
    };

    return (
        <div className="border border_color rounded-xl flex items-center justify-between gap-3 px-2 py-3 my-6">
            <div className="flex items-center gap-3 w-10/12">
                <div className="relative aspect-square w-16 flex-shrink-0">
                    <CustomImageTag
                        src={offer?.image}
                        alt={offer?.promo_code}
                        className="w-full h-full rounded-md"
                        imgClassName="rounded-md"
                    />
                </div>
                <div className="flex flex-col items-start justify-between mb-2">
                    <h3 className="primary_color font-bold text-lg">{offer?.promo_code}</h3>
                    <p className="description_color text-sm line-clamp-2">{offer?.message}</p>
                    {offer?.start_date && offer?.end_date && (
                        <p className="description_color text-xs mt-1">
                            {t("offerValidFromTo")} {formatDate(offer.start_date)} {t("to")} {formatDate(offer.end_date)}
                        </p>
                    )}
                </div>
            </div>
            <div className="transition-all duration-150">
                <button
                    onClick={onAction}
                    className="light_bg_color primary_text_color text-base font-normal px-4 py-1 rounded-md dark:bg-white"
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
};

export default OfferCard;
