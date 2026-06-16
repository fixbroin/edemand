import { useState, useEffect } from "react";
import { MdMenu, MdClose } from "react-icons/md";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CustomImageTag from "../ReUseableComponents/CustomImageTag";
import { cn } from "@/lib/utils";
import { useTranslation } from "../Layout/TranslationContext";

const SubCategoryFloatingMenu = ({ categories, activeCategory, onCategoryClick }) => {
  const t = useTranslation();
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsMenuVisible(true);
      } else {
        setIsMenuVisible(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!categories || categories.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-[55] transition-all duration-300 ease-in-out",
        isMenuVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
        <DialogTrigger asChild>
          <button
            className="rounded-full shadow-xl flex items-center justify-center gap-2 h-10 px-4 sm:h-12 sm:px-6 primary_bg_color text-white transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label={t("Jump To Category") || "Jump to Sub-Category"}
          >
            <MdMenu className="h-5 w-5 sm:h-7 sm:w-7" />
            <span className="hidden sm:inline font-semibold">{t("Jump To Category") || "Jump to Sub-Category"}</span>
            <span className="inline sm:hidden font-semibold">{t("Menu") || "Menu"}</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b dark:border-gray-800 bg-white dark:bg-[#0F0F0F] relative">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold">{t("Jump To Category") || "Jump to Category"}</DialogTitle>
              <button
                onClick={() => setIsMenuModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("close") || "Close"}
              >
                <MdClose size={20} className="description_color" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30 dark:bg-black/20 custom-scrollbar">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    onCategoryClick(cat.name);
                    setIsMenuModalOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 border h-[120px] justify-start",
                    activeCategory === cat.name
                      ? "primary_bg_color border-transparent shadow-md text-white"
                      : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-gray-800 hover:border-primary/30 primary_text_color shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0",
                    activeCategory === cat.name ? "bg-white/20" : "bg-gray-100 dark:bg-white/5"
                  )}>
                    <CustomImageTag
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[12px] sm:text-xs font-semibold text-center line-clamp-2 px-1 leading-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubCategoryFloatingMenu;