import { useTranslation } from '@/components/Layout/TranslationContext';
import React, { useEffect, useRef } from 'react'
import ChatQuestions from './ChatQuestions';
import MessageSkeleton from './MessageSkeleton';
import ChatInput from './ChatInput';

const AdminChat = ({ handleScroll, isLoading, chatMessages, attachedFiles, handleFileAttachment, onRemoveFile, message, handleMessageChange, MaxCharactersInTextMessage, handleSend, isSending, userData, renderMessage }) => {

    const t = useTranslation();
    const chatContentRef = useRef(null);

    // Auto scroll to bottom when messages change
    useEffect(() => {
        if (chatContentRef.current) {
            const chatScreen = document.querySelector('.chat_messages_screen');
            if (chatScreen) {
                chatScreen.scrollTop = chatScreen.scrollHeight;
            }
        }
    }, [chatMessages?.length]);

    // Handle direct question submission (auto-send)
    // Pass the question string directly — handleSend accepts a plain string
    const handleQuestionSubmit = (question) => {
        handleSend(question);
    };

    return (
        <div className='flex-1 flex flex-col h-full'>
            <div className='flex p-3 items-center border-b border-gray-300 gap-3'>
                <div className='flex flex-col gap-1 items-start'>
                    <h2 className='text-xl'>{t("customerSupport")}</h2>
                </div>
            </div>
            <div
                ref={chatContentRef}
                className='flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-auto chatsWrapper justify-start chat_messages_screen'
                onScroll={handleScroll}
            >

                {isLoading ? (
                    <MessageSkeleton />
                ) : chatMessages.length === 0 ? (
                    // Show ChatQuestions when there are no messages
                    <ChatQuestions
                        selectedChatTab={null}
                        onQuestionSubmit={handleQuestionSubmit}
                        isAdmin={true}
                    />
                ) : (
                    <div className='flex flex-col-reverse'>
                        {chatMessages.map((message, index) => (
                            <div key={index} className={`flex ${(userData?.id === message?.sender_id || userData?.id === message?.sender_details?.id) ? 'justify-end senderMsg' : 'justify-start otherMsg'}`}>
                                {renderMessage(message)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <ChatInput
                attachedFiles={attachedFiles}
                onRemoveFile={onRemoveFile}
                handleFileAttachment={handleFileAttachment}
                message={message}
                handleMessageChange={handleMessageChange}
                MaxCharactersInTextMessage={MaxCharactersInTextMessage}
                handleSend={handleSend}
                isSending={isSending}
                inputId="adminFileAttachment"
            />
        </div>
    );
};

export default AdminChat;