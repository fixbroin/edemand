'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useTranslation } from '../Layout/TranslationContext';
import { MdClose, MdGetApp } from 'react-icons/md';

/**
 * PWA Install Button Component
 * Shows an install button when the PWA is installable but not yet installed
 * Only displays on mobile devices (iOS, Android) when NEXT_PUBLIC_ENABLE_PWA is true
 * Respects user preferences via cookies
 */
export default function PWAInstallButton() {
  const t = useTranslation();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPwaEnabled, setIsPwaEnabled] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Cookie names for tracking user preferences
  const PWA_DISMISSED_COOKIE = 'pwa_install_dismissed';
  const PWA_INSTALLED_COOKIE = 'pwa_installed';

  useEffect(() => {
    // Check if PWA feature is enabled via env variable
    const pwaEnabled = process.env.NEXT_PUBLIC_PWA_ENABLED === 'true';
    setIsPwaEnabled(pwaEnabled);

    // If PWA is not enabled, don't continue
    if (!pwaEnabled) return;

    if (typeof window === 'undefined') return;

    // Check for cookies first
    const dismissedByUser = Cookies.get(PWA_DISMISSED_COOKIE) === 'true';
    const installedCookie = Cookies.get(PWA_INSTALLED_COOKIE) === 'true';

    if (dismissedByUser || installedCookie) {
      setShowInstallButton(false);
      return;
    }

    // Browser detection
    const userAgent = navigator.userAgent;
    // Check for iOS device
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if user is on Safari (required for iOS PWA installation)
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(userAgent);
    setIsSafari(isSafariBrowser);

    // Check if the device is mobile (Android or iOS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );
    setIsMobileDevice(isMobile);

    // Check if the app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        Cookies.set(PWA_INSTALLED_COOKIE, 'true', { expires: 30 }); // Set cookie for 30 days
        return true;
      }

      // Also check for window-controls-overlay mode (Windows PWA)
      if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
        setIsInstalled(true);
        Cookies.set(PWA_INSTALLED_COOKIE, 'true', { expires: 30 }); // Set cookie for 30 days
        return true;
      }

      return false;
    };

    checkInstalled();

    // Listen for the beforeinstallprompt event (not supported on iOS)
    const handleBeforeInstallPrompt = (e) => {
      // Only store the event if it's a mobile device
      if (isMobile) {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Store the event for later use
        setInstallPrompt(e);
        // Show the install button
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      Cookies.set(PWA_INSTALLED_COOKIE, 'true', { expires: 30 }); // Set cookie for 30 days
      setShowInstallButton(false);
    });

    // For iOS devices, always show the button once per session
    if (isIOSDevice && !dismissedByUser && !installedCookie) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {
        setIsInstalled(true);
        Cookies.set(PWA_INSTALLED_COOKIE, 'true', { expires: 30 });
      });
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS installation guide
      setShowIOSGuide(true);
    } else if (installPrompt) {
      // Show the install prompt for non-iOS devices
      const promptEvent = installPrompt;
      promptEvent.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await promptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        // User accepted the install prompt
        Cookies.set(PWA_INSTALLED_COOKIE, 'true', { expires: 30 });
      } else {
        // User dismissed the install prompt
        Cookies.set(PWA_DISMISSED_COOKIE, 'true', { expires: 7 }); // Set for 7 days
      }

      // Clear the saved prompt since it can't be used again
      setInstallPrompt(null);
      setShowInstallButton(false);
    } else {
      alert(
        'Installation prompt not available. Please try again later or check if the app is already installed.'
      );
    }
  };

  // Close button handler
  const handleCloseButton = () => {
    Cookies.set(PWA_DISMISSED_COOKIE, 'true', { expires: 7 }); // Set cookie for 7 days
    setShowInstallButton(false);
  };

  // Close iOS guide and set cookie
  const handleCloseIOSGuide = () => {
    setShowIOSGuide(false);
    Cookies.set(PWA_DISMISSED_COOKIE, 'true', { expires: 7 }); // Set cookie for 7 days
  };

  // Don't render anything if:
  // 1. PWA is not enabled via env variable
  // 2. The app is already installed
  // 3. It's not a mobile device
  // 4. User has dismissed the prompt
  if (!isPwaEnabled || isInstalled || !isMobileDevice || !showInstallButton) {
    return null;
  }

  // Show install button based on our state which respects cookies
  return (
    <>
      <div ref={containerRef} className="fixed right-0 rtl:left-0 rtl:right-auto top-1/2 -translate-y-1/2 z-50">
        {/* Container expands automatically to the left on hover or click */}
        <div 
          className="group flex items-center card_bg shadow-[-4px_4px_15px_rgb(0,0,0,0.12)] p-1 ltr:pr-0 rtl:pl-0 rounded-l-full rtl:rounded-r-full rtl:rounded-l-none border border-r-0 border-gray-200 dark:border-gray-800 cursor-pointer overflow-hidden transition-shadow hover:shadow-[-6px_6px_20px_rgb(0,0,0,0.15)]"
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
        >
          
          <button
            onClick={(e) => {
              if (!isExpanded) {
                e.preventDefault();
                setIsExpanded(true);
              } else {
                handleInstallClick();
              }
            }}
            className="flex items-center primary_bg_color text-white shadow-sm rounded-l-full rtl:rounded-r-full rtl:rounded-l-none transition-all active:scale-95 hover:opacity-90 font-medium text-sm"
            aria-label={`${t("install")} ${process.env.NEXT_PUBLIC_APP_NAME}`}
          >
            {/* The Icon is always fixed size */}
            <div className="w-10 h-10 flex shrink-0 items-center justify-center rounded-full">
              <MdGetApp size={22} />
            </div>

            {/* The text has max-width transition */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap flex items-center ${isExpanded ? 'max-w-[250px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[250px] group-hover:opacity-100'}`}>
              <span className="ltr:pr-5 rtl:pl-5 block">
                {isIOS ? t("addToHomeScreen") : `${t("install")} ${process.env.NEXT_PUBLIC_APP_NAME}`}
              </span>
            </div>
          </button>

          {/* Close button with max-width transition */}
          {/* <div className={`transition-all duration-500 ease-in-out flex items-center overflow-hidden ${isExpanded ? 'max-w-[50px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[50px] group-hover:opacity-100'}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseButton();
              }}
              className="w-8 h-8 flex shrink-0 items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-full transition-all focus:outline-none ml-1 mr-1"
              aria-label={t("close")}
            >
              <MdClose size={18} />
            </button>
          </div> */}
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-md rounded-lg bg-white text-black p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">{t("installOnIOS")}</h3>
            <p className="mb-4">{t("installOnIOSDescription")}</p>
            <ol className="mb-4 ml-5 list-decimal space-y-2">
              <li>{t("installOnIOSDescription1")}</li>
              <li>{t("installOnIOSDescription2")}</li>
              <li>{t("installOnIOSDescription3")}</li>
            </ol>
            {!isSafari && (
              <p className="mb-4 text-red-500">
                {t("installOnIOSDescription4")}
              </p>
            )}
            <button
              onClick={handleCloseIOSGuide}
              className="w-full rounded-md primary_bg_color py-2 text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
} 