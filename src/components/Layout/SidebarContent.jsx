import { memo, useState } from "react";
import { MdClose, MdNotificationsNone, MdKeyboardArrowDown } from "react-icons/md";
import { SheetClose } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IoChatboxEllipsesOutline,
  IoExitOutline,
  IoLocationOutline,
  IoCardOutline,
  IoLocationSharp,
} from "react-icons/io5";
import { CiBookmarkCheck } from "react-icons/ci";
import { FaRegCalendarCheck } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import CustomLink from "../ReUseableComponents/CustomLink";
import Link from "next/link";
import { placeholderImage, useIsDarkMode } from "@/utils/Helper";
import { VscTools } from "react-icons/vsc";
import { useQuery } from "@tanstack/react-query";
import { buildLanguageAwareKey } from "@/lib/react-query-client";
import { getCustomPagesApi } from "@/api/apiRoutes";

// Reusable accordion row header
const AccordionRow = ({ label, isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full p-4 border-b description_color dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
  >
    <span className="text-base">{label}</span>
    <MdKeyboardArrowDown
      size={20}
      className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
    />
  </button>
);

// Memoized Sidebar Content Component
const SidebarContent = memo(
  ({
    t,
    pathName,
    userData,
    isLoggedIn,
    isBecomeProviderPage,
    isRegisterAsProviderAllow,
    handleOpen,
    handleOpenRegisterAsProviderModal,
    handleOpenLogoutDialog,
    toggleDropdown,
    dropdownStates,
    router,
    // Language props
    languages,
    isLoadingLangs,
    langError,
    selectedLanguage,
    getCurrentLanguageDisplay,
    handleLanguageChange,
    isMobileLangOpen,
    setIsMobileLangOpen,
    // Theme props
    theme,
    toggleTheme,
    // Web settings
    websettings,
    general_settings,
    // Navigation
    navigationItems = [],
    hasLatLong = false,
    locationData,
    setIsLocationModalOpen,
  }) => {
    const isDarkMode = useIsDarkMode();

    const [openSections, setOpenSections] = useState({
      quickLinks: false,
      customPages: false,
    });

    const toggleSection = (key) => {
      setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const { data: customPages = [] } = useQuery({
      queryKey: buildLanguageAwareKey("custom_pages_list"),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      queryFn: async () => {
        try {
          const response = await getCustomPagesApi();
          return response?.data || [];
        } catch {
          return [];
        }
      },
    });

    const translatedCopyrightDetails =
      general_settings?.translated_copyright_details ||
      general_settings?.copyright_details;

    const hasAppSection =
      websettings?.app_section_status === "1" ||
      websettings?.app_section_status === 1;

    const hasSocialMedia = websettings?.social_media?.length > 0;

    const quickLinks = [
      { href: "/about-us", label: t("aboutUs") },
      { href: "/contact-us", label: t("contactUs") },
      { href: "/faqs", label: t("faqs") },
      { href: "/blogs", label: t("blogs") },
      { href: "/sitemap", label: t("sitemap") || "Sitemap" },
      { href: "/terms-and-conditions", label: t("termsAndcondition") },
      { href: "/privacy-policy", label: t("privacyPolicy") },
    ];

    // Shared classes for accordion child links
    const accordionLinkClass = (active) =>
      `flex items-center p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 text-sm description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:primary_text_color transition-colors duration-150 ${
        active ? "light_bg_color !primary_text_color font-medium" : ""
      }`;

    return (
      <div className="flex flex-col h-full">
        {/* ── Logo + Close ──────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b">
          <CustomImageTag
            src={isDarkMode ? websettings?.footer_logo : websettings?.web_logo}
            alt={t("logo")}
            className="h-[40px] md:h-[60px] aspect-logo max-w-[220px] safari-logo"
          />
          <SheetClose asChild>
            <button className="description_color hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <MdClose size={24} />
            </button>
          </SheetClose>
        </div>

        {/* ── Scrollable Body ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Location Display */}
          {!(pathName === "/" || pathName === "/home") && (
            <div
              className="p-4 border-b description_color dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
              onClick={() => setIsLocationModalOpen(true)}
            >
              <IoLocationSharp size={20} className="primary_text_color min-w-[20px]" />
              <span className="truncate text-base font-medium">
                {hasLatLong && locationData?.locationAddress
                  ? locationData.locationAddress
                  : t("addLocation")}
              </span>
            </div>
          )}

          {/* Primary Navigation — direct links, no arrow */}
          {navigationItems.map((item) => (
            <CustomLink
              key={item.key}
              href={item.href}
              className={`p-4 border-b text-base description_color dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center ${
                pathName === item.href || (item.key === "home" && pathName === "/")
                  ? "light_bg_color !primary_text_color font-medium"
                  : ""
              }`}
              title={t(item.labelKey)}
            >
              {t(item.labelKey)}
            </CustomLink>
          ))}

          {/* Become Provider — direct link, no arrow */}
          {websettings?.show_become_provider_page && (
            <CustomLink
              href="/become-provider"
              className={`p-4 border-b text-base description_color dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center ${
                pathName === "/become-provider"
                  ? "light_bg_color !primary_text_color font-medium"
                  : ""
              }`}
              title={t("becomeProvider")}
            >
              {t("becomeProvider")}
            </CustomLink>
          )}

          {/* ── Quick Links accordion ─────────────────────────── */}
          <AccordionRow
            label={t("quickLinks")}
            isOpen={openSections.quickLinks}
            onToggle={() => toggleSection("quickLinks")}
          />
          {openSections.quickLinks && (
            <div className="bg-gray-50 dark:bg-gray-800">
              {quickLinks.map((link) => (
                <CustomLink
                  key={link.href}
                  href={link.href}
                  preserveLanguage={false}
                  className={accordionLinkClass(pathName === link.href)}
                >
                  {link.label}
                </CustomLink>
              ))}
            </div>
          )}

          {/* ── Custom Pages accordion (only if pages exist) ──── */}
          {customPages.length > 0 && (
            <>
              <AccordionRow
                label={t("pages") || "Pages"}
                isOpen={openSections.customPages}
                onToggle={() => toggleSection("customPages")}
              />
              {openSections.customPages && (
                <div className="bg-gray-50 dark:bg-gray-800">
                  {customPages.map((page) => (
                    <CustomLink
                      key={page.id}
                      href={`/custom-page/${page.slug}`}
                      preserveLanguage={false}
                      className={accordionLinkClass(
                        pathName === `/custom-page/${page.slug}`
                      )}
                    >
                      {page.translated_title}
                    </CustomLink>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Download App ─────────────────────────────────── */}
          {hasAppSection && (
            <div className="border-t px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {t("downloadCustomerApps")}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href={websettings?.playstore_url || "#"}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 primary_bg_color text-white text-xs font-semibold rounded-lg py-2.5 px-2 hover:opacity-90 transition-opacity"
                >
                  <svg width="15" height="15" viewBox="0 0 33 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M17.772 15.4879L21.7147 11.5453L8.98 4.38793C8.136 3.93193 7.34533 3.86793 6.65199 4.3666L17.772 15.4879ZM22.3867 20.1039L26.4853 17.7986C27.2853 17.3506 27.724 16.7159 27.724 16.0119C27.724 15.3093 27.2853 14.6733 26.4867 14.2253L22.776 12.1413L18.5987 16.3173L22.3867 20.1039ZM5.96666 5.33593C5.88133 5.5986 5.83333 5.89193 5.83333 6.21327V25.8199C5.83333 26.3279 5.94533 26.7653 6.14799 27.1133L16.944 16.3159L5.96666 5.33593ZM17.772 17.1426L7.03599 27.8799C7.24133 27.9586 7.46266 27.9999 7.69599 27.9999C8.11199 27.9999 8.54533 27.8773 8.98666 27.6319L21.3267 20.7026L17.772 17.1426Z" />
                  </svg>
                  <span>{t("googlePlay")}</span>
                </Link>
                <Link
                  href={websettings?.applestore_url || "#"}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 primary_bg_color text-white text-xs font-semibold rounded-lg py-2.5 px-2 hover:opacity-90 transition-opacity"
                >
                  <svg width="15" height="15" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M26.22 22.4146C25.8508 23.2753 25.3946 24.096 24.8587 24.864C24.1427 25.8866 23.5547 26.5933 23.104 26.9866C22.404 27.6293 21.652 27.9599 20.848 27.9786C20.272 27.9786 19.576 27.8146 18.7653 27.4813C17.952 27.1493 17.2053 26.9866 16.5213 26.9866C15.8053 26.9866 15.0373 27.1493 14.2147 27.4813C13.3933 27.8146 12.7293 27.9893 12.2213 28.0053C11.452 28.0386 10.6827 27.6999 9.916 26.9866C9.42667 26.5599 8.81467 25.8266 8.08 24.7893C7.29333 23.6839 6.64667 22.3973 6.14 20.9346C5.59733 19.352 5.32533 17.8213 5.32533 16.3386C5.32533 14.6413 5.692 13.176 6.42667 11.9493C6.98233 10.9859 7.77673 10.1819 8.73333 9.61462C9.67662 9.04884 10.7534 8.7442 11.8533 8.73195C12.4667 8.73195 13.2707 8.92128 14.2667 9.29462C15.2627 9.66795 15.9027 9.85728 16.1813 9.85728C16.392 9.85728 17.1 9.63462 18.3053 9.19328C19.4427 8.78395 20.4027 8.61462 21.1893 8.68128C23.3227 8.85328 24.924 9.69328 25.9893 11.208C24.0827 12.3639 23.14 13.9813 23.1587 16.0573C23.1747 17.6746 23.7627 19.02 24.9147 20.088C25.424 20.5753 26.0182 20.9653 26.668 21.2386C26.5267 21.648 26.3773 22.0386 26.22 22.4146ZM21.3307 3.17328C21.3307 4.43995 20.8667 5.62395 19.9453 6.71862C18.8307 8.01995 17.484 8.77328 16.024 8.65462C16.0049 8.49534 15.9956 8.33504 15.996 8.17462C15.996 6.95728 16.524 5.65595 17.4667 4.59062C17.936 4.05195 18.5333 3.60262 19.2573 3.24528C19.98 2.89328 20.6627 2.69862 21.3053 2.66528C21.3227 2.83595 21.3307 3.00528 21.3307 3.17328Z" />
                  </svg>
                  <span>{t("appStore")}</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Social Media ─────────────────────────────────── */}
          {hasSocialMedia && (
            <div className={`px-4 py-4 flex flex-wrap gap-2.5 ${hasAppSection ? "border-t" : "border-t"}`}>
              {websettings.social_media.map((social, index) => (
                <Link
                  key={index}
                  href={social?.url}
                  target="_blank"
                  className="text-white rounded-full h-[30px] w-[30px] flex items-center justify-center primary_bg_color hover:opacity-80 transition-opacity duration-200"
                >
                  <CustomImageTag
                    src={social.file}
                    alt="social"
                    className="aspect-square w-[30px] rounded-full"
                  />
                </Link>
              ))}
            </div>
          )}

          {/* ── Dark Mode & Language ─────────────────────────── */}
          <div className="border-t">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="text-base description_color dark:text-gray-300">
                {t("darkMode")}
              </span>
              <button
                onClick={toggleTheme}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full relative flex items-center cursor-pointer transition-colors duration-300"
                aria-label="Toggle dark mode"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md absolute transition-transform duration-200 ${
                    theme === "dark" ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 border-b">
              <span className="block text-base description_color dark:text-gray-300 mb-2.5">
                {t("language")}
              </span>
              <Select
                open={isMobileLangOpen}
                onOpenChange={setIsMobileLangOpen}
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-full card_bg border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-2">
                    {!isLoadingLangs && !langError && (
                      <CustomImageTag
                        src={languages.find((l) => l.langCode === selectedLanguage)?.image}
                        alt={getCurrentLanguageDisplay}
                        width={0}
                        height={0}
                        className="w-5 aspect-square rounded-sm object-cover"
                      />
                    )}
                    <span className="text-sm">{getCurrentLanguageDisplay}</span>
                  </div>
                </SelectTrigger>
                <SelectContent
                  className="z-[9999] min-w-[200px] card_bg border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                  onPointerDownOutside={() => setIsMobileLangOpen(false)}
                >
                  {isLoadingLangs ? (
                    <SelectItem value="loading" disabled className="py-3 px-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        <span>{t("loading")}...</span>
                      </div>
                    </SelectItem>
                  ) : langError ? (
                    <SelectItem value="error" disabled className="py-3 px-4 text-red-500">
                      {t("errorLoadingLanguages")}
                    </SelectItem>
                  ) : (
                    languages.map((lang) => (
                      <SelectItem
                        key={lang.id}
                        value={lang.langCode}
                        className={`cursor-pointer py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                          selectedLanguage === lang.langCode
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CustomImageTag
                            src={lang.image}
                            alt={lang.language}
                            width={0}
                            height={0}
                            className="w-6 aspect-square rounded-sm object-cover border border-gray-200 dark:border-gray-600"
                          />
                          <span>{lang.language}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Account Section ──────────────────────────────── */}
          {isLoggedIn ? (
            <div>
              <button
                onClick={() => toggleDropdown("account")}
                className="w-full p-4 border-b description_color dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-[38px] h-[38px]">
                    <AvatarImage
                      src={userData?.image}
                      alt={userData?.username}
                      onError={placeholderImage}
                    />
                    <AvatarFallback>
                      {userData?.username
                        ?.split(" ")
                        .map((w) => w[0]?.toUpperCase())
                        .slice(0, 2)
                        .join("") || "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold line-clamp-1">{userData?.username}</p>
                    <p className="text-xs font-normal description_color">{userData?.email}</p>
                  </div>
                </div>
                <MdKeyboardArrowDown
                  size={20}
                  className={`text-gray-400 transition-transform duration-200 ${
                    dropdownStates.account ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownStates.account && (
                <div className="bg-gray-50 dark:bg-gray-800">
                  <CustomLink
                    href="/general-bookings"
                    className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/general-bookings" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <FaRegCalendarCheck size={20} className={pathName === "/general-bookings" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("bookings")}</span>
                  </CustomLink>

                  <button
                    onClick={() => router.push("/chats")}
                    className={`w-full flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/chats" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <IoChatboxEllipsesOutline size={20} className={pathName === "/chats" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("chats")}</span>
                  </button>

                  <CustomLink
                    href="/notifications"
                    className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/notifications" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <MdNotificationsNone size={20} className={pathName === "/notifications" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("notifications")}</span>
                  </CustomLink>

                  <CustomLink
                    href="/bookmarks"
                    className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/bookmarks" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <CiBookmarkCheck size={20} className={pathName === "/bookmarks" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("bookmarks")}</span>
                  </CustomLink>

                  {hasLatLong && (
                    <CustomLink
                      href="/my-services-requests"
                      className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        pathName === "/my-services-requests" ? "light_bg_color !primary_text_color" : ""
                      }`}
                    >
                      <VscTools size={20} className={pathName === "/my-services-requests" ? "primary_text_color" : ""} />
                      <span className="text-sm">{t("myServiceRequests")}</span>
                    </CustomLink>
                  )}

                  <CustomLink
                    href="/addresses"
                    className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/addresses" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <IoLocationOutline size={20} className={pathName === "/addresses" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("addresses")}</span>
                  </CustomLink>

                  <CustomLink
                    href="/payment-history"
                    className={`flex items-center gap-3.5 p-3.5 pl-8 border-b border-gray-100 dark:border-gray-700/60 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pathName === "/payment-history" ? "light_bg_color !primary_text_color" : ""
                    }`}
                  >
                    <IoCardOutline size={20} className={pathName === "/payment-history" ? "primary_text_color" : ""} />
                    <span className="text-sm">{t("paymentHistory")}</span>
                  </CustomLink>

                  <button
                    onClick={handleOpenLogoutDialog}
                    className="w-full flex items-center gap-3.5 p-3.5 pl-8 description_color dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <IoExitOutline size={20} className="primary_text_color" />
                    <span className="text-sm">{t("logout")}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border-b">
              {isBecomeProviderPage && isRegisterAsProviderAllow ? (
                <button
                  className="w-full pos_btn_bg px-4 py-2.5 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  onClick={handleOpenRegisterAsProviderModal}
                >
                  {t("registerAsProvider")}
                </button>
              ) : (
                <button
                  className="w-full primary_bg_color px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition-opacity"
                  onClick={handleOpen}
                >
                  {t("login")}
                </button>
              )}
            </div>
          )}

          {/* ── Copyright ────────────────────────────────────── */}
          {translatedCopyrightDetails && (
            <div className="border-t px-4 py-4 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                {translatedCopyrightDetails}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SidebarContent.displayName = "SidebarContent";

export default SidebarContent;
