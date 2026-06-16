import { useState } from "react";
import {
  FaClock,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import Layout from "../Layout/Layout";
import BreadCrumb from "../ReUseableComponents/BreadCrumb";
import { contactUsApi } from "@/api/apiRoutes";
import { useTranslation } from "../Layout/TranslationContext";
import { useIsDarkMode } from "@/utils/Helper";
import CustomLink from "../ReUseableComponents/CustomLink";

const ContactUs = () => {
  const t = useTranslation();
  const isDarkMode = useIsDarkMode();
  const settingsData = useSelector((state) => state?.settingsData);

  const general_settings = settingsData?.settings?.general_settings;
  const mapSrc = general_settings?.company_map_location;

  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  const isFormFilled =
    formData.name.trim() &&
    formData.email.trim() &&
    formData.subject.trim() &&
    formData.message.trim() &&
    agreedToPolicy;

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormFilled || loading) return;
    try {
      setLoading(true);
      const { name, email, subject, message } = formData;
      const response = await contactUsApi({ name, email, subject, message });
      if (response?.error === false) {
        toast.success(t("messageSentSuccessfully"));
        setFormData({ name: "", email: "", subject: "", message: "" });
        setAgreedToPolicy(false);
      } else {
        toast.error(response?.message || t("somethingWentWrong"));
      }
    } catch (error) {
      console.log(error);
      toast.error(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <BreadCrumb firstEle={t("contactUs")} firstEleLink="/contact-us" />
      <section className="contact-us my-12 container mx-auto">
        <h2 className="text-3xl font-semibold mb-8">{t("contactUs")}</h2>
        <div className=" gap-12 flex flex-col-reverse lg:grid grid-cols-12">
          {/* Left Side */}
          <div className="col-span-12 lg:col-span-7 order-2 lg:order-1">
            {/* Contact Information */}
            <div className="grid grid-cols-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Phone */}
                {general_settings?.phone &&
                  <div className="flex items-center space-x-4 gap-2">
                    <FaPhoneAlt
                      className="primary_text_color light_bg_color p-2 rounded-full min-w-[36px] min-h-[36px]"
                      size={36}
                    />
                    <div>
                      <h3 className="description_color font-normal">
                        {t("callUs")}
                      </h3>
                      <p className="text-lg font-semibold">
                        {general_settings?.phone}
                      </p>
                    </div>
                  </div>
                }

                {/* Email */}
                {general_settings?.support_email &&
                  <div className="flex items-center space-x-4 gap-2">
                    <FaEnvelope
                      className="primary_text_color light_bg_color p-2 rounded-full min-w-[36px] min-h-[36px]"
                      size={36}
                    />
                    <div>
                      <h3 className="description_color font-normal">
                        {t("mailUs")}
                      </h3>
                      <p className="text-lg font-semibold">
                        {general_settings?.support_email}
                      </p>
                    </div>
                  </div>
                }

                {/* Opening Hours */}
                {general_settings?.support_hours &&
                  <div className="flex items-center space-x-4 gap-2">
                    <FaClock
                      className="primary_text_color light_bg_color p-2 rounded-full min-w-[36px] min-h-[36px]"
                      size={36}
                    />
                    <div>
                      <h3 className="description_color font-normal">
                        {t("openingHours")}
                      </h3>
                      <p className="text-lg font-semibold">
                        {general_settings?.support_hours}
                      </p>
                    </div>
                  </div>
                }
              </div>
              <div>
                {/* Address */}
                {general_settings?.address &&
                  <div className="flex items-center space-x-4 gap-2 col-span-1 sm:col-span-2 lg:col-span-3 mt-6">
                    <FaMapMarkerAlt
                      className="primary_text_color light_bg_color p-2 rounded-full min-w-[36px] min-h-[36px]"
                      size={36}
                    />
                    <div>
                      <h3 className="description_color font-normal">
                        {t("reachUs")}
                      </h3>
                      <p className="text-lg font-semibold">
                        {general_settings?.address}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* Map */}
            <div className="mt-8 w-full h-[400px]">
              <iframe
                title={t("map")}
                src={`${mapSrc}`}
                width="100%"
                height="100%"
                className="rounded-md border"
                allowFullScreen="true"
                loading="lazy"
                style={{ filter: isDarkMode ? " invert(90%)" : "none" }}
              ></iframe>
            </div>
          </div>

          {/* Right Side: Contact Form */}
          <div className="col-span-12 lg:col-span-5 order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("yourName")}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-transparent"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("email")}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-transparent"
              />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder={t("subject")}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-transparent"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder={t("whatIsinyourMind")}
                rows={10}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-transparent"
              ></textarea>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToPolicy}
                  onChange={(e) => setAgreedToPolicy(e.target.checked)}
                  className="mt-1 accent-[var(--primary-color)] w-4 h-4 shrink-0"
                />
                <span className="text-sm description_color">
                  {t("iAgreeToThe")}{" "}
                  <CustomLink href="/privacy-policy" target="_blank" className="primary_text_color underline">
                    {t("privacyPolicy")}
                  </CustomLink>{" "}
                  &amp;{" "}
                  <CustomLink href="/terms-and-conditions" target="_blank" className="primary_text_color underline">
                    {t("termsAndConditions")}
                  </CustomLink>
                </span>
              </label>
              <button
                type="submit"
                disabled={!isFormFilled || loading}
                className="w-full p-3 border rounded-md primary_bg_color transition text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? t("sending") || "Sending..." : t("submitMessage")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContactUs;
