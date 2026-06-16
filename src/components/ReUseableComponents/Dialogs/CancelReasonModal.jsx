import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/Layout/TranslationContext";
import { getReasonsApi } from "@/api/apiRoutes";
import MiniLoader from "@/components/ReUseableComponents/MiniLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { MdClose, MdOutlineReportProblem } from "react-icons/md";

const needsInfo = (val) => val === 1 || val === "1";

const CancelReasonModal = ({ isOpen, onClose, onSubmit, isSubmitting = false }) => {
  const t = useTranslation();
  const [reasons, setReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState(null);
  const [additionalComment, setAdditionalComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchReasons = async () => {
    try {
      setIsLoading(true);
      const response = await getReasonsApi({ type: "cancel" });
      if (response?.data) {
        setReasons(response.data);
      } else {
        setReasons([]);
      }
    } catch (error) {
      console.error("Error fetching cancel reasons:", error);
      setReasons([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReasons();
    }
  }, [isOpen]);

  const selectedReasonData = selectedReason
    ? reasons.find((r) => r.id === selectedReason)
    : null;
  const needsAdditionalInfo = needsInfo(selectedReasonData?.needs_additional_info);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    if (needsAdditionalInfo && !additionalComment.trim()) return;

    await onSubmit({
      cancel_reason_id: selectedReason,
      additional_info: needsAdditionalInfo ? additionalComment.trim() : "",
    });
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>{t("selectCancelReason")}</DialogTitle>
          <MdClose
            onClick={handleClose}
            className="text-2xl cursor-pointer"
          />
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3 min-h-[200px]">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-full h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {reasons && reasons.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-[200px] md:max-h-[400px] overflow-y-auto">
                  {reasons.map((reason) => {
                    const translatedReason = reason.translated_reason
                      ? reason.translated_reason
                      : reason.reason;
                    return (
                      <button
                        key={reason.id}
                        onClick={() => {
                          setSelectedReason(reason.id);
                          if (!needsInfo(reason.needs_additional_info)) {
                            setAdditionalComment("");
                          }
                        }}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                          selectedReason === reason.id
                            ? "primary_bg_color text-white border-transparent"
                            : "card_bg hover:border_color"
                        }`}
                      >
                        {translatedReason}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 min-h-[180px] text-center">
                  <MdOutlineReportProblem className="text-5xl description_color opacity-50" />
                  <p className="description_color text-sm font-medium">
                    {t("noCancelReasonsAvailable") ||
                      "No cancel reasons available at the moment."}
                  </p>
                </div>
              )}

              {selectedReason && needsAdditionalInfo && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("additionalCommentsfor")} {selectedReasonData?.reason}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={additionalComment}
                    onChange={(e) => setAdditionalComment(e.target.value)}
                    placeholder={t("typeYourCommentHere")}
                    maxLength={500}
                    className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    reasons.length === 0 ||
                    !selectedReason ||
                    (needsAdditionalInfo && !additionalComment.trim()) ||
                    isSubmitting
                  }
                  className="primary_bg_color"
                >
                  {isSubmitting ? <MiniLoader /> : t("confirmCancellation")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelReasonModal;
