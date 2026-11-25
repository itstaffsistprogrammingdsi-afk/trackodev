import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function Blank() {
  const { t } = useLanguage();

  return (
    <div>
      <PageMeta
        title={t("React.js Blank Dashboard | TailAdmin - Next.js Admin Dashboard Template")}
        description={t("This is React.js Blank Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Blank Page")} />
      <div className="min-h-screen rounded-card border border-line bg-surface px-5 py-7 dark:border-line dark:bg-surface/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-fg text-theme-xl text-fg sm:text-2xl">
            {t("Card Title Here")}
          </h3>

          <p className="text-sm text-fg-muted dark:text-fg-subtle sm:text-base">
            {t(
              "Start putting content on grids or panels, you can also use different combinations of grids.Please check out the dashboard and other pages",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
