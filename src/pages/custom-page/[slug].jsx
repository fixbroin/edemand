import MetaData from '@/components/Meta/MetaData'
import { fetchSeoSettings } from '@/utils/seoHelper';
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router';

const CustomPageContent = dynamic(
  () => import('@/components/PagesComponents/StaticPages/CustomPageContent'),
  { ssr: false })

let serverSidePropsFunction = null;

if (process.env.NEXT_PUBLIC_ENABLE_SEO === "true") {
  serverSidePropsFunction = async (context) => {
    try {
      const { slug } = context.params;
      const languageCode = context.query?.lang || "en";
      const seoData = await fetchSeoSettings(slug, null, languageCode);
      return {
        props: {
          ...seoData.props,
          slug,
        }
      };
    } catch (error) {
      console.error("Error fetching SEO data:", error);
      return { props: { slug: context.params?.slug || "" } };
    }
  };
}

export const getServerSideProps = serverSidePropsFunction;

const CustomPageIndex = ({
  slug: slugProp,
  title,
  description,
  keywords,
  ogImage,
  schemaMarkup,
  favicon,
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  twitterImage,
}) => {
  const router = useRouter();
  const slug = slugProp || router.query.slug;
  const pageUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/custom-page/${slug}`;

  return (
    <>
      <MetaData
        title={title}
        description={description}
        keywords={keywords}
        pageName={`/custom-page/${slug}`}
        ogTitle={ogTitle}
        ogDescription={ogDescription}
        ogImage={ogImage}
        ogUrl={pageUrl}
        twitterTitle={twitterTitle}
        twitterDescription={twitterDescription}
        twitterImage={twitterImage}
        structuredData={schemaMarkup}
        canonicalUrl={pageUrl}
        favicon={favicon}
      />
      <CustomPageContent slug={slug} />
    </>
  )
}

export default CustomPageIndex
