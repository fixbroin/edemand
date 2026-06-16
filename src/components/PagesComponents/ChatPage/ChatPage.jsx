/**
 * ChatPage — orchestrator only.
 *
 * All logic lives in custom hooks:
 *   useChatSettings      — resolves chat_settings / general_settings
 *   useChatList          — list fetch, filter, tab totals, markAsRead
 *   useChatMessages      — message fetch, pagination, send, blocking
 *   useChatNotifications — FCM notification routing (side-effect only)
 *
 * All heavy rendering lives in dedicated components:
 *   ChatMessageRenderer  — renders a single message (text + images + files)
 *   AttachedFilesPreview — pre-send file thumbnail strip
 *
 * Handlers that remain here (cheap, tightly coupled to Redux / dialogs):
 *   handleChangeTab, handleBackToList, handleAdminChat-redirect,
 *   handleFileAttachment, handleMessageChange,
 *   handleBlock / handleUnblock / handleDelete (dialog openers)
 *   handleReportSubmit / handleUnblockConfirm / handleDeleteConfirm
 *   handleGetBlockedProviders / handleUnblockProvider
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

// redux
import { getUserData } from '@/redux/reducers/userDataSlice';
import { getChatData, selectHelperState } from '@/redux/reducers/helperSlice';
import { selectChatUI, resetChatUI, setUnreadCounts, setChatPageActive } from '@/redux/reducers/chatUISlice';
import { store } from '@/redux/store';

// api
import {
    blockUserApi,
    unblockUserApi,
    deleteChatUserApi,
    getBlockedProvidersApi,
    getReportReasonsApi,
} from '@/api/apiRoutes';

// layout / shared
import Layout from '@/components/Layout/Layout';
import BreadCrumb from '@/components/ReUseableComponents/BreadCrumb';
import Lightbox from '@/components/ReUseableComponents/CustomLightBox/LightBox';
import withAuth from '@/components/Layout/withAuth';
import { isMobile, useRTL } from '@/utils/Helper';
import { useTranslation } from '@/components/Layout/TranslationContext';

// chat-page components
import AdminChat from './AdminChat';
import ChatList from './ChatList';
import ProviderChat from './ProviderChat';
import SideNavigation from '../ProfilePages/SideNavigation';
import ReportReasonModal from './ReportReasonModal';
import DeleteChatDialog from './DeleteChatDialog';
import UnblockDialog from './UnblockDialog';
import ChatMessageRenderer from './ChatMessageRenderer';

// custom hooks
import { useChatSettings } from './hooks/useChatSettings';
import { useChatList } from './hooks/useChatList';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatNotifications } from './hooks/useChatNotifications';

// ─────────────────────────────────────────────────────────────────────────────

const ChatPage = ({ notificationData }) => {
    const t = useTranslation();
    const router = useRouter();
    const isRTL = useRTL();
    const dispatch = useDispatch();

    const userData = useSelector(getUserData);
    const chatUI = useSelector(selectChatUI);
    const currentLanguage = useSelector((state) => state?.translation?.currentLanguage);
    const helperStateData = useSelector(selectHelperState);
    const newChat = helperStateData?.chatData;

    // ── layout / UI state ────────────────────────────────────────────────────
    const [mobileView, setMobileView] = useState(false);
    const [chatStep, setChatStep] = useState(chatUI.chatStep);
    const [isAdmin, setIsAdmin] = useState(chatUI.isAdmin);

    const [selectedChatTab, setSelectedChatTab] = useState(null);
    const [filterType, setFilterType] = useState('pre_booking');

    // lightbox
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentImages, setCurrentImages] = useState([]);

    // dialog visibility
    const [showReportModal, setShowReportModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showUnblockDialog, setShowUnblockDialog] = useState(false);
    const [blockedProviders, setBlockedProviders] = useState([]);
    const [isFetchingBlockedProviders, setIsFetchingBlockedProviders] = useState(false);
    const [newStoredChat, setNewStoredChat] = useState(null);

    const activeChatRef = useRef(null);
    const prevLangRef = useRef(null);
    const isAdminRef = useRef(isAdmin);

    // Keep refs in sync
    useEffect(() => { activeChatRef.current = selectedChatTab; }, [selectedChatTab]);
    useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    // ── settings ─────────────────────────────────────────────────────────────
    const {
        MaxCharactersInTextMessage,
        MaxFileSizeInMBCanBeSent,
        MaxFilsOrImagesInOneMessage,
        isImageUploadEnabled,
        isFileUploadEnabled,
        allowPreBookingChat,
        allowPostBookingChat,
    } = useChatSettings();

    // ── scrollToBottom (defined here, shared with hooks) ─────────────────────
    const scrollToBottom = useCallback(() => {
        const chatScreens = document.querySelectorAll('.chat_messages_screen');
        chatScreens?.forEach(screen => {
            screen.scrollTop = screen.scrollHeight;
        });
    }, []);

    // ── chat list hook ───────────────────────────────────────────────────────
    const {
        chatListRef,
        chatList, setChatList,
        listOffset, setListOffset,
        isLoadingMore,
        hasMoreChats, setHasMoreChats,
        isInitialLoading,
        tabTotals, setTabTotals,
        fetchList,
        fetchOtherTabUnreadCount,
        handleChatListScroll,
        markAsRead,
        appendNewChat: appendNewChatHelper,
    } = useChatList({ filterType, setFilterType });

    // Sync tabTotals to Redux so SideNavigation can read them
    useEffect(() => {
        dispatch(setUnreadCounts(tabTotals));
    }, [tabTotals, dispatch]);

    // Mark chat page active on mount
    useEffect(() => {
        dispatch(setChatPageActive(true));
        return () => dispatch(setChatPageActive(false));
    }, [dispatch]);

    // Thin wrapper so useChatMessages can call appendNewChat without knowing page internals
    const appendNewChat = (chat) => appendNewChatHelper(chat, {
        isAdmin, filterType, setFilterType, setSelectedChatTab,
        onAppendNewChatReduxUpdate: (chatWithUniqueId, uniqueId) => {
            dispatch({ type: 'chatUI/setSelectedChat', payload: chatWithUniqueId });
            dispatch({ type: 'chatUI/setSelectedChatId', payload: uniqueId });
            if (mobileView) {
                setChatStep('chat');
                dispatch({ type: 'chatUI/setChatStep', payload: 'chat' });
            }
        }
    });

    // ── messages hook ────────────────────────────────────────────────────────
    const {
        chatMessages, setChatMessages,
        hasMore, setHasMore,
        isLoading,
        isSending,
        message, setMessage,
        attachedFiles, setAttachedFiles,
        blockedStatus, setBlockedStatus,
        isBlocked,
        fetchChatMessages,
        handleAdminChat: fetchAdminMessages,
        handleScroll,
        handleSend,
    } = useChatMessages({
        isAdmin,
        selectedChatTab,
        newStoredChat,
        appendNewChat,
        scrollToBottom,
        currentUserId: userData?.id,
        onClearNewStoredChat: () => dispatch(getChatData(null))
    });

    // ── notifications hook (side-effect only) ────────────────────────────────
    useChatNotifications({
        notificationData,
        isAdmin,
        filterType,
        activeChatRef,
        setChatMessages,
        setChatList,
        setTabTotals,
        scrollToBottom,
        markAsRead,
        onAdminNotificationUnread: () => {
            dispatch(setUnreadCounts({
                admin: (store?.getState?.()?.chatUI?.unreadCounts?.admin || 0) + 1
            }));
        }
    });

    // ── handleAdminChat (page-level: also updates Redux + mobile step) ────────
    const handleAdminChat = () => {
        markAsRead(selectedChatTab, false);

        setIsAdmin(true);
        setSelectedChatTab(null);

        dispatch({ type: 'chatUI/setIsAdmin', payload: true });
        dispatch({ type: 'chatUI/setSelectedChat', payload: null });
        dispatch({ type: 'chatUI/setSelectedChatId', payload: null });
        dispatch(setUnreadCounts({ admin: 0 }));

        if (mobileView) {
            setChatStep('chat');
            dispatch({ type: 'chatUI/setChatStep', payload: 'chat' });
        }

        fetchAdminMessages();
    };

    // ── handleChangeTab ───────────────────────────────────────────────────────
    const handleChangeTab = (e, chat) => {
        e.preventDefault();
        markAsRead(selectedChatTab, isAdmin);

        setHasMore(true);
        setChatMessages([]);
        setIsAdmin(false);

        const uniqueId = chat.booking_id
            ? `${chat.partner_id}_${chat.booking_id}`
            : `${chat.partner_id}_pre`;

        setSelectedChatTab(chat);

        // Clear unread locally
        if (Number(chat.un_read_chats) > 0) {
            setChatList(prev => prev.map(c => {
                const cId = c.booking_id ? `${c.partner_id}_${c.booking_id}` : `${c.partner_id}_pre`;
                return (cId === uniqueId || c.uniqueId === uniqueId)
                    ? { ...c, un_read_chats: '0' }
                    : c;
            }));
            const chatFilter = chat.booking_id !== null ? 'booking' : 'pre_booking';
            setTabTotals(prev => ({
                ...prev,
                [chatFilter]: Math.max(0, (prev[chatFilter] || 0) - 1),
            }));
        }

        dispatch({ type: 'chatUI/setIsAdmin', payload: false });
        dispatch({ type: 'chatUI/setSelectedChat', payload: { ...chat, uniqueId } });
        dispatch({ type: 'chatUI/setSelectedChatId', payload: uniqueId });

        if (mobileView) {
            setChatStep('chat');
            dispatch({ type: 'chatUI/setChatStep', payload: 'chat' });
        }

        fetchChatMessages(chat, 0, false);
    };

    // ── handleBackToList ──────────────────────────────────────────────────────
    const handleBackToList = () => {
        markAsRead(selectedChatTab, isAdmin);
        setChatStep('list');
        dispatch({ type: 'chatUI/setChatStep', payload: 'list' });
        dispatch({ type: 'chatUI/setSelectedChatId', payload: null });
        dispatch({ type: 'chatUI/setSelectedChat', payload: null });
    };

    // ── handleFilterChange ────────────────────────────────────────────────────
    const handleFilterChange = (newFilter) => {
        markAsRead(selectedChatTab, isAdmin);
        setChatMessages([]);
        setSelectedChatTab(null);
        setListOffset(0);
        setHasMoreChats(true);

        dispatch({ type: 'chatUI/setSelectedChat', payload: null });
        dispatch({ type: 'chatUI/setSelectedChatId', payload: null });

        if (mobileView) {
            setChatStep('list');
            dispatch({ type: 'chatUI/setChatStep', payload: 'list' });
        }

        setFilterType(newFilter);
        fetchList(0, newFilter, true);
        fetchOtherTabUnreadCount(newFilter);
    };

    // ── file attachment ───────────────────────────────────────────────────────
    const handleFileAttachment = (e, type) => {
        if (type === 'image' && !isImageUploadEnabled) {
            toast.error(t('imageUploadIsDisabled')); return;
        }
        if (type === 'file' && !isFileUploadEnabled) {
            toast.error(t('fileUploadIsDisabled')); return;
        }

        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
        const files = Array.from(e.target.files);

        const validFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            const isImg = imageExtensions.includes(ext);
            const isDoc = documentExtensions.includes(ext);

            if (type === 'image' && !isImg) {
                toast.error(`${t('selectedFileNotSupported')}: ${file.name}`); return false;
            }
            if (type === 'file' && !isDoc) {
                toast.error(`${t('selectedFileNotSupported')}: ${file.name}`); return false;
            }
            if (!type && !isImg && !isDoc) {
                toast.error(`${t('selectedFileNotSupported')}: ${file.name}`); return false;
            }
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > MaxFileSizeInMBCanBeSent) {
                toast.error(`${t('file')} ${file.name} ${t('exceedTheMaximumSizeOf')} ${MaxFileSizeInMBCanBeSent}${t('mb')}.`);
                return false;
            }
            return true;
        });

        if (attachedFiles.length + validFiles.length > MaxFilsOrImagesInOneMessage) {
            toast.error(`${t('youCanOnlyAttachUpTo')} ${MaxFilsOrImagesInOneMessage} ${t('filesOrImagesInOneMessage')}.`);
            validFiles.splice(MaxFilsOrImagesInOneMessage - attachedFiles.length);
        }

        setAttachedFiles(prev => [...prev, ...validFiles]);
    };

    // ── message input change ──────────────────────────────────────────────────
    const handleMessageChange = (e) => {
        const val = e.target.value;
        if (val.length <= MaxCharactersInTextMessage) {
            setMessage(val);

            if (e.target?.tagName?.toLowerCase() === 'textarea') {
                e.target.style.height = '40px';
                const needsExpansion = e.target.scrollHeight > 40 || val.includes('\n');
                if (needsExpansion) {
                    e.target.classList.add('expanded');
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                } else {
                    e.target.classList.remove('expanded');
                    e.target.style.height = '40px';
                }
            }
        } else {
            toast.error(`${t('messageCannotExceed')} ${MaxCharactersInTextMessage} ${t('characters')}.`);
        }
    };

    // ── renderMessage (wraps ChatMessageRenderer as a callback for children) ──
    const renderMessage = (msg) => (
        <ChatMessageRenderer
            message={msg}
            currentUserId={userData?.id}
            onOpenLightbox={handleOpenLightbox}
        />
    );

    // ── lightbox ──────────────────────────────────────────────────────────────
    const handleOpenLightbox = useCallback((index, images) => {
        setCurrentImages(images?.map(img => ({
            src: img.file,
            alt: img.file_name,
            type: img.file_type,
        })));
        setCurrentImageIndex(index);
        setIsLightboxOpen(true);
    }, []);

    const handleCloseLightbox = useCallback(() => setIsLightboxOpen(false), []);

    // ── block / unblock / delete dialogs ─────────────────────────────────────
    const handleBlock = async () => {
        try {
            const response = await getReportReasonsApi();
            const hasReasons = response?.data?.length > 0;
            if (hasReasons) {
                setShowReportModal(true);
            } else {
                await handleReportSubmit({ reason_id: null, additional_info: "" });
            }
        } catch (error) {
            await handleReportSubmit({ reason_id: null, additional_info: "" });
        }
    };
    const handleUnblock = () => setShowUnblockDialog(true);
    const handleDelete = () => setShowDeleteDialog(true);

    const handleReportSubmit = async (data) => {
        try {
            const response = await blockUserApi({
                partner_id: selectedChatTab?.partner_id,
                reason_id: data.reason_id,
                additional_info: data.additional_info,
            });

            if (response?.error === false) {
                setBlockedStatus({
                    isBlocked: true,
                    blockedByUser: true,
                    blockedByProvider: false,
                    message: t('youHaveBlockedThisProvider'),
                });
                setBlockedProviders(prev => [
                    ...prev,
                    {
                        partner_id: selectedChatTab?.partner_id,
                        name: selectedChatTab?.partner_name,
                        image: selectedChatTab?.image,
                        reason: data.additional_info,
                    },
                ]);
                setShowReportModal(false);
                toast.success(t('providerBlocked'));

                if (chatMessages.length > 0) fetchChatMessages(selectedChatTab, 0, false);
                else setChatMessages([]);
            } else {
                toast.error(response?.message || t('errorBlockingProvider'));
            }
        } catch {
            toast.error(t('errorBlockingProvider'));
        }
    };

    const handleUnblockConfirm = async () => {
        try {
            const response = await unblockUserApi({ partner_id: selectedChatTab?.partner_id });
            if (response?.error === false) {
                setBlockedStatus({
                    isBlocked: response?.data?.is_blocked === 1,
                    blockedByUser: response?.data?.is_block_by_user === 1,
                    blockedByProvider: response?.data?.is_block_by_provider === 1,
                    message: response?.data?.is_block_by_provider === 1
                        ? t('providerHasBlockedYou')
                        : response?.data?.is_block_by_user === 1
                            ? t('youHaveBlockedThisProvider')
                            : '',
                });
                setShowUnblockDialog(false);
                toast.success(t('providerUnblocked'));
                fetchChatMessages(selectedChatTab, 0, false);
            } else {
                toast.error(response?.message || t('errorUnblockingProvider'));
            }
        } catch {
            toast.error(t('errorUnblockingProvider'));
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await deleteChatUserApi({
                partner_id: selectedChatTab?.partner_id,
                booking_id: selectedChatTab?.booking_id,
            });
            if (response?.error === false) {
                setChatMessages([]);
                setMessage('');
                setAttachedFiles([]);

                setChatList(prev => prev.filter(chat => {
                    if (selectedChatTab?.booking_id) {
                        return !(chat.partner_id === selectedChatTab.partner_id &&
                            chat.booking_id === selectedChatTab.booking_id);
                    }
                    return !(chat.partner_id === selectedChatTab.partner_id &&
                        chat.booking_id === null);
                }));

                setShowDeleteDialog(false);
                dispatch({ type: 'chatUI/setSelectedChat', payload: null });
                dispatch({ type: 'chatUI/setSelectedChatId', payload: null });

                if (mobileView) {
                    setChatStep('list');
                    dispatch({ type: 'chatUI/setChatStep', payload: 'list' });
                }

                toast.success(t('messagesDeletedSuccessfully'));
            } else {
                toast.error(response?.message || t('errorDeletingMessages'));
            }
        } catch {
            toast.error(t('errorDeletingMessages'));
        }
    };

    const handleGetBlockedProviders = async () => {
        setIsFetchingBlockedProviders(true);
        try {
            const response = await getBlockedProvidersApi();
            if (response?.error === false && Array.isArray(response?.data)) {
                setBlockedProviders(response.data);
            } else {
                setBlockedProviders([]);
            }
        } catch {
            setBlockedProviders([]);
            toast.error(t('errorFetchingBlockedProviders'));
        } finally {
            setIsFetchingBlockedProviders(false);
        }
    };

    const handleUnblockProvider = async (provider) => {
        try {
            const response = await unblockUserApi({ partner_id: provider.id });
            if (response?.error === false) {
                setBlockedProviders(prev => prev.filter(p => p.partner_id !== provider.partner_id));

                if (selectedChatTab?.partner_id === provider.partner_id) {
                    setBlockedStatus({ isBlocked: false, blockedByUser: false, blockedByProvider: false, message: '' });
                    fetchChatMessages(selectedChatTab, 0, false);
                }
                toast.success(t('providerUnblocked'));
            } else {
                toast.error(response?.message || t('errorUnblockingProvider'));
            }
        } catch {
            toast.error(t('errorUnblockingProvider'));
        }
    };

    // ── lifecycle: mobile detection ───────────────────────────────────────────
    useEffect(() => {
        const check = () => setMobileView(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ── lifecycle: sync Redux → local on mount ────────────────────────────────
    useEffect(() => {
        setIsAdmin(chatUI.isAdmin);
        setChatStep(chatUI.chatStep);
    }, [chatUI.isAdmin, chatUI.chatStep]);

    // ── lifecycle: redirect source (support / profile) → admin chat ───────────
    useEffect(() => {
        if (!router.isReady) return;
        const { source } = router.query;
        if (source === 'redirect' || source === 'profile' || source === 'support') {
            setIsAdmin(true);
            setSelectedChatTab(null);
            setChatMessages([]);
            dispatch({ type: 'chatUI/setIsAdmin', payload: true });
            setChatStep('chat');
            dispatch({ type: 'chatUI/setChatStep', payload: 'chat' });
            setTimeout(() => fetchChatMessages(null, 0, false), 150);
        }
    }, [router.isReady, router.query]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── lifecycle: restore selected chat from Redux on mount ──────────────────
    useEffect(() => {
        if (chatUI.selectedChat) {
            setSelectedChatTab(chatUI.selectedChat);
            setIsAdmin(chatUI.isAdmin);
            setChatStep(chatUI.chatStep);
            setTimeout(() => fetchChatMessages(chatUI.selectedChat, 0, false), 150);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── lifecycle: route change → reset ──────────────────────────────────────
    useEffect(() => {
        const handleRouteChangeStart = (url) => {
            // Only reset if we are navigating away from the chat and not just changing query params
            if (!url.includes('/chats')) {
                markAsRead(activeChatRef.current, chatUI.isAdmin);
                setChatMessages([]);
                setSelectedChatTab(null);
                setMessage('');
                setAttachedFiles([]);
                dispatch(resetChatUI());
            }
        };

        router.events.on('routeChangeStart', handleRouteChangeStart);

        // Component unmount cleanup
        return () => {
            router.events.off('routeChangeStart', handleRouteChangeStart);
        };
    }, [router.events, dispatch, markAsRead, chatUI.isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Run unmount cleanup of state ONLY when actually leaving the component entirely
        return () => {
            markAsRead(activeChatRef.current, isAdminRef.current);
            dispatch(resetChatUI());
        };
    }, [dispatch, markAsRead]);

    // ── lifecycle: newChat from Redux helper (navigate-to-chat) ───────────────
    useEffect(() => {
        if (!newChat) return;
        if (!chatUI.selectedChat) {
            setNewStoredChat(newChat);
            setSelectedChatTab(newChat);
            setIsAdmin(false);
            setChatMessages([]);

            const uniqueId = newChat.booking_id
                ? `${newChat.partner_id}_${newChat.booking_id}`
                : `${newChat.partner_id}_pre`;

            dispatch({ type: 'chatUI/setSelectedChat', payload: { ...newChat, uniqueId } });
            dispatch({ type: 'chatUI/setSelectedChatId', payload: uniqueId });
            setChatStep('chat');
            dispatch({ type: 'chatUI/setChatStep', payload: 'chat' });
        } else {
            setNewStoredChat(newChat);
        }
    }, [newChat]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── lifecycle: refetch on language change ─────────────────────────────────
    useEffect(() => {
        const langCode = currentLanguage?.langCode;
        if (prevLangRef.current === null) { prevLangRef.current = langCode; return; }
        if (!langCode || langCode === prevLangRef.current) return;

        prevLangRef.current = langCode;
        setListOffset(0);
        setHasMoreChats(true);
        fetchList(0, filterType, true);

        if (isAdmin) fetchAdminMessages();
        else if (selectedChatTab) fetchChatMessages(selectedChatTab, 0, false);
    }, [currentLanguage?.langCode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── lifecycle: scroll after chatStep changes ──────────────────────────────
    useEffect(() => {
        if (chatStep === 'chat') setTimeout(scrollToBottom, 150);
    }, [chatStep, scrollToBottom]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Layout>
            <BreadCrumb firstEle={t('chats')} firstEleLink="/chats" isMobile={isMobile} />

            <section className='container mb-0 md:mb-20'>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-3 hidden md:block">
                        <SideNavigation />
                    </div>

                    <div className='lg:col-span-9'>
                        <div className='flex flex-col md:flex-row border mx-auto rounded-lg md:h-[650px] h-[calc(100dvh-280px)] overflow-hidden'>

                            {/* Chat list panel */}
                            {(!mobileView || (mobileView && chatStep === 'list')) &&
                                !isAdmin &&
                                router.query.source !== 'support' && (
                                    <ChatList
                                        isAdmin={isAdmin}
                                        chatListRef={chatListRef}
                                        handleChatListScroll={handleChatListScroll}
                                        chatList={chatList}
                                        handleAdminChat={handleAdminChat}
                                        selectedChatTab={selectedChatTab}
                                        handleChangeTab={handleChangeTab}
                                        isLoadingMore={isLoadingMore}
                                        onFilterChange={handleFilterChange}
                                        filterType={filterType}
                                        isLoading={isInitialLoading}
                                        blockedProviders={blockedProviders}
                                        isFetchingBlockedProviders={isFetchingBlockedProviders}
                                        onUnblockProvider={handleUnblockProvider}
                                        onGetBlockedProviders={handleGetBlockedProviders}
                                        setBlockedStatus={setBlockedStatus}
                                        fetchChatMessages={fetchChatMessages}
                                        tabTotals={tabTotals}
                                        allowPreBookingChat={allowPreBookingChat}
                                        allowPostBookingChat={allowPostBookingChat}
                                    />
                                )}

                            {/* Chat panel (admin or provider) */}
                            {(!mobileView || (mobileView && chatStep === 'chat')) && (
                                isAdmin ? (
                                    <AdminChat
                                        key="admin-chat-component"
                                        isLoading={isLoading}
                                        handleScroll={handleScroll}
                                        chatMessages={chatMessages}
                                        attachedFiles={attachedFiles}
                                        handleFileAttachment={handleFileAttachment}
                                        onRemoveFile={(index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                                        message={message}
                                        handleMessageChange={handleMessageChange}
                                        MaxCharactersInTextMessage={MaxCharactersInTextMessage}
                                        handleSend={handleSend}
                                        isSending={isSending}
                                        userData={userData}
                                        renderMessage={renderMessage}
                                        className="w-full"
                                    />
                                ) : (
                                    <ProviderChat
                                        key={`provider-chat-${selectedChatTab?.partner_id}-${selectedChatTab?.booking_id || 'pre'}`}
                                        handleScroll={handleScroll}
                                        isLoading={isLoading}
                                        chatMessages={chatMessages}
                                        attachedFiles={attachedFiles}
                                        handleFileAttachment={handleFileAttachment}
                                        onRemoveFile={(index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                                        message={message}
                                        handleMessageChange={handleMessageChange}
                                        MaxCharactersInTextMessage={MaxCharactersInTextMessage}
                                        handleSend={handleSend}
                                        isSending={isSending}
                                        userData={userData}
                                        renderMessage={renderMessage}
                                        selectedChatTab={selectedChatTab}
                                        chatList={chatList}
                                        handleOpenLightbox={handleOpenLightbox}
                                        hasMore={hasMore}
                                        setMessage={setMessage}
                                        setChatMessages={setChatMessages}
                                        setChatList={setChatList}
                                        blockedStatus={blockedStatus}
                                        setBlockedStatus={setBlockedStatus}
                                        onBlock={handleBlock}
                                        onUnblock={handleUnblock}
                                        onDelete={handleDelete}
                                        mobileView={mobileView}
                                        handleBackToList={handleBackToList}
                                        allowPreBookingChat={allowPreBookingChat}
                                        allowPostBookingChat={allowPostBookingChat}
                                        className="w-full"
                                    />
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Lightbox */}
                {isLightboxOpen && (
                    <Lightbox
                        isLightboxOpen={isLightboxOpen}
                        images={currentImages}
                        initialIndex={currentImageIndex}
                        onClose={handleCloseLightbox}
                    />
                )}

                {/* Dialogs */}
                <ReportReasonModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    onSubmit={handleReportSubmit}
                />
                <DeleteChatDialog
                    isOpen={showDeleteDialog}
                    onClose={() => setShowDeleteDialog(false)}
                    onConfirm={handleDeleteConfirm}
                />
                <UnblockDialog
                    isOpen={showUnblockDialog}
                    onClose={() => setShowUnblockDialog(false)}
                    onConfirm={handleUnblockConfirm}
                />
            </section>
        </Layout>
    );
};

export default withAuth(ChatPage);