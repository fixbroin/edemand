import React, { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  MdClose,
  MdImage,
  MdVideoLibrary,
  MdInsertDriveFile,
  MdArrowBackIosNew,
  MdChevronRight,
  MdInfoOutline,
  MdAttachFile,
  MdCheck,
  MdExpandMore,
} from "react-icons/md";
import { FaTimes, FaRegCalendarCheck, FaRegClock } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import CustomDateTimePicker from "../CustomDateTimePicker/CustomDateTimePicker";
import { useTranslation } from "@/components/Layout/TranslationContext";
import dayjs from "dayjs";
import {
  getCategoriesHierarchicalApi,
  makeCustomJobRequestApi,
} from "@/api/apiRoutes";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const TOTAL_STEPS = 3;
const DESCRIPTION_MAX = 500;

const isImage = (file) => file?.type?.startsWith("image/");
const isVideo = (file) => file?.type?.startsWith("video/");
const isAudio = (file) => file?.type?.startsWith("audio/");

const fileKind = (file) => {
  if (isImage(file)) return "image";
  if (isVideo(file)) return "video";
  if (isAudio(file)) return "audio";
  return "other";
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
};

// Premium form field — label, required mark, error message, helper text
const FormField = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  helper,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium description_color flex items-center gap-1 flex-wrap"
      >
        {label}
        {required && <span className="text-red-500 font-bold">*</span>}
        {hint && (
          <span className="text-xs font-normal opacity-60 ml-1">({hint})</span>
        )}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-red-500 mt-0.5">{error}</p>
    ) : helper ? (
      <p className="text-xs description_color opacity-70 mt-0.5">{helper}</p>
    ) : null}
  </div>
);

const inputBase =
  "w-full px-3.5 py-2.5 bg-white dark:bg-transparent border rounded-lg text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-0 placeholder:opacity-60";
const inputOk =
  "border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20";
const inputErr =
  "border-red-400 focus:border-red-500 focus:ring-red-200";

const AddCustomServiceDialog = ({ open, close, fetchBookings }) => {
  const t = useTranslation();
  const locationData = useSelector((state) => state?.location);
  const customJobSettings = useSelector(
    (state) => state?.settingsData?.settings?.custom_job_settings
  );
  const currencySymbol = useSelector(
    (state) =>
      state?.settingsData?.settings?.currency ||
      state?.settingsData?.settings?.app_settings?.currency ||
      "$"
  );

  const fileLimits = useMemo(() => {
    const num = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const flag = (v) => v === 1 || v === "1";
    return {
      maxFiles: num(customJobSettings?.max_files_allowed, 5),
      imageMb: num(customJobSettings?.max_file_size_images, 5),
      videoMb: num(customJobSettings?.max_file_size_video, 100),
      audioMb: num(customJobSettings?.max_file_size_audio, 5),
      otherMb: num(customJobSettings?.max_file_size_other, 10),
      allowImage: flag(customJobSettings?.allow_image_uploads),
      allowVideo: flag(customJobSettings?.allow_video_uploads),
      allowDocument: flag(customJobSettings?.allow_document_uploads),
    };
  }, [customJobSettings]);

  const [datePickerType, setDatePickerType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("forward");

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const [formValues, setFormValues] = useState({
    serviceTitle: "",
    serviceDescription: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    startDateTime: null,
    endDateTime: null,
    files: [],
  });

  const [touched, setTouched] = useState({});

  const errors = useMemo(() => {
    const e = {};
    if (!formValues.category) e.category = t("pleaseSelectService");
    if (!formValues.serviceTitle?.trim())
      e.serviceTitle = t("pleaseEnterServiceTitle");
    if (!formValues.serviceDescription?.trim())
      e.serviceDescription = t("pleaseEnterServiceDescription");
    if (!formValues.minPrice) e.minPrice = t("pleaseEnterMinPrice");
    if (!formValues.maxPrice) e.maxPrice = t("pleaseEnterMaxPrice");
    if (
      formValues.minPrice &&
      formValues.maxPrice &&
      Number(formValues.maxPrice) <= Number(formValues.minPrice)
    ) {
      e.maxPrice = t("maxPriceMustBeGreaterThanMinPrice");
    }
    if (!formValues.startDateTime)
      e.startDateTime = t("pleaseSelectStartDateTime");
    if (!formValues.endDateTime)
      e.endDateTime = t("pleaseSelectEndDateTime");
    if (
      formValues.startDateTime &&
      formValues.endDateTime &&
      dayjs(formValues.endDateTime).isBefore(dayjs(formValues.startDateTime))
    ) {
      e.endDateTime =
        t("endDateMustBeAfterStartDate") || "End must be after start";
    }
    return e;
  }, [formValues, t]);

  const showErr = (key) => touched[key] && errors[key];
  const markTouched = (key) =>
    setTouched((p) => (p[key] ? p : { ...p, [key]: true }));

  const limitForFile = (file) => {
    if (isImage(file)) return fileLimits.imageMb;
    if (isVideo(file)) return fileLimits.videoMb;
    if (isAudio(file)) return fileLimits.audioMb;
    return fileLimits.otherMb;
  };

  const handleFilesSelected = (e, kind) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    const remaining = fileLimits.maxFiles - formValues.files.length;
    if (remaining <= 0) {
      toast.error(
        t("maxFilesReached") || `Max ${fileLimits.maxFiles} files allowed`
      );
      return;
    }

    const trimmed = picked.slice(0, remaining);
    const valid = [];
    for (const file of trimmed) {
      const wrongKind =
        (kind === "image" && !isImage(file)) ||
        (kind === "video" && !isVideo(file)) ||
        (kind === "document" && (isImage(file) || isVideo(file)));
      if (wrongKind) {
        toast.error(t("invalidFileType") || `${file.name}: invalid type`);
        continue;
      }
      const limitMb = limitForFile(file);
      if (file.size > limitMb * 1024 * 1024) {
        toast.error(t("fileTooLarge") || `${file.name} exceeds ${limitMb}MB`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;
    setFormValues((prev) => ({ ...prev, files: [...prev.files, ...valid] }));
  };

  const handleRemoveFile = (idx) => {
    setFormValues((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "serviceDescription" && value.length > DESCRIPTION_MAX) return;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateTimeSelect = (value) => {
    setFormValues((prev) => ({ ...prev, [datePickerType]: value }));
    markTouched(datePickerType);
    setDatePickerType(null);
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await getCategoriesHierarchicalApi();
      const categoriesData = response?.data || response;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const getSelectedCategoryName = () => {
    if (!formValues.category) return null;
    const find = (list) => {
      for (const cat of list) {
        if (cat.id === formValues.category) return cat.translated_name || cat.category_name || cat.name;
        if (cat.children?.length) {
          const found = find(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(categories);
  };

  const toggleExpand = (id) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCategoryTree = (list, depth = 0) => {
    return list.map((cat) => {
      const hasChildren = cat.children?.length > 0;
      const isExpanded = expandedNodes[cat.id];
      const isSelected = formValues.category === cat.id;
      const name = cat.translated_name || cat.category_name || cat.name;
      return (
        <div key={cat.id}>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors duration-150 hover:light_bg_color",
              isSelected && "primary_bg_color text-white",
              depth > 0 && "ml-4"
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => {
              setFormValues((prev) => ({ ...prev, category: cat.id }));
              markTouched("category");
              if (!hasChildren) {
                setCategoryDropdownOpen(false);
              } else {
                toggleExpand(cat.id);
              }
            }}
          >
            {hasChildren ? (
              <span
                className={cn("shrink-0", isSelected ? "text-white" : "description_color")}
                onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
              >
                {isExpanded ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
              </span>
            ) : (
              <span className="w-[18px] shrink-0" />
            )}
            {cat.image && (
              <img src={cat.image} alt={name} className="w-6 h-6 rounded object-cover shrink-0" />
            )}
            <span className={cn("flex-1 truncate", isSelected && "font-semibold")}>{name}</span>
          </div>
          {hasChildren && (
            <div
              style={{ maxHeight: isExpanded ? "1000px" : "0px" }}
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded ? "opacity-100" : "opacity-0"
              )}
            >
              {renderCategoryTree(cat.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const clearForm = () => {
    setFormValues({
      serviceTitle: "",
      serviceDescription: "",
      category: "",
      minPrice: "",
      maxPrice: "",
      startDateTime: null,
      endDateTime: null,
      files: [],
    });
    setTouched({});
    setStep(1);
    setDirection("forward");
    setDatePickerType(null);
  };

  const stepFieldMap = {
    1: ["category", "serviceTitle", "serviceDescription", "minPrice", "maxPrice"],
    2: ["startDateTime", "endDateTime"],
    3: [],
  };

  const stepHasErrors = (s) =>
    (stepFieldMap[s] || []).some((k) => Boolean(errors[k]));

  const touchStep = (s) => {
    setTouched((prev) => {
      const next = { ...prev };
      (stepFieldMap[s] || []).forEach((k) => (next[k] = true));
      return next;
    });
  };

  const handleNext = () => {
    if (stepHasErrors(step)) {
      touchStep(step);
      return;
    }
    setDirection("forward");
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handleBack = () => {
    setDirection("back");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (stepHasErrors(1)) {
      touchStep(1);
      setStep(1);
      return;
    }
    if (stepHasErrors(2)) {
      touchStep(2);
      setStep(2);
      return;
    }
    try {
      setLoading(true);
      const startDate = dayjs(formValues.startDateTime).format("YYYY-MM-DD");
      const startTime = dayjs(formValues.startDateTime).format("HH:mm:ss");
      const endDate = dayjs(formValues.endDateTime).format("YYYY-MM-DD");
      const endTime = dayjs(formValues.endDateTime).format("HH:mm:ss");

      const response = await makeCustomJobRequestApi({
        category_id: formValues.category,
        service_short_description: formValues.serviceDescription,
        min_price: formValues.minPrice,
        max_price: formValues.maxPrice,
        requested_start_date: startDate,
        requested_start_time: startTime,
        requested_end_date: endDate,
        requested_end_time: endTime,
        service_title: formValues.serviceTitle,
        latitude: locationData?.lat,
        longitude: locationData?.lng,
        files: formValues.files,
      });
      if (response?.error === false) {
        toast.success(response?.message);
        close();
        fetchBookings();
        clearForm();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);


  const stepMeta = [
    { title: t("serviceDetails") || "Service Details", icon: <MdInfoOutline /> },
    { title: t("schedule") || "Schedule", icon: <FaRegCalendarCheck size={14} /> },
    { title: t("attachments") || "Attachments", icon: <MdAttachFile /> },
  ];

  const filesRemaining = fileLimits.maxFiles - formValues.files.length;
  const showFilesStep =
    fileLimits.allowImage || fileLimits.allowVideo || fileLimits.allowDocument;

  const renderStepIndicator = () => (
    <div className="flex items-center px-4 sm:px-6 pt-3 pb-5">
      {stepMeta.map((meta, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-300",
                  active &&
                    "primary_bg_color text-white shadow-md ring-4 ring-[var(--primary-color,_#3b82f6)]/15",
                  done && "primary_bg_color text-white",
                  !active && !done && "background_color description_color"
                )}
              >
                {done ? (
                  <MdCheck size={18} className="animate-in zoom-in duration-300" />
                ) : (
                  <span className="flex items-center gap-1">
                    {React.cloneElement(meta.icon, {
                      className: "shrink-0",
                    })}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "hidden sm:flex flex-col leading-tight transition-colors duration-300",
                  active
                    ? "primary_text_color"
                    : done
                    ? "description_color"
                    : "description_color opacity-70"
                )}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {t("step") || "Step"} {idx}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {meta.title}
                </span>
              </div>
            </div>
            {idx < TOTAL_STEPS && (
              <div className="flex-1 mx-3 h-[2px] rounded-full background_color overflow-hidden">
                <div
                  className={cn(
                    "h-full primary_bg_color transition-all duration-500 ease-out",
                    done ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Step 1
  const renderStep1 = () => (
    <div className="space-y-5">
      <FormField
        label={t("category")}
        htmlFor="csd-category"
        required
        error={showErr("category")}
      >
        <div className={cn("rounded-lg border overflow-hidden", showErr("category") ? "border-red-400" : "border-gray-200 dark:border-gray-700")}>
          <button
            id="csd-category"
            type="button"
            onClick={() => setCategoryDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-transparent text-sm text-left transition-colors hover:light_bg_color"
          >
            <span className={cn("truncate flex-1", !getSelectedCategoryName() && "opacity-60 description_color")}>
              {categoriesLoading
                ? t("loading")
                : getSelectedCategoryName() || t("selectService")}
            </span>
            <MdExpandMore
              size={20}
              className={cn("shrink-0 description_color transition-transform duration-200 ml-2", categoryDropdownOpen && "rotate-180")}
            />
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              categoryDropdownOpen ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 overflow-y-auto max-h-[220px]">
              {categoriesLoading ? (
                <div className="px-3 py-3 text-sm description_color">{t("loading")}...</div>
              ) : categories.length === 0 ? (
                <div className="px-3 py-3 text-sm description_color">{t("noCategoriesAvailable")}</div>
              ) : (
                <div className="py-1">{renderCategoryTree(categories)}</div>
              )}
            </div>
          </div>
        </div>
      </FormField>

      <FormField
        label={t("serviceTitle")}
        htmlFor="csd-title"
        required
        error={showErr("serviceTitle")}
      >
        <input
          id="csd-title"
          type="text"
          name="serviceTitle"
          placeholder={t("egInstallACeilingFan") || "e.g. Install a ceiling fan"}
          className={cn(inputBase, showErr("serviceTitle") ? inputErr : inputOk)}
          onChange={handleChange}
          onBlur={() => markTouched("serviceTitle")}
          value={formValues.serviceTitle}
        />
      </FormField>

      <FormField
        label={t("serviceDesc")}
        htmlFor="csd-desc"
        required
        error={showErr("serviceDescription")}
        helper={t("describeYourRequirementClearly") || "Describe your requirement clearly"}
      >
        <div className="relative">
          <textarea
            id="csd-desc"
            name="serviceDescription"
            placeholder={t("typeYourCommentHere")}
            className={cn(
              inputBase,
              showErr("serviceDescription") ? inputErr : inputOk,
              "min-h-[110px] resize-none pr-2 pb-6"
            )}
            onChange={handleChange}
            onBlur={() => markTouched("serviceDescription")}
            value={formValues.serviceDescription}
            maxLength={DESCRIPTION_MAX}
          />
          <span className="absolute bottom-2 right-3 text-[11px] description_color opacity-70 pointer-events-none">
            {formValues.serviceDescription.length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label={t("minPrice")}
          htmlFor="csd-min"
          required
          error={showErr("minPrice")}
        >
          <div
            className={cn(
              "relative flex items-center rounded-lg border bg-white dark:bg-transparent transition-all duration-200 focus-within:ring-2",
              showErr("minPrice")
                ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-200"
                : "border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-primary/20"
            )}
          >
            <span className="px-3 description_color text-sm font-medium border-r border-inherit">
              {currencySymbol}
            </span>
            <input
              id="csd-min"
              type="number"
              inputMode="decimal"
              name="minPrice"
              placeholder="0"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
              onChange={handleChange}
              onBlur={() => markTouched("minPrice")}
              value={formValues.minPrice}
              min="0"
            />
          </div>
        </FormField>
        <FormField
          label={t("maxPrice")}
          htmlFor="csd-max"
          required
          error={showErr("maxPrice")}
        >
          <div
            className={cn(
              "relative flex items-center rounded-lg border bg-white dark:bg-transparent transition-all duration-200 focus-within:ring-2",
              showErr("maxPrice")
                ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-200"
                : "border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-primary/20"
            )}
          >
            <span className="px-3 description_color text-sm font-medium border-r border-inherit">
              {currencySymbol}
            </span>
            <input
              id="csd-max"
              type="number"
              inputMode="decimal"
              name="maxPrice"
              placeholder="0"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
              onChange={handleChange}
              onBlur={() => markTouched("maxPrice")}
              value={formValues.maxPrice}
              min="0"
            />
          </div>
        </FormField>
      </div>
    </div>
  );

  // ── Step 2
  const renderDateTimeTile = (type, value) => {
    const isStart = type === "startDateTime";
    const placeholder = isStart
      ? t("selectStartDateAndTime")
      : t("selectEndDateAndTime");
    const errored = showErr(type);
    return (
      <button
        type="button"
        onClick={() => setDatePickerType(type)}
        className={cn(
          "w-full flex items-center gap-3 p-3.5 rounded-lg border bg-white dark:bg-transparent text-left transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2",
          errored
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
        )}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center light_bg_color primary_text_color shrink-0">
          {isStart ? <FaRegCalendarCheck size={18} /> : <FaRegClock size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          {value ? (
            <div className="font-medium truncate">
              {dayjs(value).format("MMM D, YYYY")}
              <span className="description_color"> · </span>
              {dayjs(value).format("h:mm A")}
            </div>
          ) : (
            <div className="description_color truncate text-sm">
              {placeholder}
            </div>
          )}
        </div>
        <MdChevronRight size={20} className="description_color shrink-0" />
      </button>
    );
  };

  const renderRangeSummary = () => {
    if (!formValues.startDateTime || !formValues.endDateTime) return null;
    const start = dayjs(formValues.startDateTime);
    const end = dayjs(formValues.endDateTime);
    const totalMin = end.diff(start, "minute");
    if (totalMin <= 0) return null;
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const mins = totalMin % 60;
    const summary = [
      days ? `${days}${t("dShort") || "d"}` : null,
      hours ? `${hours}${t("hShort") || "h"}` : null,
      mins ? `${mins}${t("mShort") || "m"}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="flex items-center justify-between p-3.5 rounded-lg light_bg_color">
        <span className="description_color text-sm">{t("duration")}</span>
        <span className="font-semibold primary_text_color">{summary}</span>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <FormField
        label={t("startDateTime")}
        required
        error={showErr("startDateTime")}
      >
        {renderDateTimeTile("startDateTime", formValues.startDateTime)}
      </FormField>
      <FormField
        label={t("endDateTime")}
        required
        error={showErr("endDateTime")}
      >
        {renderDateTimeTile("endDateTime", formValues.endDateTime)}
      </FormField>
      {renderRangeSummary()}
    </div>
  );

  // ── Step 3
  const renderUploadTile = ({ kind, icon, label, accept, sizeMb }) => {
    const inputId = `custom-job-${kind}`;
    const disabled = filesRemaining <= 0;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "group flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed text-center transition-all duration-200",
          disabled
            ? "opacity-60 cursor-not-allowed border-gray-200"
            : "cursor-pointer border-gray-200 dark:border-gray-700 hover:border-primary hover:light_bg_color"
        )}
      >
        <span className="text-3xl primary_text_color">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs description_color">
          {t("upTo")} {sizeMb}MB
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFilesSelected(e, kind)}
          disabled={disabled}
        />
      </label>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      {!showFilesStep ? (
        <p className="description_color text-sm text-center py-6">
          {t("noUploadTypesEnabled")}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium description_color">
              {t("attachReferenceFiles")}
            </label>
            <span className="text-xs description_color opacity-70">
              {formValues.files.length}/{fileLimits.maxFiles}
            </span>
          </div>

          <div
            className={cn(
              "grid gap-3",
              [
                fileLimits.allowImage,
                fileLimits.allowVideo,
                fileLimits.allowDocument,
              ].filter(Boolean).length === 1
                ? "grid-cols-1"
                : "grid-cols-2 sm:grid-cols-3"
            )}
          >
            {fileLimits.allowImage &&
              renderUploadTile({
                kind: "image",
                icon: <MdImage />,
                label: t("images"),
                accept: "image/*",
                sizeMb: fileLimits.imageMb,
              })}
            {fileLimits.allowVideo &&
              renderUploadTile({
                kind: "video",
                icon: <MdVideoLibrary />,
                label: t("videos"),
                accept: "video/*",
                sizeMb: fileLimits.videoMb,
              })}
            {fileLimits.allowDocument &&
              renderUploadTile({
                kind: "document",
                icon: <MdInsertDriveFile />,
                label: t("documents"),
                accept:
                  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf",
                sizeMb: fileLimits.otherMb,
              })}
          </div>

          {formValues.files.length > 0 && (
            <ul className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
              {formValues.files.map((file, idx) => {
                const kind = fileKind(file);
                const Icon =
                  kind === "image"
                    ? MdImage
                    : kind === "video"
                    ? MdVideoLibrary
                    : MdInsertDriveFile;
                return (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-transparent text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="primary_text_color shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="description_color text-xs shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="description_color shrink-0 p-1 rounded hover:bg-red-50 hover:text-red-500 transition"
                      aria-label={t("remove")}
                    >
                      <FaTimes size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const inDatePicker = Boolean(datePickerType);
  const currentStepHasErrors = stepHasErrors(step);

  return (
    <Drawer open={open} onClose={close} modal>
      <DrawerContent
        className={cn(
          "max-w-full md:max-w-[90%] lg:max-w-[800px] xl:max-w-[860px] mx-auto",
          "rounded-tr-2xl rounded-tl-2xl shadow-2xl",
          "transition-all duration-300",
          "after:!content-none",
          "!h-auto"
        )}
      >
        {/* Header — sticky */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 pt-4 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {inDatePicker && (
                <button
                  onClick={() => setDatePickerType(null)}
                  className="p-2 -ml-1 rounded-lg hover:background_color transition"
                  aria-label={t("back")}
                >
                  <MdArrowBackIosNew size={16} />
                </button>
              )}
              <div className="min-w-0">
                <DrawerTitle className="text-lg sm:text-xl font-semibold truncate">
                  {inDatePicker
                    ? datePickerType === "startDateTime"
                      ? t("selectStartDateAndTime")
                      : t("selectEndDateAndTime")
                    : t("reqNewService")}
                </DrawerTitle>
                {!inDatePicker && (
                  <p className="text-xs sm:text-sm description_color mt-0.5">
                    {t("reqNewServiceSubtitle") ||
                      "Fill in the details to get accurate service matches"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={close}
              className="p-2 rounded-lg hover:background_color description_color hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={t("close")}
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {inDatePicker ? (
          <div className="px-4 sm:px-6 py-4 min-h-[420px] md:min-h-[460px]">
            <CustomDateTimePicker
              value={formValues[datePickerType]}
              onChange={handleDateTimeSelect}
              minDateTime={
                datePickerType === "endDateTime"
                  ? formValues.startDateTime || new Date()
                  : new Date()
              }
              type={datePickerType}
            />
          </div>
        ) : (
          <>
            {renderStepIndicator()}
            <div className="px-4 sm:px-6 pb-6 min-h-[420px] md:min-h-[460px] overflow-hidden">
              <div
                key={step}
                className={cn(
                  "animate-in fade-in duration-300",
                  direction === "forward"
                    ? "slide-in-from-right-6"
                    : "slide-in-from-left-6"
                )}
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>
            </div>

            {/* Footer — sticky */}
            <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 py-3 border-t flex items-center gap-3">
              <Button
                variant="outline"
                className="min-w-[100px]"
                onClick={handleBack}
                disabled={step === 1 || loading}
              >
                {t("back")}
              </Button>
              <div className="flex-1 hidden sm:block text-xs description_color">
                {t("step")} {step}/{TOTAL_STEPS}
              </div>
              {step < TOTAL_STEPS ? (
                <Button
                  className="flex-1 sm:flex-none sm:min-w-[160px] primary_bg_color text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition"
                  onClick={handleNext}
                  disabled={currentStepHasErrors && Object.keys(touched).some((k) => stepFieldMap[step]?.includes(k))}
                >
                  {t("next")}
                </Button>
              ) : loading ? (
                <Button
                  className="flex-1 sm:flex-none sm:min-w-[160px] primary_bg_color text-white"
                  disabled
                >
                  {t("processing")}
                </Button>
              ) : (
                <Button
                  className="flex-1 sm:flex-none sm:min-w-[160px] primary_bg_color text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition"
                  onClick={handleSubmit}
                >
                  {t("submitRequest")}
                </Button>
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default AddCustomServiceDialog;
