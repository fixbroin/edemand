"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../Layout/Layout";
import BreadCrumb from "../ReUseableComponents/BreadCrumb";
import { FaStar } from "react-icons/fa6";
import { IoLocationOutline } from "react-icons/io5";
import { CiBookmarkPlus } from "react-icons/ci";
import { HiOutlineChatBubbleOvalLeftEllipsis } from "react-icons/hi2";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProviderServiceTab from "./ProviderServiceTab";
import ProviderAboutTab from "./ProviderAboutTab";
import ProviderReviewTab from "./ProviderReviewTab";
import ProviderOfferTab from "./ProviderOfferTab";
import { useDispatch, useSelector } from "react-redux";
import { useIsLogin, showDistance } from "@/utils/Helper";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { useRouter } from "next/router";
import { allServices, bookmark, getProviders } from "@/api/apiRoutes";
import Lightbox from "../ReUseableComponents/CustomLightBox/LightBox";
import { BsFillBookmarkCheckFill } from "react-icons/bs";
import { toast } from "sonner";
import {
  getChatData,
  selectProviderServicesLoadMap,
  setProviderServicesLoad,
  openLoginModal,
} from "@/redux/reducers/helperSlice";
import { useTranslation } from "../Layout/TranslationContext";
import Share from "../ReUseableComponents/Share/Share";
import OpenInAppDrawer from "../ReUseableComponents/Drawers/OpenInAppDrawer";
import ProviderDetailsSkeleton from "../Skeletons/ProviderDetailsSkeleton";
import StickyCartContinueButton from "../Cart/StickyCartContinueButton";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { buildLanguageAwareKey } from "@/lib/react-query-client";

const ProviderDetails = () => {
  // All hooks must be called in the exact same order every time
  const t = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = router.query.slug?.[0];

  // All useSelector hooks together
  const providerServicesLoadMap = useSelector(selectProviderServicesLoadMap);
  const locationRawData = useSelector((state) => state?.location);
  const settings = useSelector((state) => state.settingsData?.settings);

  // All useState hooks together — tab initialized from sessionStorage to avoid reload flash
  const [activeTab, setActiveTabLocal] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("providerActiveTab") || "{}");
      return stored.providerId === slug ? stored.tab : "services";
    } catch {
      return "services";
    }
  });
  const [isOpenInApp, setIsOpenInApp] = useState(false);

  // All useMemo hooks together
  const locationData = useMemo(() => {
    return locationRawData || { lat: null, lng: null };
  }, [locationRawData]);

  // Constants and derived values
  const isLoggedIn = useIsLogin(); // Reactive hook - automatically updates when login state changes
  const isShare = router.query.share;
  const limit = 100;
  const storedServicesLoad = slug ? providerServicesLoadMap?.[slug] : 0;
  const [targetServicesCount, setTargetServicesCount] = useState(limit);

  // Get location from URL if not in store
  useEffect(() => {
    if (!locationData.lat || !locationData.lng) {
      const urlParams = new URLSearchParams(window.location.search);
      const lat = urlParams.get("lat");
      const lng = urlParams.get("lng");
      if (lat && lng) {
        dispatch({ type: "location/setLatitude", payload: parseFloat(lat) });
        dispatch({ type: "location/setLongitude", payload: parseFloat(lng) });
      }
    }
  }, [locationData, dispatch]);

  // Provider Details Query
  const {
    data: providerData,
    isLoading: isLoadingProvider,
    isError: isErrorProvider,
  } = useQuery({
    queryKey: buildLanguageAwareKey([
      "provider",
      locationData?.lat,
      locationData?.lng,
      slug,
    ]),
    queryFn: async () => {
      const response = await getProviders({
        latitude: locationData?.lat,
        longitude: locationData?.lng,
        slug: slug,
      });
      return response?.data?.[0];
    },
    enabled: !!slug && router.isReady,
    retry: 3,
    retryDelay: 1000,
  });

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ type, partnerId }) => {
      return await bookmark({
        type,
        lat: locationData?.lat,
        lng: locationData?.lng,
        partner_id: partnerId,
      });
    },
    onSuccess: (data) => {
      if (data?.error === false) {
        toast.success(data?.message);
        // Invalidate provider query to refresh bookmark status
        queryClient.invalidateQueries(
          buildLanguageAwareKey([
            "provider",
            locationData?.lat,
            locationData?.lng,
            slug,
          ])
        );
      } else {
        toast.error(data?.message);
      }
    },
    onError: (error) => {
      console.error("Bookmark error:", error);
      toast.error(t("errorOccurred"));
    },
  });

  // Services Infinite Query
  const {
    data: servicesData,
    fetchNextPage: fetchNextServices,
    hasNextPage: hasNextServices,
    isFetchingNextPage: isFetchingNextServices,
    isLoading: isLoadingServices,
  } = useInfiniteQuery({
    queryKey: buildLanguageAwareKey(["providerServices", slug]),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await allServices({
        provider_slug: slug,
        offset: pageParam,
        limit,
      });
      if (response.error === false) {
        return {
          data: response.data,
          total: response.total,
          nextPage:
            response.data.length === limit ? pageParam + limit : undefined,
        };
      }
      throw new Error(response.message || "Failed to fetch services");
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!slug && activeTab === "services" && router.isReady,
    retry: 3,
    retryDelay: 1000,
  });

  const aggregatedServices = useMemo(
    () => servicesData?.pages?.flatMap((page) => page.data) || [],
    [servicesData?.pages]
  );

  const totalServices = servicesData?.pages?.[0]?.total || 0;

  useEffect(() => {
    if (!slug) return;
    if (storedServicesLoad && storedServicesLoad > limit) {
      setTargetServicesCount(storedServicesLoad);
    } else {
      setTargetServicesCount(limit);
    }
  }, [slug, storedServicesLoad]);

  useEffect(() => {
    if (!slug) return;
    const cappedTarget = totalServices
      ? Math.min(targetServicesCount, totalServices)
      : targetServicesCount;

    if (
      aggregatedServices.length < cappedTarget &&
      hasNextServices &&
      !isFetchingNextServices &&
      activeTab === "services"
    ) {
      fetchNextServices();
      return;
    }

    if (
      aggregatedServices.length > 0 &&
      aggregatedServices.length >= cappedTarget &&
      storedServicesLoad !== aggregatedServices.length
    ) {
      dispatch(
        setProviderServicesLoad({
          slug,
          loadedCount: aggregatedServices.length,
        })
      );
    }
  }, [
    aggregatedServices.length,
    targetServicesCount,
    hasNextServices,
    isFetchingNextServices,
    fetchNextServices,
    slug,
    dispatch,
    storedServicesLoad,
    totalServices,
    activeTab,
  ]);

  const handleLoadMoreServices = () => {
    setTargetServicesCount((prev) => prev + limit);
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) {
      dispatch(openLoginModal());
      return;
    }

    const type = providerData?.is_bookmarked === "1" ? "remove" : "add";
    bookmarkMutation.mutate({ type, partnerId: providerData?.partner_id });
  };

  const handleChat = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      dispatch(openLoginModal());
      return false;
    }
    try {
      dispatch(
        getChatData({
          booking_id: null,
          partner_id: providerData?.partner_id,
          partner_name: providerData?.translated_company_name
            ? providerData?.translated_company_name
            : providerData?.company_name,
          image: providerData?.image,
          order_status: "",
          is_pre_booking: true,
        })
      );
      router.push("/chats");
    } catch (error) {
      console.error(error);
      toast.error(t("errorStartingChat"));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTabLocal(tab);
    try {
      sessionStorage.setItem("providerActiveTab", JSON.stringify({ providerId: slug, tab }));
    } catch {}
  };

  // Handle mobile app drawer
  useEffect(() => {
    const isMobileOrTablet = window.innerWidth <= 1024;
    if (isShare && isMobileOrTablet) {
      setIsOpenInApp(true);
    } else {
      setIsOpenInApp(false);
    }
  }, [isShare]);

  const isPreBookingChatAvailable =
    settings?.general_settings?.allow_pre_booking_chat === "1";
  const isProviderPreBookingChatAvailable =
    providerData?.pre_booking_chat === "1";

  if (isLoadingProvider) {
    return <ProviderDetailsSkeleton />;
  }

  const translatedCompanyName = providerData?.translated_company_name
    ? providerData?.translated_company_name
    : providerData?.company_name;

  return (
    <Layout>
      <BreadCrumb
        firstEle={t("providers")}
        secEle={t("providerDetails")}
        firstEleLink="/providers"
        SecEleLink={`/provider-details/${slug}`}
      />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-24">
          {/* Action Bar with Provider Info and Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white dark:bg-[#0F0F0F] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                <CustomImageTag
                  src={providerData?.image}
                  alt={providerData?.company_name}
                  className="w-full aspect-square object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                  {translatedCompanyName}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  {providerData?.ratings > 0 && (
                    <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => handleTabChange("reviews")}>
                      <FaStar className="w-3.5 h-3.5 rating_icon_color" />
                      <span className="text-sm font-medium">{providerData?.ratings}</span>
                    </div>
                  )}
                  {providerData?.distance > 0 && (
                    <div className="flex items-center gap-1 text-sm description_color cursor-pointer hover:underline" onClick={() => handleTabChange("about")}>
                      <IoLocationOutline className="primary_text_color font-bold" size={16} />
                      {showDistance(providerData?.distance)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                className={`${providerData?.is_bookmarked === "1"
                  ? "card_bg dark:light_bg_color primary_text_color"
                  : "card_bg dark:light_bg_color"
                  } p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all`}
                onClick={handleBookmark}
                disabled={bookmarkMutation.isPending}
                title={t("bookmark")}
              >
                {providerData?.is_bookmarked === "1" ? (
                  <BsFillBookmarkCheckFill size={22} />
                ) : (
                  <CiBookmarkPlus size={22} />
                )}
              </button>

              <Share title={translatedCompanyName} />

              {isPreBookingChatAvailable && isProviderPreBookingChatAvailable && (
                <button
                  className="card_bg dark:light_bg_color p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all"
                  onClick={handleChat}
                  title={t("chat")}
                >
                  <HiOutlineChatBubbleOvalLeftEllipsis size={22} />
                </button>
              )}
            </div>
          </div>

          {/* Main Tabs Section */}
          <div className="w-full">
            <Tabs className="w-full" value={activeTab}>
              <TabsList className="light_bg_color rounded-md w-full h-full flex gap-2 p-2 overflow-x-auto md:overflow-x-hidden scrollbar-none justify-start md:justify-center">
                <style jsx global>{`
                  .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                  .scrollbar-none::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                <TabsTrigger
                  value="services"
                  className={`${activeTab === "services"
                    ? "primary_bg_color !text-white"
                    : "bg-white text-black"
                    } px-6 md:px-4 py-2 rounded-md font-medium w-full text-center`}
                  onClick={() => handleTabChange("services")}
                >
                  {t("services")}
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className={`${activeTab === "about"
                    ? "primary_bg_color !text-white"
                    : "bg-white text-black"
                    } px-6 md:px-4 py-2 rounded-md font-medium w-full text-center`}
                  onClick={() => handleTabChange("about")}
                >
                  {t("about")}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className={`${activeTab === "reviews"
                    ? "primary_bg_color !text-white"
                    : "bg-white text-black"
                    } px-6 md:px-4 py-2 rounded-md font-medium w-full text-center`}
                  onClick={() => handleTabChange("reviews")}
                >
                  {t("reviews")}
                </TabsTrigger>
                <TabsTrigger
                  value="offers"
                  className={`${activeTab === "offers"
                    ? "primary_bg_color !text-white"
                    : "bg-white text-black"
                    } px-6 md:px-4 py-2 rounded-md font-medium w-full text-center`}
                  onClick={() => handleTabChange("offers")}
                >
                  {t("offers")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-6">
                <ProviderServiceTab
                  slug={slug}
                  isLoadingServices={isLoadingServices}
                  isFetchingNextServices={isFetchingNextServices}
                  servicesData={servicesData}
                  fetchNextServices={fetchNextServices}
                  companyName={providerData?.company_name}
                  provider={providerData}
                  onLoadMore={handleLoadMoreServices}
                />
              </TabsContent>
              <TabsContent value="about" className="mt-6">
                <ProviderAboutTab providerData={providerData} />
              </TabsContent>
              <TabsContent value="reviews" className="mt-6">
                <ProviderReviewTab providerData={providerData} slug={slug} />
              </TabsContent>
              <TabsContent value="offers" className="mt-6">
                <ProviderOfferTab providerSlug={slug} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
      <OpenInAppDrawer
        IsOpenInApp={isOpenInApp}
        OnHide={() => setIsOpenInApp(false)}
        systemSettingsData={settings}
      />
      <StickyCartContinueButton />
    </Layout>
  );
};

export default ProviderDetails;
