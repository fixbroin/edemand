import { useSelector } from "react-redux";

const useRazorpay = () => {
  const paymentSettings = useSelector(
    (state) => state?.settingsData?.settings?.payment_gateways_settings
  );
  const isActive = paymentSettings?.razorpayApiStatus === "enable";

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (!isActive) return resolve(false);
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  return { loadRazorpay, isActive };
};

export default useRazorpay;
