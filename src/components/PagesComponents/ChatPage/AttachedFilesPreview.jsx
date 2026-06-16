import React from 'react';
import { FaFile } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import CustomImageTag from '@/components/ReUseableComponents/CustomImageTag';

/**
 * Renders the grid of files that the user has attached before sending.
 * Each card shows a preview (image thumbnail or file icon) with a remove button.
 *
 * Props:
 *  - files         : File[]  — the raw File objects from the input
 *  - onRemove      : (index: number) => void
 */
const AttachedFilesPreview = ({ files, onRemove }) => {
    if (!files || files.length === 0) return null;

    return (
        <div className="w-full border-t px-3 py-2 flex-wrap flex gap-2 overflow-auto max-h-[200px] card_bg">
            {files.map((file, index) => {
                const isImage = file.type.startsWith('image/');

                if (isImage) {
                    return (
                        <div
                            key={index}
                            className="file-card image-card relative flex flex-col gap-2 justify-center items-center border border-gray-300 rounded-sm p-1 card_bg"
                        >
                            <CustomImageTag
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className='w-[160px] aspect-blog-related'
                            />
                            <span>{file.name}</span>
                            <button
                                onClick={() => onRemove(index)}
                                className='absolute -top-1 -right-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-full'
                            >
                                <IoMdClose size={14} />
                            </button>
                        </div>
                    );
                }

                return (
                    <div
                        key={index}
                        className="file-card relative flex flex-col gap-2 justify-center items-center border border-gray-300 rounded-sm p-1 card_bg"
                    >
                        <FaFile size={24} />
                        <span>{file.name}</span>
                        <button
                            onClick={() => onRemove(index)}
                            className='absolute -top-1 -right-1 bg-gray-200 p-1 rounded-full'
                        >
                            <IoMdClose size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default AttachedFilesPreview;
