import React, { useEffect, useState } from "react";
import {
  FaClock,
  FaUserFriends,
  FaPlus,
  FaMinus,
  FaTrash,
} from "react-icons/fa";
import { MdOutlineDelete } from "react-icons/md";
import { useIsLogin, showPrice } from "@/utils/Helper";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { buildLanguageAwareKey } from "@/lib/react-query-client";
import { ManageCartApi, removeCartApi } from "@/api/apiRoutes";
import {
  currentCartProvider,
  removeFromCart,
  removeItemFromCart,
  setCartData,
  selectCartProvider,
  setTaxValue,
} from "@/redux/reducers/cartSlice";
import { toast } from "sonner";
import { useTranslation } from "../Layout/TranslationContext";
import { logClarityEvent } from "@/utils/clarityEvents";
import { CART_EVENTS } from "@/constants/clarityEventNames";
import { openLoginModal } from "@/redux/reducers/helperSlice";

const CartItemCard = ({ data }) => {
  const t = useTranslation();
  const isLoggedIn = useIsLogin(); // Reactive hook - automatically updates when login state changes
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  // Access total item count using the selector
  // Get initial quantities from Redux
  const cart = useSelector((state) => state.cart.items);
  const [qty, setQuantities] = useState({});
  const [animationClass, setAnimationClasses] = useState({});

  // Sync state with Redux on component mount
  useEffect(() => {
    const initialQuantities = {};
    cart.forEach((item) => {
      initialQuantities[item.id] = item.qty;
    });
    setQuantities(initialQuantities);
  }, [cart]);

  const handleAddQuantity = async (id) => {
    try {
      const currentQuantity = parseInt(qty[id], 10); // Get the current quantity of the item

      // Check if the current quantity is greater than the maximum allowed
      if (currentQuantity >= data?.max_quantity_allowed) {
        toast.error(t("maxQtyReached"));
        return; // Prevent further actions if the max quantity is exceeded
      }

      const newQuantity = currentQuantity + 1; // Increment quantity by 1

      // If max quantity is not exceeded, proceed with the API call
      const response = await ManageCartApi({
        id,
        qty: newQuantity,
      });

      if (response.error === false) {
        setAnimationClasses((prev) => ({ ...prev, [id]: "slide-in" }));
        setQuantities((prevQuantities) => ({
          ...prevQuantities,
          [id]: newQuantity, // Update quantity with new value
        }));

        const cartData = response;

        const structuredCartItems = cartData?.data.map((item) => ({
          ...item,
          ...item.servic_details, // Spread service_data into the parent object
        }));
        // Ensure that the response has both provider_id and data
        dispatch(
          setCartData({
            provider: cartData, // Assuming provider_id exists in the response
            items: structuredCartItems || [], // Assuming 'data' contains the cart items
          })
        );
        dispatch(setTaxValue(cartData?.tax_value));
        // dispatch(updateQuantity({ itemId: id, qty: newQuantity }));

        // Invalidate cart cache to sync with header
        queryClient.invalidateQueries({
          queryKey: buildLanguageAwareKey(['cart'])
        });

        toast.success(t("serviceUpdatedSuccessFullyToCart"));
        logClarityEvent(CART_EVENTS.CART_ITEM_ADDED, {
          service_id: id,
          provider_id: cartData?.provider_id || data?.provider_id,
          quantity: newQuantity,
          entrypoint: "cart_card_increment",
        });

        setTimeout(() => {
          setAnimationClasses((prev) => ({ ...prev, [id]: "" }));
        }, 300);
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error while adding quantity:", error);
      toast.error("Failed to add quantity");
    }
  };
  const handleRemoveQuantity = async (id) => {
    try {
      const currentQty = qty[id] || 0;
      if (currentQty > 1) {
        const response = await ManageCartApi({ id, qty: currentQty - 1 });

        if (response.error === false) {
          setAnimationClasses((prev) => ({ ...prev, [id]: "slide-out" }));
          setQuantities((prevQuantities) => ({
            ...prevQuantities,
            [id]: currentQty - 1,
          }));
          const cartData = response;

          const structuredCartItems = cartData?.data.map((item) => ({
            ...item,
            ...item.servic_details, // Spread service_data into the parent object
          }));
          // Ensure that the response has both provider_id and data

          dispatch(
            setCartData({
              provider: cartData, // Assuming provider_id exists in the response
              items: structuredCartItems || [], // Assuming 'data' contains the cart items
            })
          );

          dispatch(setTaxValue(cartData?.tax_value));

          // Invalidate cart cache to sync with header
          queryClient.invalidateQueries({
            queryKey: buildLanguageAwareKey(['cart'])
          });

          toast.success(t("serviceUpdatedSuccessFullyToCart"));
          logClarityEvent(CART_EVENTS.CART_ITEM_REMOVED, {
            service_id: id,
            provider_id: cartData?.provider_id || data?.provider_id,
            quantity: currentQty - 1,
            entrypoint: "cart_card_decrement",
          });
          setTimeout(() => {
            setAnimationClasses((prev) => ({ ...prev, [id]: "" }));
          }, 300);
        }
      }
    } catch (error) {
      console.error("Error while removing quantity:", error);
      toast.error("Failed to update cart.");
    }
  };

  const handleRemoveItemFromCart = async (id) => {
    try {
      // Remove the item completely from the cart
      const response = await removeCartApi({ itemId: id });
      if (response?.error === false) {

        // Update Redux with the full cart data from API response
        const cartData = response?.data;

        // If there are remaining items in the cart, update with structured data
        if (cartData && Array.isArray(cartData) && cartData.length > 0) {
          const structuredCartItems = cartData.map((item) => ({
            ...item,
            ...item.servic_details,
          }));

          dispatch(
            setCartData({
              provider: response, // Full response contains provider data
              items: structuredCartItems,
            })
          );
        } else {
          // If cart is empty, just remove the item
          dispatch(removeItemFromCart(id));
        }

        dispatch(setTaxValue(response?.tax_value));

        // Invalidate cart cache to sync with header
        queryClient.invalidateQueries({
          queryKey: buildLanguageAwareKey(['cart'])
        });

        toast.success(response?.message);
        logClarityEvent(CART_EVENTS.CART_ITEM_REMOVED, {
          service_id: id,
          provider_id: data?.provider_id,
          quantity: 0,
          entrypoint: "cart_card_remove_all",
        });
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error while removing item from cart:", error);
      toast.error("Failed to remove item from cart.");
    }
  };

  const handleRemoveItem = async (id) => {
    try {
      const currentQty = Number(qty[id]);

      if (currentQty === 1) {
        const response = await removeCartApi({ itemId: id });

        if (response.error === false) {
          const updatedQuantities = { ...qty };
          delete updatedQuantities[id];
          setQuantities(updatedQuantities);
          dispatch(removeFromCart(id));

          // Invalidate cart cache to sync with header
          queryClient.invalidateQueries({
            queryKey: buildLanguageAwareKey(['cart'])
          });

          toast.success(t("serviceRemovedSuccessFullyFromCart"));
          logClarityEvent(CART_EVENTS.CART_ITEM_REMOVED, {
            service_id: id,
            provider_id: data?.provider_id,
            quantity: 0,
            entrypoint: "cart_card_remove_single",
          });
        } else {
          toast.error(response?.message);
        }
      }
    } catch (error) {
      console.error("Error while removing quantity:", error);
      toast.error("Failed to update cart.");
    }
  };

  const handleAddToCart = async (e, data) => {
    e.preventDefault();

    if (!isLoggedIn) {
      dispatch(openLoginModal());
      return false;
    }

    try {
      // Call API to manage the cart
      const response = await ManageCartApi({ id: data.id, qty: 1 });

      if (response.error === false) {
        // Dispatch action to update cart and set provider
        const cartData = response;
        const structuredCartItems = cartData?.data.map((item) => ({
          ...item,
          ...item.servic_details, // Spread service_data into the parent object
        }));
        // Ensure that the response has both provider_id and data
        dispatch(
          setCartData({
            provider: cartData, // Assuming provider_id exists in the response
            items: structuredCartItems || [], // Assuming 'data' contains the cart items
          })
        );

        setQuantities((prev) => ({ ...prev, [data.id]: 1 }));

        // Invalidate cart cache to sync with header
        queryClient.invalidateQueries({
          queryKey: buildLanguageAwareKey(['cart'])
        });

        toast.success(t("serviceAddedSuccessFullyToCart"));
        logClarityEvent(CART_EVENTS.CART_ITEM_ADDED, {
          service_id: data?.id,
          provider_id: cartData?.provider_id || data?.provider_id,
          quantity: 1,
          entrypoint: "cart_card_add",
        });
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error while adding to cart:", error);
      toast.error("Failed to add item to cart");
    }
  };

  const translatedServiceName = data?.translated_title
    ? data?.translated_title
    : data?.title;

  return (
    <div className="border rounded-xl flex flex-row gap-4 sm:gap-6 py-4 px-4 sm:px-6">
      {/* Service Image */}
      <div className="service-img flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-[8px]">
        <CustomImageTag
          src={data?.image_of_the_service}
          alt={translatedServiceName}
          className="w-full h-full rounded-lg"
          imgClassName="rounded-lg object-cover"
        />
      </div>

      {/* Details Section */}
      <div className="details w-full flex flex-col gap-2 sm:gap-4 min-w-0">
        {/* Service name */}
        <span className="text-sm sm:text-lg md:text-xl font-semibold line-clamp-2">
          {translatedServiceName}
        </span>

        {/* Members + Duration */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <span className="flex items-center gap-1">
            <FaUserFriends className="primary_text_color" />
            {data?.number_of_members_required}
          </span>
          <span className="flex items-center gap-1">
            <FaClock className="primary_text_color" />
            {data?.duration}
          </span>
        </div>

        {/* Bottom row: price | qty controls | delete */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          {/* Price */}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm sm:text-base font-bold text-black dark:text-white">
              {showPrice(data?.price_with_tax)}
            </span>
            {data?.discounted_price > 0 && (
              <span className="text-xs text-gray-400 line-through leading-none">
                {showPrice(data?.original_price_with_tax)}
              </span>
            )}
          </div>

          {/* Qty controls + delete */}
          <div className="flex items-center gap-2">
            {data?.id && qty[data.id] > 0 ? (
              <div className="flex items-center gap-3 px-3 py-1.5 light_bg_color primary_text_color rounded-md text-xs sm:text-sm font-medium">
                {qty[data.id] > 1 ? (
                  <span className="cursor-pointer" onClick={() => handleRemoveQuantity(data.id)}>
                    <FaMinus size={11} />
                  </span>
                ) : (
                  <FaMinus size={11} className="!text-gray-400 cursor-not-allowed" />
                )}
                <span className={`relative ${animationClass[data.id]} transition-transform duration-300 min-w-[14px] text-center`}>
                  {qty[data.id]}
                </span>
                <span className="cursor-pointer" onClick={() => handleAddQuantity(data.id)}>
                  <FaPlus size={11} />
                </span>
              </div>
            ) : (
              <button
                className="px-3 py-1.5 text-xs sm:text-sm font-medium light_bg_color primary_text_color rounded-md"
                onClick={(e) => handleAddToCart(e, data)}
              >
                {t("addToCart")}
              </button>
            )}

            <button
              onClick={() => handleRemoveItemFromCart(data.id)}
              className="flex items-center gap-1 neutral_text opacity-70"
              aria-label={t("remove")}
            >
              <MdOutlineDelete size={20} />
              <span className="hidden sm:inline text-xs sm:text-sm font-normal">{t("remove")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;
