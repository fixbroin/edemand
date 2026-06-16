import { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
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
  const carouselRef = useRef(null);

  // Scroll visibility state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

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
          // Use service image as preference for subcategory icon as requested
          image: service.image_of_the_service || service.category_image,
          items: [],
        };
      }
      groups[catName].items.push(service);
    });
    return groups;
  }, [isSearchActive, searchResults, services, t]);

  const categories = useMemo(() => Object.values(groupedServices), [groupedServices]);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      checkScroll();
      carousel.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        carousel.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [categories]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

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

  const handleMouseDown = (e) => {
    if (!carouselRef.current) return;
    isDraggingRef.current = true;
    carouselRef.current.classList.add("cursor-grabbing");
    carouselRef.current.classList.remove("cursor-grab");
    startXRef.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftRef.current = carouselRef.current.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    carouselRef.current?.classList.remove("cursor-grabbing");
    carouselRef.current?.classList.add("cursor-grab");
  };

  const handleMouseUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    carouselRef.current?.classList.remove("cursor-grabbing");
    carouselRef.current?.classList.add("cursor-grab");
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
    dragDistanceRef.current = Math.abs(x - startXRef.current);
  };

  const handleCategoryClick = (categoryName) => {
    setActiveCategory(categoryName);
    const element = categoryRefs.current[categoryName];
    if (element) {
      const headerOffset = 100; // Adjusted for non-sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const onCategoryItemClick = (e, catName) => {
    // If the mouse was moved significantly, it was a drag, not a click
    if (dragDistanceRef.current > 5) {
      e.preventDefault();
      return;
    }
    handleCategoryClick(catName);
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
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
      <div className="bg-white dark:bg-[#0F0F0F] pt-2 pb-3">
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
          <div className="relative group/carousel mt-4">
            {/* Left Scroll Button */}
            {canScrollLeft && (
              <button
                onClick={() => scrollCarousel("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm shadow-sm rounded-full flex items-center justify-center border border-primary/20 -ml-2 sm:-ml-4 transition-all hover:bg-primary hover:text-white group/btn"
                aria-label="Scroll Left"
              >
                <FaChevronLeft size={14} className="primary_text_color group-hover/btn:text-white" />
              </button>
            )}

            <div
              ref={carouselRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="overflow-x-auto scrollbar-none flex items-center gap-3 pb-1 cursor-grab"
            >
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={(e) => onCategoryItemClick(e, cat.name)}
                  className={cn(
                    "flex flex-col items-center gap-2 w-[100px] sm:w-[120px] h-[115px] sm:h-[125px] flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 border justify-start",
                    activeCategory === cat.name
                      ? "primary_bg_color border-transparent shadow-md"
                      : "light_bg_color border-transparent hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0",
                    activeCategory === cat.name ? "bg-white/20" : "bg-white dark:bg-white/10"
                  )}>
                    <CustomImageTag
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                  <span className={cn(
                    "text-[12px] sm:text-xs font-semibold text-center line-clamp-2 px-1 leading-tight",
                    activeCategory === cat.name ? "text-white" : "primary_text_color"
                  )}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Right Scroll Button */}
            {canScrollRight && (
              <button
                onClick={() => scrollCarousel("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm shadow-sm rounded-full flex items-center justify-center border border-primary/20 -mr-2 sm:-mr-4 transition-all hover:bg-primary hover:text-white group/btn"
                aria-label="Scroll Right"
              >
                <FaChevronRight size={14} className="primary_text_color group-hover/btn:text-white" />
              </button>
            )}
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
