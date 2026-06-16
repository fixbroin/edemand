import { useState, useEffect, useCallback } from 'react';
import { fetch_chat_history, send_chat_message } from '@/api/apiRoutes';
import { useTranslation } from '@/components/Layout/TranslationContext';
import { toast } from 'sonner';

const MSG_LIMIT = 25;

/**
 * Owns all message-level state: fetching, pagination, sending, blocking,
 * and the scrollToBottom utility.
 *
 * What it does NOT own:
 *  - Redux dispatch (passed in from the page)
 *  - chat-list state
 *  - notification routing
 */
export const useChatMessages = ({
    isAdmin,
    selectedChatTab,
    newStoredChat,
    appendNewChat,
    scrollToBottom,
    currentUserId,
    onClearNewStoredChat,
}) => {
    const t = useTranslation();

    const [chatMessages,  setChatMessages]  = useState([]);
    const [offset,        setOffset]        = useState(0);
    const [hasMore,       setHasMore]       = useState(true);
    const [isLoading,     setIsLoading]     = useState(false);
    const [isSending,     setIsSending]     = useState(false);

    const [message,       setMessage]       = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);

    const [blockedStatus, setBlockedStatus] = useState({
        isBlocked       : false,
        blockedByUser   : false,
        blockedByProvider: false,
        message         : '',
    });
    // Derived — no separate isBlocked useState needed
    const isBlocked = blockedStatus.isBlocked;

    const [prevChatContext, setPrevChatContext] = useState({ isAdmin: false, chatId: null });

    // ─── fetch messages ────────────────────────────────────────────────────────
    const fetchChatMessages = useCallback(async (selectedChat, newOffset = 0, append = false) => {
        if (isLoading && !append) return;

        const contextKey = isAdmin
            ? 'admin'
            : selectedChat
                ? `provider-${selectedChat.partner_id}-${selectedChat.booking_id || 'pre'}`
                : null;

        if (!contextKey) return;

        if (!append) setChatMessages([]);

        setIsLoading(true);
        try {
            const payload = {
                limit : MSG_LIMIT.toString(),
                offset: newOffset.toString(),
            };

            if (isAdmin) {
                payload.type = '0';
            } else if (selectedChat) {
                payload.type        = '1';
                payload.provider_id = selectedChat.partner_id;
                if (selectedChat.booking_id) payload.booking_id = selectedChat.booking_id;
            }

            const response = await fetch_chat_history(payload);

            // Stale-context guard
            const currentContextKey = isAdmin
                ? 'admin'
                : selectedChat
                    ? `provider-${selectedChat.partner_id}-${selectedChat.booking_id || 'pre'}`
                    : null;
            if (contextKey !== currentContextKey) return;

            // Blocking status
            if (!isAdmin && response) {
                const blocked            = response.is_blocked         === 1;
                const isBlockedByUser    = response.is_block_by_user   === 1;
                const isBlockedByProvider= response.is_block_by_provider === 1;

                setBlockedStatus({
                    isBlocked       : blocked,
                    blockedByUser   : isBlockedByUser,
                    blockedByProvider: isBlockedByProvider,
                    message         : isBlockedByUser
                        ? t('youHaveBlockedThisProvider')
                        : isBlockedByProvider
                            ? t('providerHasBlockedYou')
                            : '',
                });
            }

            const messages = response?.data || [];
            if (messages.length < MSG_LIMIT) setHasMore(false);

            if (append) {
                setChatMessages(prev => [...prev, ...messages]);
            } else {
                setChatMessages(messages);
            }

            setOffset(newOffset);
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            if (!append) setChatMessages([]);
            toast.error(t('errorFetchingMessages'));
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin, isLoading, t, scrollToBottom]);

    // ─── handleAdminChat (special direct fetch, keeps its own logic) ──────────
    const handleAdminChat = useCallback(() => {
        setOffset(0);
        setHasMore(true);
        setChatMessages([]);
        setIsLoading(true);

        const adminPayload = { type: '0', limit: MSG_LIMIT.toString(), offset: '0' };

        fetch_chat_history(adminPayload)
            .then(response => {
                if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
                    setChatMessages(response.data);
                    setHasMore(response.data.length === MSG_LIMIT);
                } else {
                    setChatMessages([]);
                }
            })
            .catch(error => {
                console.error('Error fetching admin chat:', error);
                toast.error(t('errorFetchingMessages'));
                setChatMessages([]);
            })
            .finally(() => setIsLoading(false));
    }, [t]);

    // ─── context-change effect: fetch on chat/admin switch ────────────────────
    useEffect(() => {
        const currentChatKey = isAdmin
            ? 'admin'
            : selectedChatTab
                ? `provider-${selectedChatTab.partner_id}-${selectedChatTab.booking_id || 'pre'}`
                : null;

        if (!currentChatKey) return;
        if (currentChatKey === prevChatContext.chatId && chatMessages.length > 0) return;

        setOffset(0);
        setHasMore(true);

        if (currentChatKey !== prevChatContext.chatId) {
            setChatMessages([]);
            setIsLoading(true);
        }

        setPrevChatContext({ isAdmin, chatId: currentChatKey });

        if (isAdmin) {
            handleAdminChat();
        } else {
            fetchChatMessages(selectedChatTab, 0, false);
        }
    }, [isAdmin, selectedChatTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── scroll after messages update ────────────────────────────────────────
    useEffect(() => {
        if (chatMessages.length > 0) setTimeout(scrollToBottom, 50);
    }, [chatMessages, scrollToBottom]);

    // ─── cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            setChatMessages([]);
            setOffset(0);
            setHasMore(true);
            setIsLoading(false);
            setPrevChatContext({ isAdmin: false, chatId: null });
        };
    }, []);

    // ─── handleScroll (infinite scroll upward) ────────────────────────────────
    const handleScroll = (e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop === 0 && !isLoading && hasMore) {
            fetchChatMessages(selectedChatTab, offset + 1, true);
        }
    };

    // ─── send ─────────────────────────────────────────────────────────────────
    const handleSend = async (questionText) => {
        const messageToSend = typeof questionText === 'string' ? questionText : message;

        if (messageToSend.trim() === '' && attachedFiles.length === 0) {
            toast.error(t('pleaseEnterMessageOrAttachFile'));
            return;
        }

        setIsSending(true);

        // Optimistic preview — track URLs for later revocation
        const objectUrls = [];
        const newMessage = {
            message       : messageToSend,
            file          : attachedFiles.map(file => {
                const url = URL.createObjectURL(file);
                objectUrls.push(url);
                return { file: url, file_name: file.name, file_type: file.type };
            }),
            sender_details: { id: currentUserId },
            sender_id     : currentUserId,
        };

        try {
            let receiverId  = selectedChatTab?.partner_id;
            let bookingId   = selectedChatTab?.booking_id ?? null;
            const receiverType = isAdmin ? '0' : '1';

            if (isAdmin) { receiverId = null; bookingId = null; }

            await send_chat_message({
                receiver_id  : receiverId,
                booking_id   : bookingId,
                receiver_type: receiverType,
                message      : messageToSend,
                attachment   : attachedFiles,
            });

            setChatMessages(prev => [newMessage, ...prev]);
            setMessage('');
            setAttachedFiles([]);

            // Revoke blob URLs — prevents memory leaks on repeated file sends
            objectUrls.forEach(url => URL.revokeObjectURL(url));

            // Reset textarea height to match original monolithic component features
            const textareas = document.querySelectorAll('textarea.input-like');
            textareas.forEach(textarea => {
                textarea.style.height = '40px';
                textarea.classList.remove('expanded');
            });

            scrollToBottom();

            // If a brand-new chat context was stored, register it in the list
            if (!isAdmin && newStoredChat) {
                const bookingMatch = newStoredChat.booking_id !== null || selectedChatTab?.booking_id !== null;
                const idMatch = bookingMatch
                    ? newStoredChat.booking_id === selectedChatTab?.booking_id
                    : newStoredChat.partner_id === selectedChatTab?.partner_id;

                if (idMatch) {
                    appendNewChat(newStoredChat);
                } else if (onClearNewStoredChat) {
                    onClearNewStoredChat();
                }
            }
        } catch (error) {
            console.error('handleSend error:', error);
            toast.error(t('failedToSendMessage'));
        } finally {
            setIsSending(false);
        }
    };

    return {
        // state
        chatMessages,   setChatMessages,
        offset,         setOffset,
        hasMore,        setHasMore,
        isLoading,      setIsLoading,
        isSending,
        message,        setMessage,
        attachedFiles,  setAttachedFiles,
        blockedStatus,  setBlockedStatus,
        isBlocked,
        prevChatContext, setPrevChatContext,
        // actions
        fetchChatMessages,
        handleAdminChat,
        handleScroll,
        handleSend,
    };
};
