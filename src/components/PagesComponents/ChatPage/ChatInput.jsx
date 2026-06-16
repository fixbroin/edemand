import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { FaPlus, FaImage, FaFile } from "react-icons/fa";
import { RiSendPlaneFill } from "react-icons/ri";
import MiniLoader from "@/components/ReUseableComponents/MiniLoader";
import { useRTL } from "@/utils/Helper";
import AttachedFilesPreview from "./AttachedFilesPreview";

const ChatInput = ({
  attachedFiles,
  onRemoveFile,          // (index) => void  — remove a pending attachment
  handleFileAttachment,
  message,
  handleMessageChange,
  MaxCharactersInTextMessage,
  handleSend,
  isSending,
  isDisabled,
  disabledMessage,
  blockedStatus,
  inputId = "chatFileAttachment",
}) => {
  const t = useTranslation();
  const isRTL = useRTL();

  const settingsData = useSelector((state) => state?.settingsData);
  const generalSettings = settingsData?.settings?.general_settings;
  const isImageUploadEnabled =
    Number(generalSettings?.enable_chat_image_upload) === 1;
  const isFileUploadEnabled =
    Number(generalSettings?.enable_chat_file_upload) === 1;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAttachmentClick = () => {
    if (isImageUploadEnabled && isFileUploadEnabled) {
      setShowDropdown((prev) => !prev);
    } else if (isImageUploadEnabled) {
      handleImageClick();
    } else if (isFileUploadEnabled) {
      handleFileClick();
    }
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
    setShowDropdown(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  if (blockedStatus?.blockedByUser || blockedStatus?.blockedByProvider) {
    return (
      <div
        className={`p-3 border-t text-center ${
          blockedStatus.blockedByUser ? "chat_blocked_user" : "chat_blocked_provider"
        }`}
      >
        {blockedStatus.message}
      </div>
    );
  }

  if (isDisabled) {
    return (
      <div className="p-3 bg-yellow-50 border-t text-center text-amber-800">
        {disabledMessage || t("sorryYouCantSendMessage")}
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-1.5 md:p-2.5 rounded-b-lg">
      {/* Attached files preview strip */}
      <AttachedFilesPreview files={attachedFiles} onRemove={onRemoveFile} />

      <div className="flex gap-2 items-end max-w-7xl mx-auto">
        {(isImageUploadEnabled || isFileUploadEnabled) && (
          <div className="relative flex mb-0.5" ref={dropdownRef}>
            <button
              type="button"
              onClick={handleAttachmentClick}
              className="group flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none border border-gray-100 dark:border-gray-700 shadow-sm"
              title={t("attachments")}
            >
              <FaPlus className={`text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-transform duration-300 ${showDropdown ? 'rotate-45' : ''}`} size={16} />
            </button>

            {showDropdown && (
              <div
                className={`absolute bottom-full mb-2.5 ${isRTL ? "right-0" : "left-0"
                  } bg-white dark:bg-gray-800 shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 min-w-[160px] z-20 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                {isImageUploadEnabled && (
                  <button
                    type="button"
                    onClick={handleImageClick}
                    className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <FaImage className="text-blue-500 text-xs" />
                    </div>
                    <span className="font-medium text-xs md:text-sm">{t("images")}</span>
                  </button>
                )}
                {isFileUploadEnabled && (
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <div className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                      <FaFile className="text-orange-500 text-xs" />
                    </div>
                    <span className="font-medium text-xs md:text-sm">{t("documents")}</span>
                  </button>
                )}
              </div>
            )}

            <input
              type="file"
              id={`${inputId}_image`}
              ref={imageInputRef}
              multiple
              accept=".png, .jpg, .jpeg, .gif, .webp, .svg"
              onChange={(e) => handleFileAttachment(e, "image")}
              className="hidden"
            />
            <input
              type="file"
              id={`${inputId}_file`}
              ref={fileInputRef}
              multiple
              accept=".pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .csv, .zip, .rar"
              onChange={(e) => handleFileAttachment(e, "file")}
              className="hidden"
            />
          </div>
        )}

        <div className="relative flex-1 group transition-all duration-200">
          <div className="relative flex flex-col bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <textarea
              className="w-full bg-transparent px-3 py-2 resize-none focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 min-h-[38px] md:min-h-[42px] max-h-32 text-sm md:text-base leading-snug scrollbar-hide"
              placeholder={t("typeMessage")}
              style={{ direction: isRTL ? "rtl" : "ltr" }}
              value={message}
              onChange={handleMessageChange}
              maxLength={MaxCharactersInTextMessage}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim() || attachedFiles.length > 0) handleSend();
                }
              }}
            ></textarea>

            <div className={`px-3 pb-1 flex justify-end transition-opacity duration-300 ${message.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              <span className={`text-[10px] font-medium ${message.length >= MaxCharactersInTextMessage ? 'text-red-500' : 'text-gray-400'}`}>
                {message.length}/{MaxCharactersInTextMessage}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-0.5">
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || (!message.trim() && attachedFiles.length === 0)}
            className={`flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full transition-all duration-300 shadow-sm active:scale-95 ${
              isSending || (!message.trim() && attachedFiles.length === 0)
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 cursor-not-allowed'
                : 'primary_bg_color text-white shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <RiSendPlaneFill size={18} className={isRTL ? 'rotate-180' : ''} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
