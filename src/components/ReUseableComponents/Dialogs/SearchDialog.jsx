"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { IoSearchOutline, IoClose, IoSearch } from "react-icons/io5";
import { FaSearch } from "react-icons/fa";
import { GoChevronRight } from "react-icons/go";
import { useRouter } from "next/router";
import { convertToSlug, isMobile, useRTL } from "@/utils/Helper";
import { toast } from "sonner";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { logClarityEvent } from "@/utils/clarityEvents";
import { HOME_EVENTS } from "@/constants/clarityEventNames";

// Redux & API
import { useSelector, useDispatch } from "react-redux";
import { setActiveTab } from "@/redux/reducers/helperSlice";
import { search_services_providers } from "@/api/apiRoutes";

// Tanstack Query
import { useInfiniteQuery } from "@tanstack/react-query";
import { buildLanguageAwareKey } from "@/lib/react-query-client";

// UI Components
import ProviderDetailsServiceCard from "@/components/Provider/ProviderDetailsServiceCard";
import NearbyProviderCard from "@/components/Cards/NearbyProviderCard";
import CustomLink from "@/components/ReUseableComponents/CustomLink";
import NoDataFound from "@/components/ReUseableComponents/Error/NoDataFound";
import MiniLoader from "@/components/ReUseableComponents/MiniLoader";
import CustomImageTag from "@/components/ReUseableComponents/CustomImageTag";
import { Skeleton } from "@/components/ui/skeleton";
import NearbyProviderCardSkeleton from "@/components/Skeletons/NearbyProviderCardSkeleton";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const SearchSkeleton = () => {
    return (
        <div className="card_bg rounded-xl w-full flex flex-col gap-3 py-3 px-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800/50">
            {/* Header Section */}
            <div className="flex items-center justify-start gap-2">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="provider_detail flex items-start justify-between w-full">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-40 h-5" />
                    </div>
                    <Skeleton className="w-20 h-8 rounded-lg" />
                </div>
            </div>

            {/* Services Section */}
            <div className="grid grid-cols-1 gap-4 mt-4">
                {[1, 2].map((_, index) => (
                    <Skeleton key={index} className="w-full h-28 rounded-lg" />
                ))}
            </div>
        </div>
    );
};

const SearchDialog = ({ isOpen, onClose }) => {
    const t = useTranslation();
    const router = useRouter();
    const dispatch = useDispatch();
    const isRTL = useRTL();
    const isMobileView = isMobile();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchKey, setSearchKey] = useState("");
    const [activeTabType, setActiveTabType] = useState("service");

    const swiperRef = useRef(null);
    const locationData = useSelector((state) => state?.location);
    const limit = 6;

    // Reset search query state when popup is opened or closed
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSearchKey("");
        }
    }, [isOpen]);

    // Debounce search query to search key for instant search-as-you-type
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            setSearchKey("");
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setSearchKey(trimmedQuery);
        }, 400); // 400ms delay before triggering search query

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: buildLanguageAwareKey([
            "popupSearchResults",
            activeTabType,
            searchKey,
            locationData?.lat,
            locationData?.lng,
        ]),
        queryFn: async ({ pageParam = 0 }) => {
            if (!searchKey) {
                return {
                    services: [],
                    providers: [],
                    total: 0,
                    nextOffset: undefined,
                };
            }

            const response = await search_services_providers({
                type: activeTabType,
                search: searchKey,
                latitude: locationData?.lat || null,
                longitude: locationData?.lng || null,
                limit,
                offset: pageParam,
            });

            if (response?.error) {
                throw new Error(response?.message || t("somethingWentWrong"));
            }

            const services = response?.data?.Services || [];
            const providers = response?.data?.providers || [];
            const totalResults = response?.data?.total || 0;
            const relevantItems = activeTabType === "service" ? services : providers;
            const nextOffset =
                pageParam + relevantItems.length < totalResults
                    ? pageParam + relevantItems.length
                    : undefined;

            return {
                services,
                providers,
                total: totalResults,
                nextOffset,
            };
        },
        getNextPageParam: (lastPage) => lastPage?.nextOffset,
        enabled: Boolean(isOpen && searchKey && activeTabType),
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const servicesData = useMemo(
        () => data?.pages?.flatMap((page) => page.services || []) || [],
        [data?.pages]
    );

    const providersData = useMemo(
        () => data?.pages?.flatMap((page) => page.providers || []) || [],
        [data?.pages]
    );

    const total = data?.pages?.[0]?.total || 0;

    const isRefetching = isFetching && !isLoading && !isFetchingNextPage;
    const shouldShowServiceSkeleton =
        activeTabType === "service" &&
        (isLoading || (isRefetching && servicesData.length === 0));
    const shouldShowProviderSkeleton =
        activeTabType === "provider" &&
        (isLoading || (isRefetching && providersData.length === 0));

    const handleSearch = (e) => {
        if (e) e.preventDefault();

        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            toast.error(t("pleaseTypeServiceOrProviderName"));
            return;
        }

        setSearchKey(trimmedQuery);
        
        logClarityEvent(HOME_EVENTS.SERVICE_SEARCH_SUBMITTED, {
            query_length: trimmedQuery.length,
            source: "header_dialog_inline",
            target_tab: activeTabType,
        });
    };

    const handleViewAll = (slug, tab) => {
        router.push(`/provider-details/${slug}`);
        dispatch(setActiveTab(tab));
        onClose();
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="sm:max-w-[750px] md:max-w-[850px] lg:max-w-[950px] xl:max-w-[1100px] w-full p-0 overflow-hidden border-none shadow-2xl flex flex-col h-[85vh] card_bg"
                style={{ top: "7%", transform: "translate(-50%, 0)" }}
            >
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 flex-shrink-0">
                    <DialogTitle className="text-lg font-semibold">{t("searchService")}</DialogTitle>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <IoClose size={24} className="description_color" />
                    </button>
                </DialogHeader>
                
                {/* Search Input Bar */}
                <div className="p-6 border-b flex-shrink-0">
                    <form onSubmit={handleSearch} className="relative flex items-center">
                        <div className="relative w-full">
                            <IoSearchOutline 
                                size={22} 
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 description_color" 
                            />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("searchService")}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="ml-3 primary_bg_color text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
                        >
                            {isFetching && !isFetchingNextPage ? <MiniLoader /> : t("search")}
                        </button>
                    </form>
                </div>

                {/* Results Panel */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col gap-4">
                    {!searchKey ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                            <IoSearchOutline size={48} className="text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-sm text-gray-400 dark:text-gray-500 font-sans">
                                {t("pleaseTypeServiceOrProviderName")}
                            </p>
                        </div>
                    ) : (
                        <>
                        {/* Header metadata and tab selectors */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
                            <div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-sans">
                                    {t("gettingResultFor")}{" "}
                                    <span className="primary_text_color capitalize font-semibold">
                                        "{searchKey}"
                                    </span>
                                </span>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-sans">
                                    {total} {t("results")}
                                </p>
                            </div>

                            {/* Service vs Provider Tabs */}
                            <div className="flex border p-1 rounded-xl bg-white dark:bg-gray-800 shadow-sm self-start sm:self-auto">
                                <button
                                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                                        activeTabType === "service"
                                            ? "light_bg_color primary_text_color"
                                            : ""
                                    } rounded-lg`}
                                    onClick={() => setActiveTabType("service")}
                                >
                                    {t("services")}
                                </button>
                                <button
                                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                                        activeTabType === "provider"
                                            ? "light_bg_color primary_text_color"
                                            : ""
                                    } rounded-lg`}
                                    onClick={() => setActiveTabType("provider")}
                                >
                                    {t("providers")}
                                </button>
                            </div>
                        </div>

                        {/* Search Data Render */}
                        <div className="flex-1">
                            {activeTabType === "service" ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {shouldShowServiceSkeleton ? (
                                        [...Array(limit)].map((_, index) => (
                                            <SearchSkeleton key={index} />
                                        ))
                                    ) : isError ? (
                                        <div className="w-full py-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
                                            <NoDataFound
                                                title={t("errorLoadingServices")}
                                                desc={error?.message || t("pleaseRetryLater")}
                                            />
                                        </div>
                                    ) : servicesData?.length > 0 ? (
                                        servicesData.map((service, index) => {
                                            const translatedCompanyName = service?.provider?.translated_company_name 
                                                ? service?.provider?.translated_company_name 
                                                : service?.provider?.company_name;
                                            const translatedUsername = service?.provider?.translated_username 
                                                ? service?.provider?.translated_username 
                                                : service?.provider?.username;
                                            
                                            return (
                                                <div
                                                    className="card_bg rounded-xl w-full flex flex-col gap-3 py-3 px-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800/50"
                                                    key={index}
                                                >
                                                    <div className="flex items-center justify-start gap-2">
                                                        <div className="w-12 aspect-square">
                                                            <CustomImageTag
                                                                src={service?.provider?.image}
                                                                alt={`${translatedUsername} - ${translatedCompanyName}`}
                                                                w={0}
                                                                h={0}
                                                                imgClassName="w-full h-full object-cover rounded-lg"
                                                            />
                                                        </div>
                                                        <div className="provider_detail flex items-start justify-between w-full">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs description_color flex-nowrap">
                                                                    {translatedUsername}
                                                                </span>
                                                                <span className="text-base font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] md:max-w-full">
                                                                    {translatedCompanyName}
                                                                </span>
                                                            </div>
                                                            {service?.provider?.services.length > 2 && (
                                                                <div>
                                                                    <button
                                                                        className="p-2 bg-none md:primary_bg_color md:text-white rounded-lg text-xs"
                                                                        onClick={() =>
                                                                            handleViewAll(
                                                                                service?.provider?.provider_slug,
                                                                                "services"
                                                                            )
                                                                        }
                                                                    >
                                                                        {isMobileView ? (
                                                                            <GoChevronRight size={20} />
                                                                        ) : (
                                                                            t("viewAll")
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {service?.provider?.services?.length > 2 ? (
                                                        <div className="services_data flex justify-center w-full">
                                                            <Swiper
                                                                spaceBetween={15}
                                                                slidesPerView={1.1}
                                                                breakpoints={{
                                                                    320: { slidesPerView: 1 },
                                                                    480: { slidesPerView: 1.1 },
                                                                    600: { slidesPerView: 1.2 },
                                                                    768: { slidesPerView: 1.5 },
                                                                    1024: { slidesPerView: 2 }
                                                                }}
                                                                dir={isRTL ? "rtl" : "ltr"}
                                                                key={isRTL}
                                                                modules={[Autoplay]}
                                                                onSwiper={(swiper) => {
                                                                    swiperRef.current = swiper;
                                                                }}
                                                                className="custom-swiper w-full"
                                                            >
                                                                {service?.provider?.services.map(
                                                                    (svcItem, idx) => (
                                                                        <SwiperSlide key={idx}>
                                                                            <ProviderDetailsServiceCard
                                                                                slug={svcItem?.provider_slug}
                                                                                data={svcItem}
                                                                                compnayName={translatedCompanyName}
                                                                            />
                                                                        </SwiperSlide>
                                                                    )
                                                                )}
                                                            </Swiper>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {service?.provider?.services.map(
                                                                (svcItem, idx) => (
                                                                    <div key={idx}>
                                                                        <ProviderDetailsServiceCard
                                                                            slug={svcItem?.provider_slug}
                                                                            data={svcItem}
                                                                            compnayName={translatedCompanyName}
                                                                        />
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="w-full py-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-850">
                                            <NoDataFound
                                                title={t("noSearchResults")}
                                                desc={t("noSearchResulltsText")}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {shouldShowProviderSkeleton ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {[...Array(limit)].map((_, index) => (
                                                <NearbyProviderCardSkeleton key={index} />
                                            ))}
                                        </div>
                                    ) : isError ? (
                                        <div className="w-full py-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100">
                                            <NoDataFound
                                                title={t("errorLoadingServices")}
                                                desc={error?.message || t("pleaseRetryLater")}
                                            />
                                        </div>
                                    ) : providersData?.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {providersData.map((provider, index) => (
                                                <CustomLink
                                                    key={index}
                                                    href={`/provider-details/${provider?.provider_slug}`}
                                                    title={provider?.name}
                                                    onClick={onClose}
                                                >
                                                    <NearbyProviderCard provider={provider} />
                                                </CustomLink>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full py-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-850">
                                            <NoDataFound
                                                title={t("noSearchResults")}
                                                desc={t("noSearchResulltsText")}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pagination / Load More */}
                        {hasNextPage &&
                            ((activeTabType === "service" && servicesData?.length > 0) ||
                                (activeTabType === "provider" && providersData?.length > 0)) && (
                                <div className="flex items-center justify-center w-full mt-2">
                                    <button
                                        onClick={handleLoadMore}
                                        className="light_bg_color primary_text_color py-2.5 px-6 rounded-xl font-medium text-xs shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center"
                                        disabled={isFetchingNextPage}
                                    >
                                        {isFetchingNextPage ? <MiniLoader /> : t("loadMore")}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SearchDialog;
