"use client";
import { useIsDarkMode, useRTL } from "@/utils/Helper";
import React from "react";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { useTranslation } from "../Layout/TranslationContext";
import { cn } from "@/lib/utils";

const HomeCategoryCard = ({ data, handleRouteCategory, index = 0 }) => {
  const t = useTranslation();
  const isRTL = useRTL();
  const darkMode = useIsDarkMode();

  const hasProviders = Number(data?.total_providers || 0) > 0;
  const hasSubCategories = data?.has_children === true || Number(data?.children_count || 0) > 0;
  const isComingSoon = !hasProviders && !hasSubCategories;

  const translatedName = data?.translated_name ? data?.translated_name : data?.name;

  // Dynamic gradient based on index for variety
  const gradients = [
    "from-blue-500/20 to-teal-400/20 group-hover:from-blue-500/40 group-hover:to-teal-400/40",
    "from-purple-500/20 to-pink-400/20 group-hover:from-purple-500/40 group-hover:to-pink-400/40",
    "from-amber-500/20 to-orange-400/20 group-hover:from-amber-500/40 group-hover:to-orange-400/40",
    "from-emerald-500/20 to-cyan-400/20 group-hover:from-emerald-500/40 group-hover:to-cyan-400/40",
    "from-rose-500/20 to-indigo-400/20 group-hover:from-rose-500/40 group-hover:to-indigo-400/40"
  ];
  const activeGradient = gradients[index % gradients.length];

  return (
    <div
      className={cn(
        "flex flex-col items-center group transition-all duration-500",
        isComingSoon ? "cursor-not-allowed grayscale opacity-70" : "cursor-pointer"
      )}
      onClick={() => { if (!isComingSoon) handleRouteCategory(data); }}
    >
      {/* Large Circular Container */}
      <div className="relative mb-4">
          {/* Outer Ambient Glow */}
          <div className={cn(
              "absolute inset-[-10px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl",
              "bg-gradient-to-tr", activeGradient
          )} />
          
          <div className={cn(
            "relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500",
            "card_bg border-2 border-border/40 shadow-lg group-hover:shadow-2xl group-hover:border_color group-hover:-translate-y-2",
            "before:absolute before:inset-0 before:bg-gradient-to-tr before:opacity-10 group-hover:before:opacity-20 before:transition-opacity",
            activeGradient
          )}>
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 z-10">
                <CustomImageTag
                    src={data?.category_image}
                    alt={translatedName}
                    className="w-full h-full object-contain transition-all duration-700 group-hover:scale-110 drop-shadow-xl"
                    imgClassName="object-contain"
                />
            </div>
            
            {/* Glossy Overlay Reflection */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/25 to-transparent rotate-45 group-hover:translate-x-[15%] group-hover:translate-y-[15%] transition-transform duration-1000" />
          </div>
      </div>

      {/* Category Name */}
      <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground text-center line-clamp-2 leading-tight px-2 group-hover:primary_text_color transition-all duration-300 transform group-hover:scale-105 tracking-tight max-w-[120px] sm:max-w-[140px] md:max-w-[160px]">
        {translatedName}
        {isComingSoon && (
          <span className="block text-[10px] md:text-xs font-normal description_color mt-1">
            ({t("comingSoon")})
          </span>
        )}
      </h3>
    </div>
  );
};

export default HomeCategoryCard;
