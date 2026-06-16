import React, { useState, useEffect } from "react";
import CommanHeadline from "../ReUseableComponents/CommanHeadline";
import HomeCategoryCard from "../Cards/HomeCategoryCard";
import { useDispatch } from "react-redux";
import {
  addCategory,
  clearCategories,
} from "../../redux/reducers/multiCategoriesSlice";
import { useRouter } from "next/router";
import { useTranslation } from "../Layout/TranslationContext";
import { useRTL } from "@/utils/Helper";
import { logClarityEvent } from "@/utils/clarityEvents";
import { HOME_EVENTS } from "@/constants/clarityEventNames";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const getItemsLimit = (width) => {
  if (width < 640) return 5; // Mobile
  if (width < 1024) return 7; // Tablet
  return 11; // Desktop
};

const HomeCategories = ({ categoriesData }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useTranslation();
  const isRTL = useRTL();

  const [showAll, setShowAll] = useState(false);
  const [itemsLimit, setItemsLimit] = useState(11);

  useEffect(() => {
    const updateLimit = () => {
      setItemsLimit(getItemsLimit(window.innerWidth));
    };
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  const handleRouteCategory = (categorySlug) => {
    dispatch(clearCategories());
    dispatch(addCategory(categorySlug));
    logClarityEvent(HOME_EVENTS.HOME_CATEGORY_SHORTCUT_TAPPED, {
      category_slug: categorySlug?.slug,
    });
    router.push(`/service/${categorySlug.slug}`);
  };

  const displayedCategories = showAll ? categoriesData : categoriesData.slice(0, itemsLimit);

  return (
    <div className="categories light_bg_color pt-8 pb-12 homeCategories">
      <div className="container mx-auto px-4 md:px-8">
        <CommanHeadline
          headline={t("chooseYourService")}
          subHeadline={t("discoverServices")}
          link={"/services"}
        />

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-10 gap-x-4 md:gap-x-6 lg:gap-x-8 mt-8">
          {displayedCategories.map((category, index) => (
            <HomeCategoryCard
              key={index}
              index={index}
              data={category}
              handleRouteCategory={handleRouteCategory}
            />
          ))}

          {/* More/Less Toggles */}
          {categoriesData.length > itemsLimit && (
            <div 
              className="flex flex-col items-center group cursor-pointer transition-all duration-500"
              onClick={() => setShowAll(!showAll)}
            >
              <div className="relative mb-4">
                  <div className={cn(
                      "absolute inset-[-10px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl",
                      showAll ? "bg-gradient-to-tr from-red-500/30 to-rose-400/30" : "bg-gradient-to-tr from-primary/30 to-teal-400/30"
                  )} />
                  <div className={cn(
                    "relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500",
                    "card_bg border-2 border-border/40 shadow-lg group-hover:shadow-2xl group-hover:-translate-y-2",
                    showAll ? "group-hover:border-red-500/60" : "group-hover:border_color"
                  )}>
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-tr opacity-10 group-hover:opacity-20 transition-opacity",
                      showAll ? "from-red-500 to-rose-400" : "from-primary to-teal-400"
                    )} />
                    
                    {showAll ? (
                      <ArrowUp className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 text-red-500 group-hover:scale-110 transition-transform relative z-10" />
                    ) : (
                      <ArrowDown className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 primary_text_color group-hover:scale-110 transition-transform relative z-10" />
                    )}

                    {/* Glossy Overlay Reflection */}
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/25 to-transparent rotate-45 group-hover:translate-x-[15%] group-hover:translate-y-[15%] transition-transform duration-1000" />
                  </div>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground text-center group-hover:primary_text_color transition-all duration-300 transform group-hover:scale-105 tracking-tight">
                {showAll ? t("less") : t("more")}
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeCategories;
