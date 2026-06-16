import React from 'react';
import { IoMdDownload } from 'react-icons/io';
import CustomImageTag from '@/components/ReUseableComponents/CustomImageTag';
import { useTranslation } from '@/components/Layout/TranslationContext';
import dayjs from 'dayjs';
import fileDownload from 'js-file-download';

// ─── helpers ──────────────────────────────────────────────────────────────────

const parseFiles = (rawFile) => {
    if (typeof rawFile === 'string') {
        try { return JSON.parse(rawFile); }
        catch { return []; }
    }
    if (Array.isArray(rawFile)) return rawFile;
    return [];
};

const useFormatTime = () => {
    const t = useTranslation();
    return (timestamp) => {
        const now         = dayjs();
        const messageTime = dayjs(timestamp);
        const diffSeconds = now.diff(messageTime, 'second');
        const diffHours   = now.diff(messageTime, 'hour');

        if (diffSeconds < 1)    return `1s ${t('ago')}`;
        if (diffSeconds < 60)   return `${diffSeconds}s ${t('ago')}`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ${t('ago')}`;
        if (diffHours   < 12)   return `${Math.floor(diffSeconds / 3600)}h ago`;
        if (diffHours   < 24 && now.isSame(messageTime, 'day'))
            return `${t('todayAt')} ${messageTime.format('h:mm A')}`;
        if (diffHours   < 48 && now.isSame(messageTime.add(1, 'day'), 'day'))
            return `${t('yesterdayAt')} ${messageTime.format('h:mm A')}`;
        return messageTime.format('MM/DD/YYYY');
    };
};

// ─── ImageGrid ────────────────────────────────────────────────────────────────

const ImageGrid = ({ imageFiles, isUserSender, onOpenLightbox }) => {
    if (!imageFiles || imageFiles.length === 0) return null;

    return (
        <div className={`flex items-center ${isUserSender ? 'justify-end' : 'justify-start'} gap-2 flex-wrap w-[70%] mb-1`}>
            {imageFiles.slice(0, 4).map((file, index) => {
                // 4th slot with overflow indicator
                if (index === 3 && imageFiles.length > 4) {
                    return (
                        <div key={index} className='relative cursor-pointer' onClick={() => onOpenLightbox(index, imageFiles)}>
                            <div className='absolute top-0 left-0 right-0 bottom-0 m-auto h-full w-full flex items-center justify-center chat_image_overlay z-10 rounded-sm'>
                                <h4 className='text-white font-[600] text-2xl'>+{imageFiles.length - 3}</h4>
                            </div>
                            <CustomImageTag
                                src={file.file}
                                alt={file.file_name}
                                className="image-item w-[160px] aspect-blog-related border rounded-sm"
                                imgClassName="rounded-sm"
                            />
                        </div>
                    );
                }

                return (
                    <div key={index} onClick={() => onOpenLightbox(index, imageFiles)} className='cursor-pointer'>
                        {file.file_type === 'image/svg+xml' ? (
                            <CustomImageTag
                                src={file.file}
                                alt={file.file_name}
                                className="image-item svg-item w-[160px] aspect-blog-related border rounded-sm object-fill"
                                imgClassName="object-fill rounded-sm"
                            />
                        ) : (
                            <CustomImageTag
                                src={file.file}
                                alt={file.file_name}
                                className="image-item w-[160px] aspect-blog-related border rounded-sm"
                                imgClassName="rounded-sm"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── NonImageFiles ────────────────────────────────────────────────────────────

const NonImageFiles = ({ allFiles, imageFiles }) => {
    const t = useTranslation();

    if (!Array.isArray(allFiles)) return null;

    const validFiles = allFiles.filter(
        file => file &&
            Object.keys(file).length > 0 &&
            file.file &&
            file.file_name &&
            !imageFiles.includes(file)
    );

    if (validFiles.length === 0) return null;

    return validFiles.map((file, index) =>
        file.file_type === 'video/mp4' ? (
            <div key={index} className="file-item py-2 flex items-center flex-col gap-1 mb-1">
                <video controls className='w-[310px] rounded-sm'>
                    <source src={file.file} type="video/mp4" />
                    {t('yourBrowserDoesNotSupport')}
                </video>
                <span className="file-info px-2 text-[14px] sm:text-[16px]">{file.file_name}</span>
            </div>
        ) : (
            <button
                key={index}
                className="file-item p-2 flex items-center gap-1"
                onClick={() => fileDownload(file.file, file.file_name)}
            >
                <div className="file-info text-[14px] sm:text-[16px]">{file.file_name}</div>
                <span className="download-button"><IoMdDownload /></span>
            </button>
        )
    );
};

// ─── Timestamp ────────────────────────────────────────────────────────────────

const Timestamp = ({ timestamp }) => {
    const formatTime = useFormatTime();
    return (
        <span className='text-[12px] description_color mb-2'>
            {formatTime(timestamp)}
        </span>
    );
};

// ─── ChatMessageRenderer ──────────────────────────────────────────────────────

/**
 * Pure presentational component.  Renders a single chat message (text, images,
 * files, or any combination).  All logic (parsing, layout decisions) lives here.
 *
 * Props:
 *  - message        : the raw message object from the API
 *  - currentUserId  : userData?.id — used to determine sender alignment
 *  - onOpenLightbox : (index, imageFiles[]) => void
 */
const ChatMessageRenderer = ({ message, currentUserId, onOpenLightbox }) => {
    const files       = parseFiles(message?.file);
    const imageFiles  = files.filter(f => f.file_type?.startsWith('image/'));

    const hasText  = Boolean(message?.message);
    const hasFiles = files.length > 0;

    const isUserSender =
        currentUserId === message?.sender_id ||
        currentUserId === message?.sender_details?.id;

    const alignClass = `flex flex-col w-full ${isUserSender ? 'justify-end items-end' : 'justify-start items-start'}`;

    if (!hasText && !hasFiles) return null;

    return (
        <div className={alignClass}>
            <div className={`flex flex-col gap-1 ${isUserSender ? 'justify-end items-end' : ''}`}>
                {/* Text bubble */}
                {hasText && message.message.trim() !== '' && (
                    <p className={`px-6 py-2 max-w-[230px] sm:max-w-[370px] xl:max-w-[440px] my-1 whitespace-pre-line break-words message
                        ${isUserSender ? 'primary_bg_color text-white' : 'chat_received_bubble text-black'}`}>
                        {message.message}
                    </p>
                )}
            </div>

            {/* Images */}
            <ImageGrid
                imageFiles={imageFiles}
                isUserSender={isUserSender}
                onOpenLightbox={onOpenLightbox}
            />

            {/* Non-image files */}
            {hasFiles && (
                <NonImageFiles allFiles={files} imageFiles={imageFiles} />
            )}

            <Timestamp timestamp={message.created_at} />
        </div>
    );
};

export default ChatMessageRenderer;
