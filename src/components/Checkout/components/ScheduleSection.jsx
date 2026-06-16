"use client";
import { BsCalendar3Week } from "react-icons/bs";
import { IoTimeOutline } from "react-icons/io5";
import { BiSolidEdit } from "react-icons/bi";
import { MdClose, MdModeEdit } from "react-icons/md";
import { FaInfoCircle } from "react-icons/fa";
import dayjs from "dayjs";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { FiAlertTriangle } from "react-icons/fi";

const ScheduleSection = ({
    dilveryDetails,
    note,
    setNote,
    activeNotes,
    onOpenScheduleDrawer,
    onToggleNotes,
    onSaveNotes,
    onClearNotes,
}) => {
    const t = useTranslation();

    return (
        <div className="mb-6 rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Header */}
            <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <BsCalendar3Week className="w-5 h-5 primary_text_color" />
                    <h3 className="text-lg font-semibold text_color">{t("scheduleAt")}</h3>
                </div>
                <button 
                    onClick={onOpenScheduleDrawer} 
                    className="text-sm font-bold primary_text_color hover:opacity-80 transition-opacity"
                >
                    {dilveryDetails?.dilveryDate ? t("change") || "Change" : t("select") || "Select"}
                </button>
            </div>

            {/* Content */}
            <div className="p-5">
                {dilveryDetails?.dilveryDate ? (
                    <>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full flex-shrink-0">
                                    <BsCalendar3Week className="w-5 h-5 primary_text_color" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm description_color leading-tight">{t("date")}</p>
                                    <p className="font-bold text-base text_color">
                                        {dayjs(dilveryDetails.dilveryDate).format("DD/MM/YYYY")}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full flex-shrink-0">
                                    <IoTimeOutline className="w-5 h-5 primary_text_color" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm description_color leading-tight">{t("time")}</p>
                                    <p className="font-bold text-base text_color">
                                        {dilveryDetails?.dilveryTime
                                            ? dayjs(`1970-01-01T${dilveryDetails.dilveryTime.replace("-", ":")}`).format("h:mm A")
                                            : "---"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Time-slot warning banner */}
                        {dilveryDetails?.dilveryTimeMessage && (
                            <div className="mt-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 p-3 rounded-xl text-sm border border-amber-200/50 dark:border-amber-500/20">
                                <FaInfoCircle size={18} className="flex-shrink-0" />
                                <span>{dilveryDetails.dilveryTimeMessage}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div 
                        className="flex flex-col items-center justify-center py-6 text-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 rounded-xl transition-colors" 
                        onClick={onOpenScheduleDrawer}
                    >
                        <FiAlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
                        <p className="font-semibold text-base text_color mb-1">No schedule selected</p>
                        <p className="text-sm description_color">Click to pick a date and time</p>
                    </div>
                )}

                {/* Notes / Instructions */}
                <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
                    {/* Expanded input */}
                    <div
                        className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${activeNotes ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}
                    >
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 w-full rounded-xl p-3 focus-within:border-primary transition-colors">
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t("typeHere") || "Add instruction..."}
                                    className="w-full focus:outline-none bg-transparent text-sm"
                                />
                                {note && (
                                    <button onClick={onClearNotes} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                        <MdClose size={18} className="description_color" />
                                    </button>
                                )}
                            </div>
                            <button
                                className="primary_bg_color hover:opacity-90 transition-opacity text-white rounded-xl py-3 px-6 w-full sm:w-auto font-medium text-sm flex-shrink-0"
                                onClick={onSaveNotes}
                            >
                                {t("save")}
                            </button>
                        </div>
                    </div>

                    {/* Collapsed "Add Instruction" button */}
                    {!activeNotes && (
                        <button
                            className={`flex items-center justify-center sm:justify-start w-full gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium ${note ? "text_color" : "description_color"}`}
                            onClick={onToggleNotes}
                        >
                            <MdModeEdit size={18} className={note ? "primary_text_color" : ""} />
                            <span className="truncate">{note || t("addInstruction")}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleSection;
