import { useEffect, useRef } from 'react';

/**
 * Handles incoming push/FCM notification payloads for the chat page.
 *
 * Rules:
 *  - Admin notifications   → append to chatMessages if isAdmin, else bump Redux admin badge
 *  - Provider notifications → append if it's the active chat, else bump the correct tab total
 *
 * The hook is purely side-effectful; it returns nothing.
 */
export const useChatNotifications = ({
    notificationData,
    isAdmin,
    filterType,
    activeChatRef,        // ref to the currently selected chat tab
    setChatMessages,
    setChatList,
    setTabTotals,
    scrollToBottom,
    markAsRead,
    onAdminNotificationUnread,
}) => {
    const lastProcessedRef = useRef(null);

    useEffect(() => {
        if (!notificationData) return;

        // Deduplicate: FCM can fire the same payload from multiple listeners
        const notificationKey = JSON.stringify(notificationData);
        if (lastProcessedRef.current === notificationKey) return;
        lastProcessedRef.current = notificationKey;

        // ── 1. Parse payload ─────────────────────────────────────────────────
        let nData = notificationData;
        if (nData.chat_message) {
            try {
                const parsed = typeof nData.chat_message === 'string'
                    ? JSON.parse(nData.chat_message)
                    : nData.chat_message;
                nData = { ...nData, ...parsed };
            } catch (e) {
                console.error('Error parsing chat_message:', e);
            }
        }

        // ── 2. Build the optimistic message object ───────────────────────────
        const newMessage = {
            sender_details: nData.sender_details || { id: nData.sender_id },
            timestamp     : nData.created_at || new Date().toISOString(),
        };

        if (nData.message) newMessage.message = nData.message;

        if (nData.file) {
            let parsedFile;
            if (typeof nData.file === 'string') {
                try { parsedFile = JSON.parse(nData.file); }
                catch { parsedFile = []; }
            } else {
                parsedFile = nData.file;
            }
            const arrayParsed  = Array.isArray(parsedFile) ? parsedFile : (parsedFile ? [parsedFile] : []);
            const flattenedFiles = arrayParsed.flat();
            newMessage.file = flattenedFiles.map(f => ({
                file     : f?.file      || f?.url,
                file_name: f?.file_name || f?.name,
                file_type: f?.file_type || f?.type,
            }));
        }

        // ── 3. Route the notification ────────────────────────────────────────
        const senderId = nData.sender_id || nData.sender_details?.id;
        const bookingId = nData.booking_id;         // may be null
        const isAdminNotification = !notificationData?.chat_user;

        if (isAdminNotification) {
            if (isAdmin) {
                setChatMessages(prev => [newMessage, ...prev]);
                scrollToBottom();
                markAsRead(null, true);
            } else if (onAdminNotificationUnread) {
                onAdminNotificationUnread();
            }
            return;
        }

        // Provider chat notification
        const isBookingChat    = bookingId !== null && bookingId !== undefined;
        const filterToUpdate   = isBookingChat ? 'booking' : 'pre_booking';
        const currentChat      = activeChatRef.current;
        const isCurrentChat    = currentChat &&
            currentChat.partner_id == senderId &&
            currentChat.booking_id == bookingId;

        if (isCurrentChat) {
            setChatMessages(prev => [newMessage, ...prev]);
            scrollToBottom();
            return;
        }

        // Not the active chat — update unread counts locally only
        if (filterType === filterToUpdate) {
            setChatList(prevList => {
                const exists = prevList.find(
                    c => c.partner_id == senderId && c.booking_id == bookingId
                );

                if (exists) {
                    if (Number(exists.un_read_chats || 0) === 0) {
                        setTabTotals(prev => ({
                            ...prev,
                            [filterToUpdate]: (prev[filterToUpdate] || 0) + 1,
                        }));
                    }
                    return prevList.map(c =>
                        c.partner_id == senderId && c.booking_id == bookingId
                            ? { ...c, un_read_chats: String(Number(c.un_read_chats || 0) + 1) }
                            : c
                    );
                }

                // Chat not yet in list — bump tab total only
                setTabTotals(prev => ({
                    ...prev,
                    [filterToUpdate]: (prev[filterToUpdate] || 0) + 1,
                }));
                return prevList;
            });
        } else {
            // Different tab entirely
            setTabTotals(prev => ({
                ...prev,
                [filterToUpdate]: (prev[filterToUpdate] || 0) + 1,
            }));
        }
    }, [notificationData]); // eslint-disable-line react-hooks/exhaustive-deps
};
