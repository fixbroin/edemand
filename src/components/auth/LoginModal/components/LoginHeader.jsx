/**
 * LoginHeader Component
 * Logo and close button header for LoginModal
 */

import React from "react";
import { MdClose } from "react-icons/md";
import CustomImageTag from "@/components/ReUseableComponents/CustomImageTag";

const LoginHeader = ({ websettings, onClose, t }) => {
    return (
        <div className="w-full relative flex justify-center items-center mb-6">
            <CustomImageTag
                src={websettings?.web_logo}
                alt={t("logo")}
                className="aspect-logo w-[120px] object-contain"
                imgClassName="object-contain"
            />
            <button
                onClick={onClose}
                className="absolute right-0 top-0 rounded-full description_color text-white p-1"
            >
                <MdClose size={24} />
            </button>
        </div>
    );
};

export default LoginHeader;
