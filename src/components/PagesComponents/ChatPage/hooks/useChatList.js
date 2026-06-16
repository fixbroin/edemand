import { useState, useRef, useEffect, useCallback } from 'react';
import { fetch_providr_chat_list, markMessageAsReadApi } from '@/api/apiRoutes';

const LIST_LIMIT = 10;

/**
 * Owns the chat list panel: fetching, filtering, pagination, tab unread totals,
 * and the markAsRead helper.
 *
 * Returns everything the page needs to drive ChatList and related tab state.
 */
export const useChatList = ({ filterType: externalFilterType, setFilterType }) => {
    const chatListRef = useRef(null);

    const [chatList,      setChatList]      = useState([]);
    const [listOffset,    setListOffset]    = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreChats,  setHasMoreChats]  = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [tabTotals,     setTabTotals]     = useState({ pre_booking: 0, booking: 0 });

    // ─── markAsRead ───────────────────────────────────────────────────────────
    const markAsRead = useCallback((chat, admin) => {
        if (!chat && !admin) return;

        const params = {};
        if (admin) {
            params.type = '0';
        } else {
            params.type = '1';
            if (chat?.booking_id)  params.booking_id  = chat.booking_id;
            else if (chat?.partner_id) params.provider_id = chat.partner_id;
        }

        markMessageAsReadApi(params).catch(err =>
            console.error('Error marking messages as read:', err)
        );
    }, []);

    // ─── fetch the OTHER tab's unread count (lightweight call) ───────────────
    const fetchOtherTabUnreadCount = async (activeFilter) => {
        const otherFilter = activeFilter === 'pre_booking' ? 'booking' : 'pre_booking';
        try {
            const response = await fetch_providr_chat_list({ limit: '1', offset: '0', filter_type: otherFilter });
            if (response?.total_unread_users !== undefined) {
                setTabTotals(prev => ({ ...prev, [otherFilter]: response.total_unread_users }));
            }
        } catch (error) {
            console.error('Error fetching other tab unread count:', error);
        }
    };

    // ─── fetchList ────────────────────────────────────────────────────────────
    const fetchList = async (offset = 0, filter = externalFilterType, isFilterChange = false) => {
        if (!isFilterChange && (!hasMoreChats || isLoadingMore)) return;

        setIsLoadingMore(true);
        setIsInitialLoading(offset === 0);

        try {
            const response = await fetch_providr_chat_list({
                limit      : LIST_LIMIT.toString(),
                offset     : offset.toString(),
                filter_type: filter,
            });

            const list = Array.isArray(response?.data) ? response.data : [];

            if (response?.total_unread_users !== undefined) {
                setTabTotals(prev => ({ ...prev, [filter]: response.total_unread_users }));
            }

            const listWithIds = list.map(chat => ({
                ...chat,
                uniqueId: chat.booking_id
                    ? `${chat.partner_id}_${chat.booking_id}`
                    : `${chat.partner_id}_pre`,
            }));

            setChatList(prev => offset === 0 ? listWithIds : [...prev, ...listWithIds]);
            setListOffset(prev => prev + list.length);
            setHasMoreChats(list.length === LIST_LIMIT);
        } catch (error) {
            console.error('Error fetching chat list:', error);
        } finally {
            setIsLoadingMore(false);
            setIsInitialLoading(false);
        }
    };

    // ─── handleChatListScroll (infinite-scroll downward) ─────────────────────
    const handleChatListScroll = () => {
        if (chatListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
            if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoadingMore && hasMoreChats) {
                fetchList(listOffset, externalFilterType, false);
            }
        }
    };

    // ─── handleFilterChange ───────────────────────────────────────────────────
    /**
     * Called with the new filter value.  The page must additionally:
     *  - markAsRead(selectedChatTab, isAdmin)
     *  - reset selectedChatTab to null
     *  - reset Redux selectedChat / selectedChatId
     *  - go back to list on mobile
     */
    const handleFilterChange = (newFilter, { onBeforeChange } = {}) => {
        onBeforeChange?.();
        setListOffset(0);
        setHasMoreChats(true);
        setFilterType(newFilter);
        fetchList(0, newFilter, true);
        fetchOtherTabUnreadCount(newFilter);
    };

    // ─── mount: initial fetch ──────────────────────────────
    useEffect(() => {
        fetchList(0, externalFilterType, true);
        fetchOtherTabUnreadCount(externalFilterType);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── appendNewChat helper (used after first message in a new conversation) ─
    const appendNewChat = (newChat, {
        isAdmin,
        filterType,
        setFilterType,
        setSelectedChatTab,
        onAppendNewChatReduxUpdate,
    }) => {
        if (isAdmin) return;

        const isPostBooking     = newChat.booking_id !== null;
        const correctFilterType = isPostBooking ? 'booking' : 'pre_booking';

        if (filterType !== correctFilterType) {
            setFilterType(correctFilterType);
            fetchList(0, correctFilterType, true);
        }

        setChatList(prevChatList => {
            const uniqueId = newChat.booking_id
                ? `${newChat.partner_id}_${newChat.booking_id}`
                : `${newChat.partner_id}_pre`;

            const chatWithUniqueId = { ...newChat, uniqueId };

            setSelectedChatTab(chatWithUniqueId);

            if (onAppendNewChatReduxUpdate) {
                onAppendNewChatReduxUpdate(chatWithUniqueId, uniqueId);
            }

            const existingIndex = prevChatList.findIndex(chat =>
                newChat.booking_id !== null
                    ? chat.partner_id === newChat.partner_id && chat.booking_id === newChat.booking_id
                    : chat.partner_id === newChat.partner_id && chat.booking_id === null
            );

            if (existingIndex !== -1) {
                const updated = [...prevChatList];
                updated[existingIndex] = chatWithUniqueId;
                return updated;
            }
            return [chatWithUniqueId, ...prevChatList];
        });
    };

    return {
        chatListRef,
        chatList,   setChatList,
        listOffset, setListOffset,
        isLoadingMore,
        hasMoreChats, setHasMoreChats,
        isInitialLoading,
        tabTotals,  setTabTotals,
        // actions
        fetchList,
        fetchOtherTabUnreadCount,
        handleChatListScroll,
        handleFilterChange,
        markAsRead,
        appendNewChat,
    };
};
