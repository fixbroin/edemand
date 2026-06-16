"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectTotalItems, selectCartTotalPrice } from '@/redux/reducers/cartSlice';
import { showPrice } from '@/utils/Helper';
import { useTranslation } from '../Layout/TranslationContext';
import { FaShoppingCart } from 'react-icons/fa';

const StickyCartContinueButton = () => {
  const [isMounted, setIsMounted] = useState(false);
  const totalItems = useSelector(selectTotalItems);
  const totalPrice = useSelector(selectCartTotalPrice);
  const t = useTranslation();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || totalItems === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full px-1 py-1 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between w-full max-w-screen-xl mx-auto container">
        <div className="flex flex-col">
          <span className="font-bold text-xl text_color leading-none">
            {showPrice(totalPrice)}
          </span>
          <span className="text-xs sm:text-sm font-medium description_color mt-1">
            {totalItems} {totalItems === 1 ? t("item") || "item" : t("items") || "items"}
          </span>
        </div>
        <Link href="/cart" passHref className="w-[55%] sm:w-auto min-w-[140px]">
          <button className="w-full primary_bg_color text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
            <FaShoppingCart size={18} />
            <span>{t("continue") || "Continue"}</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default StickyCartContinueButton;