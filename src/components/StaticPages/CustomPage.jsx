"use client";
import React from "react";
import Layout from "../Layout/Layout";
import BreadCrumb from "../ReUseableComponents/BreadCrumb";
import { useTranslation } from "../Layout/TranslationContext";
import RichTextContent from "../ReUseableComponents/RichTextContent.jsx";
import NoDataFound from "../ReUseableComponents/Error/NoDataFound";
import { useQuery } from "@tanstack/react-query";
import { buildLanguageAwareKey } from "@/lib/react-query-client";
import { getPageSettingsApi } from "@/api/apiRoutes";
import StaticPageSkeleton from "../Skeletons/StaticPageSkeleton";

const CustomPage = ({ slug }) => {
  const t = useTranslation();

  const { data: pageData, isLoading } = useQuery({
    queryKey: buildLanguageAwareKey(`custom_page_${slug}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!slug,
    queryFn: async () => {
      try {
        const response = await getPageSettingsApi({ page: slug });
        return response?.data;
      } catch (e) {
        console.log(e);
      }
    },
  });

  const pageTitle = pageData?.title || slug;
  const hasData = pageData?.content;

  return (
    <Layout>
      <BreadCrumb firstEle={pageTitle} firstEleLink={`/custom-page/${slug}`} />
      <section className="custom-page my-12 container mx-auto min-h-[50vh]">
        {isLoading ? (
          <StaticPageSkeleton />
        ) : hasData ? (
          <RichTextContent content={pageData.content} />
        ) : (
          <div className="w-full h-[60vh] flex items-center justify-center">
            <NoDataFound
              title={t("noDataTitle") || "Page not found"}
              desc={t("noDataDescription") || "This page is not available right now."}
            />
          </div>
        )}
      </section>
    </Layout>
  );
};

export default CustomPage;
