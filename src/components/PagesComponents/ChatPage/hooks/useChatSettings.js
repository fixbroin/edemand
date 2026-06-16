import { useSelector } from 'react-redux';

/**
 * Reads chat_settings (with general_settings fallbacks) from Redux.
 * Returns strongly-typed, resolved values so callers never repeat the
 * `chatSettings?.x ?? generalSettings?.x` pattern.
 */
export const useChatSettings = () => {
    const settingsData = useSelector((state) => state?.settingsData);

    const chatSettings    = settingsData?.settings?.chat_settings;
    const generalSettings = settingsData?.settings?.general_settings;

    const pick = (key) => chatSettings?.[key] ?? generalSettings?.[key];

    return {
        MaxCharactersInTextMessage : pick('maxCharactersInATextMessage'),
        MaxFileSizeInMBCanBeSent   : pick('maxFileSizeInMBCanBeSent'),
        MaxFilsOrImagesInOneMessage: pick('maxFilesOrImagesInOneMessage'),
        isImageUploadEnabled       : Number(pick('enable_chat_image_upload')) === 1,
        isFileUploadEnabled        : Number(pick('enable_chat_file_upload'))  === 1,
        // Permission flags — default to allowed (1) when the key is absent
        allowPreBookingChat        : Number(chatSettings?.allow_pre_booking_chat  ?? 1) === 1,
        allowPostBookingChat       : Number(chatSettings?.allow_post_booking_chat ?? 1) === 1,
    };
};
