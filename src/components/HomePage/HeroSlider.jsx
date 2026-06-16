"use client";
import React, { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IoSearchOutline } from "react-icons/io5";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { convertToSlug, useRTL } from "@/utils/Helper";
import { logClarityEvent } from "@/utils/clarityEvents";
import { HOME_EVENTS } from "@/constants/clarityEventNames";

import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { toast } from "sonner";
import { useTranslation } from "../Layout/TranslationContext";

const CustomNavigation = ({ onPrev, onNext }) => (
  <>
    <button
      onClick={onPrev}
      className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white z-10 p-2 rounded-full focus:outline-none hover:bg-opacity-75 transition-all"
      aria-label="Previous slide"
    >
      <ChevronLeft className="w-6 h-6 text-black" />
    </button>
    <button
      onClick={onNext}
      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white z-10 p-2 rounded-full focus:outline-none hover:bg-opacity-75 transition-all"
      aria-label="Next slide"
    >
      <ChevronRight className="w-6 h-6 text-black" />
    </button>
  </>
);

const CustomPagination = ({ totalSlides, currentSlide, goToSlide, isRTL, isPaused }) => {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    setProgress(0);
    setOpacity(0);

    const duration = 3000;
    const totalSteps = 100;
    const stepDuration = duration / totalSteps;

    const animateProgress = () => {
      let currentStep = 0;

      const interval = setInterval(() => {
        if (isPaused) {
          return;
        }

        if (currentStep < totalSteps) {
          const newProgress = (currentStep / totalSteps) * 100;
          const newOpacity = newProgress / 100;

          setProgress(newProgress);
          setOpacity(newOpacity);

          currentStep += 1;
        } else {
          setProgress(100);
          setOpacity(1);
          clearInterval(interval);
        }
      }, stepDuration);

      return interval;
    };

    animationRef.current = animateProgress();

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [currentSlide, isPaused]);

  return (
    <div className="flex justify-center z-10 bg-white dark:bg-[var(--hover-dark-bg)] p-1 px-2 md:p-2 rounded-full w-fit mx-auto mt-4 border border_color">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <button
          key={index}
          onClick={() => goToSlide(index)}
          className={`rounded-full transition-all relative overflow-hidden light_bg_color border border-[var(--slider-dot-border)] ${index === currentSlide ? "w-4 h-1.5 md:w-6 md:h-3" : "w-1.5 h-1.5 md:w-3 md:h-3"
            } ${isRTL ? "ml-1 md:ml-2" : "mr-1 md:mr-2"} last:m-0`}
          aria-label={`Go to slide ${index + 1}`}
        >
          {index === currentSlide && (
            <div
              className="absolute bottom-0 primary_bg_color border border_color h-[6px] md:h-[12px]"
              style={{
                [isRTL ? "right" : "left"]: "0",
                width: `${progress}%`,
                opacity: opacity,
                transition: "width 0.1s ease-in-out, opacity 0.1s ease-in-out",
                transform: isRTL ? "scaleX(-1)" : "none"
              }}
            ></div>
          )}
        </button>
      ))}
    </div>
  );
};

const HeroSlider = ({ sliderData }) => {
  const t = useTranslation();
  const isRTL = useRTL();
  const locationData = useSelector((state) => state.location);
  const swiperRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleSlideChange = (swiper) => {
    let newIndex = swiper.realIndex; // `realIndex` gives the actual slide index in loop mode
    setCurrentSlide(newIndex);
  };

  const router = useRouter();

  const handleRouteSlider = (e, slide) => {
    e.preventDefault();

    // Track banner taps so product can measure which hero cards convert.
    logClarityEvent(HOME_EVENTS.HOME_BANNER_TAPPED, {
      slide_id: slide?.id,
      slide_type: slide?.original_type,
    });

    switch (slide?.original_type) {
      case "url":
        if (slide?.url) {
          // If the slide type is "url", open the specified URL in a new tab
          window.open(slide?.url, "_blank");
        } else {
          console.warn("Missing URL:", slide);
        }
        break;

      case "provider":
        // For "provider", open the provider route
        const providerRoute = `/provider-details/${slide?.provider_slug}`;
        router.push(providerRoute);
        break;

      case "Category":
      case "Sub Category":
        // Handle both main categories and subcategories
        let categoryRoute = '/service';

        // If parent_category_slugs array exists and has items, use them to build the path
        if (slide?.parent_category_slugs && slide?.parent_category_slugs.length > 0) {
          // Add all parent category slugs in order
          categoryRoute += `/${slide.parent_category_slugs.join('/')}`;
          // Add the current category slug at the end
          categoryRoute += `/${slide.category_slug}`;
        } else {
          // If no parent categories, just use the category slug
          categoryRoute += `/${slide.category_slug}`;
        }

        router.push(categoryRoute);
        break;

      default:
        console.warn("Invalid slide type or missing data:", slide);
        break;
    }
  };

  useEffect(() => {
    const swiperInstance = swiperRef.current;

    const stopAutoplay = () => {
      swiperInstance?.autoplay?.stop();
      setIsPaused(true);
    };

    const startAutoplay = () => {
      swiperInstance?.autoplay?.start();
      setIsPaused(false);
    };

    if (swiperInstance && swiperInstance.el) {
      swiperInstance.el.addEventListener("mouseenter", stopAutoplay);
      swiperInstance.el.addEventListener("mouseleave", startAutoplay);

      return () => {
        if (swiperInstance.el) {
          swiperInstance.el.removeEventListener("mouseenter", stopAutoplay);
          swiperInstance.el.removeEventListener("mouseleave", startAutoplay);
        }
      };
    }
  }, []);
  const isSliderData = sliderData && sliderData?.length > 0
  return (
    <div className={`relative ${isSliderData ? "md:pb-16" : ""} heroSliderSection pb-0`}>
      <div className={`relative w-full group ${isSliderData
        ? "aspect-slider"
        : "h-0"
        }`}>
        {isSliderData ? (
          <>
            <Swiper
              modules={[Autoplay, Navigation]}
              spaceBetween={0}
              slidesPerView={1}
              dir={isRTL ? "rtl" : "ltr"}
              key={isRTL}
              loop={true}
              onSlideChange={handleSlideChange}
              navigation={{
                prevEl: ".swiper-button-prev",
                nextEl: ".swiper-button-next",
              }}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
                waitForTransition: true,
              }}
              className="h-full w-full"
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                swiper.autoplay.start();
              }}
            >
              {sliderData.map((slide, index) => (
                <SwiperSlide
                  key={slide?.id}
                  onClick={(e) => handleRouteSlider(e, slide)}
                >
                  <CustomImageTag
                    alt={t("sliderImage")}
                    src={slide?.slider_web_image}
                    className="w-full h-full object-cover md:object-contain"
                    imgClassName="object-cover md:object-contain"
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            {sliderData?.length > 1 && (
              <>
                {/* Custom navigation buttons */}
                <div className="hidden sm:hidden md:group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <CustomNavigation
                    onPrev={() => swiperRef.current?.slidePrev()}
                    onNext={() => swiperRef.current?.slideNext()}
                  />
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
      {sliderData?.length > 1 && (
        <div className="mt-[2px] md:mt-4">
          <CustomPagination
            totalSlides={sliderData?.length}
            currentSlide={currentSlide}
            goToSlide={(index) => swiperRef.current?.slideTo(index)}
            isRTL={isRTL}
            isPaused={isPaused}
          />
        </div>
      )}
    </div>
  );
};

export default HeroSlider;
