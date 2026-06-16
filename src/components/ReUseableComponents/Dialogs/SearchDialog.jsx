"use client";
import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { IoSearchOutline } from "react-icons/io5";
import { useRouter } from "next/router";
import { convertToSlug } from "@/utils/Helper";
import { toast } from "sonner";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { logClarityEvent } from "@/utils/clarityEvents";
import { HOME_EVENTS } from "@/constants/clarityEventNames";

const SearchDialog = ({ isOpen, onClose }) => {
    const t = useTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        
        if (!searchQuery.trim()) {
            toast.error(t("pleaseTypeServiceOrProviderName"));
            return;
        }

        const slug = convertToSlug(searchQuery);
        router.push(`/search/${slug}`);
        
        logClarityEvent(HOME_EVENTS.SERVICE_SEARCH_SUBMITTED, {
            query_length: searchQuery.trim().length,
            source: "header_dialog"
        });
        
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="text-lg font-semibold">{t("searchService")}</DialogTitle>
                </DialogHeader>
                <div className="p-6">
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
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="ml-3 primary_bg_color text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                        >
                            {t("search")}
                        </button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SearchDialog;
