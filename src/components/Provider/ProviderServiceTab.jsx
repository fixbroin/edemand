import { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import ProviderDetailsServiceCard from "./ProviderDetailsServiceCard";
import MiniLoader from "../ReUseableComponents/MiniLoader";
import ProviderDetailsServiceCardSkeleton from "../Skeletons/ProviderDetailsServiceCardSkeleton";
import NoDataFound from "../ReUseableComponents/Error/NoDataFound";
import { useTranslation } from "../Layout/TranslationContext";
import { allServices } from "@/api/apiRoutes";

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
  const requestIdRef = useRef(0);
  const debouncedTermRef = useRef("");

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

  const listToRender = useMemo(
    () => (isSearchActive ? searchResults : services),
    [isSearchActive, searchResults, services]
  );

  const showInitialSkeleton =
    !isSearchActive && isLoadingServices;
  const showSearchSkeleton = isSearchActive && isSearching;
  const showEmpty =
    !showInitialSkeleton &&
    !showSearchSkeleton &&
    listToRender.length === 0;

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
    <>
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-background pt-1 pb-3">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-transparent transition-colors duration-200`}
        >
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
      </div>

      {/* Services */}
      <div>
        {showInitialSkeleton || showSearchSkeleton ? (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {renderSkeletons(5)}
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center my-6">
            <NoDataFound
              title={isSearchActive ? t("noResultsFound") || t("noServices") : t("noServices")}
              desc={
                isSearchActive
                  ? t("noResultsFoundText") ||
                    t("noServicesText")
                  : t("noServicesText")
              }
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 mt-4">
              {listToRender.map((ele, index) => (
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
            {/* Load more — hidden when searching */}
            {!isSearchActive && (
              <div className="loadmore my-6 flex items-center justify-center">
                {isFetchingNextServices ? (
                  <button className="primary_bg_color primary_text_color py-3 px-8 rounded-xl">
                    <MiniLoader />
                  </button>
                ) : (
                  services.length < total && (
                    <button
                      onClick={() => {
                        if (onLoadMore) {
                          onLoadMore();
                        } else {
                          fetchNextServices();
                        }
                      }}
                      className="light_bg_color primary_text_color py-3 px-8 rounded-xl"
                      disabled={isFetchingNextServices}
                    >
                      {t("loadMore")}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ProviderServiceTab;
