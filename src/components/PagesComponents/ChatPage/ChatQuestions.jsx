import React, { useEffect, useState } from "react";
import { useTranslation } from '@/components/Layout/TranslationContext';
import { getChatQuestionsApi } from '@/api/apiRoutes';

const ChatQuestions = ({ selectedChatTab, onQuestionSubmit, isAdmin = false }) => {
    const t = useTranslation();
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Determine chat type for the API
    const getChatType = () => {
        if (isAdmin) return "customer_admin_support";
        if (selectedChatTab?.booking_id === null || selectedChatTab?.booking_id === undefined) return "pre_booking";
        return "post_booking";
    };

    // Get the appropriate title based on chat type
    const getTitle = () => {
        if (isAdmin) return t("troubleChatWithSupportTeam");
        if (selectedChatTab?.booking_id === null || selectedChatTab?.booking_id === undefined) return t("preBookingQuestions");
        return t("letsChatAboutYourBooking");
    };

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const type = getChatType();
            const response = await getChatQuestionsApi({ type });
            if (response && !response.error && Array.isArray(response.data)) {
                setQuestions(response.data);
            } else {
                setQuestions([]);
            }
            setIsLoading(false);
        };

        fetchQuestions();
    }, [isAdmin, selectedChatTab?.booking_id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center w-full h-full justify-center">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin primary_border_color"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col items-center w-full h-full">
            <div className="w-full rounded-lg p-4 mb-4">
                <h3 className="text-lg md:text-xl font-medium mb-4 text-center primary_text_color">
                    {getTitle()}
                </h3>
                <div className="flex flex-col gap-4 max-w-md mx-auto">
                    {questions.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onQuestionSubmit(item.question)}
                            className="text-left py-3 px-4 light_bg_color hover:primary_bg_color hover:text-white rounded-lg transition-all flex items-center
                                     shadow-sm hover:shadow transform hover:-translate-y-1 duration-200"
                        >
                            <span>{item.question}</span>
                        </button>
                    ))}
                </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4 pb-4">
                {isAdmin ? t("clickToSendQuestionAdmin") : t("clickToSendQuestionProvider")}
            </p>
        </div>
    );
};

export default ChatQuestions;
