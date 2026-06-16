"use client";
import { ManageCartApi, removeCartApi } from "@/api/apiRoutes";
import {
  removeFromCart,
  setCartData,
  selectCartProvider,
  setTaxValue,
} from "@/redux/reducers/cartSlice";
import ConfirmDialog from "../ReUseableComponents/Dialogs/ConfirmDialog";
import { useIsLogin, showPrice, useRTL } from "@/utils/Helper";
import { useEffect, useState } from "react";
import {
  FaClock,
  FaMinus,
  FaPlus,
  FaStar,
  FaTrash,
  FaUserFriends,
} from "react-icons/fa";
import { FaArrowRightLong } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useTranslation } from "../Layout/TranslationContext";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import CustomLink from "../ReUseableComponents/CustomLink";
import useIsMobile from "@/hooks/isMobile";
import { useRouter } from "next/navigation";
import { openLoginModal } from "@/redux/reducers/helperSlice";

const ProviderDetailsServiceCard = ({ slug, provider, data, compnayName, isDisabled }) => {

  const router = useRouter();
  const t = useTranslation();
  const isLoggedIn = useIsLogin();
  const dispatch = useDispatch();
  const isRTL = useRTL();
  const isMobile = useIsMobile();

  // Get initial quantities from Redux
  const cart = useSelector((state) => state.cart.items);
  const [qty, setQuantities] = useState({});
  const [animationClass, setAnimationClasses] = useState({});

  // Sync state with Redux on component mount
  useEffect(() => {
    const initialQuantities = {};
    cart?.forEach((item) => {
      if (item.id && item.qty) {
        initialQuantities[item.id] = item.qty;
      }
    });
    setQuantities(initialQuantities);
  }, [cart]);

  const handleAddQuantity = async (id) => {
    try {
      const currentQuantity = parseInt(qty[id], 10);
      if (currentQuantity >= data?.max_quantity_allowed) {
        toast.error(t("maxQtyReached"));
        return;
      }
      const newQuantity = currentQuantity + 1;
      const response = await ManageCartApi({ id, qty: newQuantity });
      if (response.error === false) {
        setAnimationClasses((prev) => ({ ...prev, [id]: "slide-in" }));
        setQuantities((prevQuantities) => ({ ...prevQuantities, [id]: newQuantity }));
        const cartData = response;
        const structuredCartItems = cartData?.data.map((item) => ({ ...item, ...item.servic_details }));
        dispatch(setCartData({ provider: cartData, items: structuredCartItems || [] }));
        dispatch(setTaxValue(cartData?.tax_value));
        toast.success(t("serviceUpdatedSuccessFullyToCart"));
        setTimeout(() => setAnimationClasses((prev) => ({ ...prev, [id]: "" })), 300);
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
      const currentQty = qty[id];
      if (currentQty > 1) {
        const response = await ManageCartApi({ id, qty: currentQty - 1 });
        if (response.error === false) {
          setAnimationClasses((prev) => ({ ...prev, [id]: "slide-out" }));
          setQuantities((prevQuantities) => ({ ...prevQuantities, [id]: currentQty - 1 }));
          const cartData = response;
          const structuredCartItems = cartData?.data.map((item) => ({ ...item, ...item.servic_details }));
          dispatch(setCartData({ provider: cartData, items: structuredCartItems || [] }));
          dispatch(setTaxValue(cartData?.tax_value));
          toast.success(t("serviceUpdatedSuccessFullyToCart"));
          setTimeout(() => setAnimationClasses((prev) => ({ ...prev, [id]: "" })), 300);
        }
      }
    } catch (error) {
      console.error("Error while removing quantity:", error);
      toast.error("Failed to update cart.");
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
          dispatch(setTaxValue(response?.data?.tax_value));
          dispatch(removeFromCart(id));
          toast.success(t("serviceRemovedSuccessFullyFromCart"));
        } else {
          toast.error(response?.message);
        }
      }
    } catch (error) {
      console.error("Error while removing quantity:", error);
      toast.error("Failed to update cart.");
    }
  };

  const currentCartProvider = useSelector(selectCartProvider);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);

  const proceedAddToCart = async (itemToAdd) => {
    try {
      const response = await ManageCartApi({ id: itemToAdd.id, qty: 1 });
      if (response.error === false) {
        setQuantities((prev) => ({ ...prev, [itemToAdd.id]: 1 }));
        const cartData = response;
        const structuredCartItems = cartData?.data.map((item) => ({ ...item, ...item.servic_details }));
        dispatch(setCartData({ provider: cartData, items: structuredCartItems || [] }));
        dispatch(setTaxValue(cartData?.tax_value));
        toast.success(t("serviceAddedSuccessFullyToCart"));
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error while adding to cart:", error);
      toast.error("Failed to add item to cart");
    } finally {
      setIsConflictDialogOpen(false);
      setPendingCartItem(null);
    }
  };

  const handleAddToCart = async (e, data) => {
    e.preventDefault();
    if (!isLoggedIn) {
      dispatch(openLoginModal());
      return false;
    }
    const itemProviderId = data?.user_id || data?.partner_id || provider?.id;
    if (cart.length > 0 && currentCartProvider?.provider_id && itemProviderId && String(currentCartProvider.provider_id) !== String(itemProviderId)) {
      setPendingCartItem(data);
      setIsConflictDialogOpen(true);
      return;
    }
    await proceedAddToCart(data);
  };

  const translatedServiceName = data?.translated_title || data?.title;
  const translatedServiceDescription = data?.translated_description || data?.description;

  const renderQuantityControls = () => {
    if (data?.id && qty[data.id] > 0) {
      return (
        <button className="px-3 py-2 w-full text-xs font-medium light_bg_color primary_text_color rounded-md overflow-hidden">
          <span className={`flex items-center justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            {qty[data.id] > 1 ? (
              <span onClick={(e) => { e.stopPropagation(); handleRemoveQuantity(data.id); }}>
                <FaMinus />
              </span>
            ) : (
              <span onClick={(e) => { e.stopPropagation(); handleRemoveItem(data.id); }}>
                <FaTrash size={14} />
              </span>
            )}
            <span className={`relative ${animationClass[data.id]} transition-transform duration-300`}>
              {qty[data.id]}
            </span>
            <span onClick={(e) => { e.stopPropagation(); handleAddQuantity(data.id); }}>
              <FaPlus />
            </span>
          </span>
        </button>
      );
    }
    return (
      <button
        className="w-full px-3 py-2 text-xs font-medium light_bg_color primary_text_color rounded-md disabled:opacity-50"
        onClick={(e) => { e.stopPropagation(); handleAddToCart(e, data); }}
        disabled={isDisabled}
      >
        {t("addToCart")}
      </button>
    );
  };

  return (
    <>
      <div className="card_bg border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 my-2">
        {/* Mobile Layout */}
        <div className="flex flex-row md:hidden w-full gap-3">
          {/* Left: Details */}
          <div className="flex-1 flex flex-col min-w-0">
            <CustomLink href={`/provider-details/${slug}/${data?.slug}`} title={translatedServiceName}>
              <h3 className={`font-bold text-base leading-tight text_color line-clamp-2 mb-1 ${isRTL ? "text-right" : "text-left"}`}>
                {translatedServiceName}
              </h3>
            </CustomLink>
            <p className={`text-xs description_color line-clamp-2 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
              {translatedServiceDescription}
            </p>
            <div className={`flex flex-wrap items-center gap-3 text-[10px] sm:text-xs description_color mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex items-center gap-1">
                <FaUserFriends className="primary_text_color" />
                <span>{data?.number_of_members_required}</span>
              </div>
              <div className="flex items-center gap-1">
                <FaClock className="primary_text_color" />
                <span>{data?.duration}</span>
              </div>
              {data?.average_rating > 0 && (
                <div className="flex items-center gap-1">
                  <FaStar className="rating_icon_color" />
                  <span className="font-bold">{parseFloat(data?.average_rating).toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className={`flex items-baseline gap-2 mt-auto ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-base font-bold text_color">{showPrice(data?.price_with_tax)}</span>
              {data?.discounted_price > 0 && (
                <span className="text-xs description_color line-through">{showPrice(data?.original_price_with_tax)}</span>
              )}
            </div>
            <CustomLink href={`/provider-details/${slug}/${data?.slug}`} className="text-xs primary_text_color font-medium mt-1 hover:underline">
              {t("viewMore")}
            </CustomLink>
          </div>
          {/* Right: Image & Action */}
          <div className="flex flex-col items-center flex-shrink-0 w-24 sm:w-28 gap-2">
            <CustomLink href={`/provider-details/${slug}/${data?.slug}`} className="w-full">
              <CustomImageTag
                src={data?.image_of_the_service}
                alt={translatedServiceName}
                className="w-full aspect-square object-cover rounded-lg"
                imgClassName="rounded-lg"
              />
            </CustomLink>
            <div className="w-full">
              {renderQuantityControls()}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row items-center w-full gap-5">
          {/* Left: Image */}
          <CustomLink href={`/provider-details/${slug}/${data?.slug}`} className="flex-shrink-0">
            <CustomImageTag
              src={data?.image_of_the_service}
              alt={translatedServiceName}
              className="w-32 lg:w-40 aspect-square object-cover rounded-lg"
              imgClassName="rounded-lg"
            />
          </CustomLink>

          {/* Center: Details */}
          <div className="flex-1 flex flex-col self-stretch py-1 min-w-0">
            <CustomLink href={`/provider-details/${slug}/${data?.slug}`} title={translatedServiceName}>
              <h3 className={`font-bold text-lg lg:text-xl text_color hover:primary_text_color transition-colors line-clamp-1 mb-1 ${isRTL ? "text-right" : "text-left"}`}>
                {translatedServiceName}
              </h3>
            </CustomLink>
            <p className={`text-sm description_color line-clamp-2 mb-3 ${isRTL ? "text-right" : "text-left"}`}>
              {translatedServiceDescription}
            </p>
            <div className={`flex flex-wrap items-center gap-4 text-sm description_color ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex items-center gap-1.5" title={t("membersRequired")}>
                <FaUserFriends className="primary_text_color" size={14} />
                <span>{data?.number_of_members_required}</span>
              </div>
              <div className="flex items-center gap-1.5" title={t("duration")}>
                <FaClock className="primary_text_color" size={14} />
                <span>{data?.duration}</span>
              </div>
              {data?.average_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <FaStar className="rating_icon_color" size={14} />
                  <span className="font-bold">{parseFloat(data?.average_rating).toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="mt-auto flex items-end justify-between">
              <div>
                <div className={`flex items-baseline gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <span className="text-xl font-bold text_color">{showPrice(data?.price_with_tax)}</span>
                  {data?.discounted_price > 0 && (
                    <span className="text-sm description_color line-through">{showPrice(data?.original_price_with_tax)}</span>
                  )}
                </div>
                <CustomLink href={`/provider-details/${slug}/${data?.slug}`} className="text-sm primary_text_color font-medium mt-1 inline-flex items-center gap-1 group">
                  <span className="group-hover:underline">{t("viewMore")}</span>
                  <FaArrowRightLong className={`transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180 group-hover:-translate-x-1" : ""}`} size={12} />
                </CustomLink>
              </div>
            </div>
          </div>

          {/* Right: Cart Controls */}
          <div className="flex flex-col items-center justify-center pl-4 w-32 lg:w-40 border-l border-gray-100 dark:border-gray-800 self-stretch">
            <div className="w-full">
              {renderQuantityControls()}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isConflictDialogOpen}
        onOpenChange={setIsConflictDialogOpen}
        onConfirm={() => proceedAddToCart(pendingCartItem)}
        title={t("startNewCart")}
        description={t("cartConflictDescription")}
        confirmText={t("continue")}
        cancelText={t("cancel")}
      />
    </>
  );
};

export default ProviderDetailsServiceCard;
