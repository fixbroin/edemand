import { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import ProviderDetailsServiceCard from "./ProviderDetailsServiceCard";
import MiniLoader from "../ReUseableComponents/MiniLoader";
import ProviderDetailsServiceCardSkeleton from "../Skeletons/ProviderDetailsServiceCardSkeleton";
import NoDataFound from "../ReUseableComponents/Error/NoDataFound";
import { useTranslation } from "../Layout/TranslationContext";
import { allServices } from "@/api/apiRoutes";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;

const ProviderServiceTab = ({
  slug,
  isLoadingServices,
  isFetchingNextServices,
  servicesData,
  fetchNextServices,
  companyName,
  provider,
  onLoadMore,
}) => {
  const t = useTranslation();

  // Default (no-search) services from parent
  const services = servicesData?.pages?.flatMap((page) => page.data) || [];
  const total = servicesData?.pages?.[0]?.total || 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const requestIdRef = useRef(0);
  const debouncedTermRef = useRef("");
  const categoryRefs = useRef({});

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length === 0) {
      debouncedTermRef.current = "";
      setDebouncedTerm("");
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    if (trimmed === debouncedTermRef.current) return;
    setIsSearching(true);
    const handle = setTimeout(() => {
      debouncedTermRef.current = trimmed;
      setDebouncedTerm(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Fetch on debounced term change
  useEffect(() => {
    if (!debouncedTerm) return;
    const reqId = ++requestIdRef.current;
    setIsSearching(true);
    (async () => {
      try {
        const response = await allServices({
          provider_slug: slug,
          search: debouncedTerm,
          limit: 20,
          offset: 0,
        });
        if (reqId !== requestIdRef.current) return; // stale
        if (response?.error === false) {
          setSearchResults(response?.data || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (reqId !== requestIdRef.current) return;
        console.error("Service search error:", error);
        setSearchResults([]);
      } finally {
        if (reqId === requestIdRef.current) setIsSearching(false);
      }
    })();
  }, [debouncedTerm, slug]);

  const isSearchActive = searchTerm.trim().length > 0;

  // Group services by category
  const groupedServices = useMemo(() => {
    if (isSearchActive) {
      return {
        [t("searchResults")]: {
          name: t("searchResults"),
          items: searchResults,
        },
      };
    }

    const groups = {};
    services.forEach((service) => {
      const catName = service.translated_category_name || service.category_name || t("otherServices");
      if (!groups[catName]) {
        groups[catName] = {
          name: catName,
          image: service.category_image,
          items: [],
        };
      }
      groups[catName].items.push(service);
    });
    return groups;
  }, [isSearchActive, searchResults, services, t]);

  const categories = useMemo(() => Object.values(groupedServices), [groupedServices]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  const handleCategoryClick = (categoryName) => {
    setActiveCategory(categoryName);
    const element = categoryRefs.current[categoryName];
    if (element) {
      const headerOffset = 180; // Adjusted for sticky header + category bar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const showInitialSkeleton = !isSearchActive && isLoadingServices;
  const showSearchSkeleton = isSearchActive && isSearching;
  const showEmpty = !showInitialSkeleton && !showSearchSkeleton && services.length === 0 && (!isSearchActive || searchResults.length === 0);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedTerm("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const renderSkeletons = (count = 5) =>
    Array(count)
      .fill(0)
      .map((_, index) => (
        <div key={index}>
          <ProviderDetailsServiceCardSkeleton />
        </div>
      ));

  return (
    <div className="relative">
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#0F0F0F] pt-2 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 transition-colors duration-200">
          <FaSearch size={14} className="description_color shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchService")}
            className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-60"
            aria-label={t("searchService")}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="description_color shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={t("clear") || "Clear"}
            >
              <MdClose size={16} />
            </button>
          )}
        </div>

        {/* Subcategory Carousel */}
        {!isSearchActive && categories.length > 1 && (
          <div className="mt-4 overflow-x-auto scrollbar-none flex items-center gap-3 pb-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={cn(
                  "flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[100px] p-2 rounded-xl transition-all duration-200 border",
                  activeCategory === cat.name
                    ? "primary_bg_color border-transparent shadow-md"
                    : "bg-white dark:bg-white/5 border-gray-100 dark:border-gray-800 hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0",
                  activeCategory === cat.name ? "bg-white/20" : "bg-gray-100 dark:bg-white/10"
                )}>
                  <CustomImageTag
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs font-semibold text-center line-clamp-1 px-1",
                  activeCategory === cat.name ? "text-white" : "text_color"
                )}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="mt-4">
        {showInitialSkeleton || showSearchSkeleton ? (
          <div className="grid grid-cols-1 gap-4">
            {renderSkeletons(5)}
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center my-12">
            <NoDataFound
              title={isSearchActive ? t("noResultsFound") || t("noServices") : t("noServices")}
              desc={isSearchActive ? t("noResultsFoundText") || t("noServicesText") : t("noServicesText")}
            />
          </div>
        ) : (
          <div className="space-y-10">
            {Object.values(groupedServices).map((group) => (
              <div
                key={group.name}
                ref={(el) => (categoryRefs.current[group.name] = el)}
                className="scroll-mt-48"
              >
                {!isSearchActive && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 primary_bg_color rounded-full" />
                    <h2 className="text-xl font-bold text_color">{group.name}</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {group.items.map((ele, index) => (
                    <ProviderDetailsServiceCard
                      key={ele?.id || index}
                      slug={slug}
                      provider={provider}
                      data={ele}
                      compnayName={companyName}
                      isDisabled={Number(provider?.is_Available_at_location) === 0}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more — hidden when searching */}
            {!isSearchActive && (
              <div className="loadmore pb-12 flex items-center justify-center">
                {isFetchingNextServices ? (
                  <button className="primary_bg_color py-3 px-8 rounded-xl">
                    <MiniLoader />
                  </button>
                ) : (
                  services.length < total && (
                    <button
                      onClick={() => (onLoadMore ? onLoadMore() : fetchNextServices())}
                      className="light_bg_color primary_text_color py-3 px-8 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                      disabled={isFetchingNextServices}
                    >
                      {t("loadMore")}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderServiceTab;
