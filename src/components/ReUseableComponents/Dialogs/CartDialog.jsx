import React from "react";
import { FaShoppingCart } from "react-icons/fa";
import { useSelector } from "react-redux";
import {
  selectTotalItems,
} from "@/redux/reducers/cartSlice";
import { useRTL } from "@/utils/Helper";
import CustomLink from "../CustomLink";

const CartDropdown = () => {
  const isRtl = useRTL();
  const totalItems = useSelector(selectTotalItems);

  return (
    <CustomLink href="/cart">
      <div
        className="text-white primary_bg_color h-[36px] w-[36px] rounded-[8px] p-2 flex items-center justify-center relative cursor-pointer"
      >
        <FaShoppingCart
          size={18}
          className={`${isRtl ? "transform scale-x-[-1]" : ""}`}
        />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {totalItems}
          </span>
        )}
      </div>
    </CustomLink>
  );
};

export default CartDropdown;
