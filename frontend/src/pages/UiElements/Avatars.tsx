import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Avatar from "../../components/ui/avatar/Avatar";
import PageMeta from "../../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function Avatars() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Dasbor Avatar React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Avatars Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Dasbor Avatar React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Avatars Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Avatar", "Avatars")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("Avatar bawaan", "Default avatar")}>
          {/* Default Avatar (No Status) */}
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar src="/images/user/user-01.jpg" size="xsmall" />
            <Avatar src="/images/user/user-01.jpg" size="small" />
            <Avatar src="/images/user/user-01.jpg" size="medium" />
            <Avatar src="/images/user/user-01.jpg" size="large" />
            <Avatar src="/images/user/user-01.jpg" size="xlarge" />
            <Avatar src="/images/user/user-01.jpg" size="xxlarge" />
          </div>
        </ComponentCard>
        <ComponentCard title={t("Avatar dengan indikator online", "Avatar with online indicator")}>
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              src="/images/user/user-01.jpg"
              size="xsmall"
              status="online"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="small"
              status="online"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="medium"
              status="online"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="large"
              status="online"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xlarge"
              status="online"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xxlarge"
              status="online"
            />
          </div>
        </ComponentCard>
        <ComponentCard title={t("Avatar dengan indikator offline", "Avatar with offline indicator")}>
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              src="/images/user/user-01.jpg"
              size="xsmall"
              status="offline"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="small"
              status="offline"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="medium"
              status="offline"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="large"
              status="offline"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xlarge"
              status="offline"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xxlarge"
              status="offline"
            />
          </div>
        </ComponentCard>{" "}
        <ComponentCard title={t("Avatar dengan indikator sibuk", "Avatar with busy indicator")}>
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              src="/images/user/user-01.jpg"
              size="xsmall"
              status="busy"
            />
            <Avatar src="/images/user/user-01.jpg" size="small" status="busy" />
            <Avatar
              src="/images/user/user-01.jpg"
              size="medium"
              status="busy"
            />
            <Avatar src="/images/user/user-01.jpg" size="large" status="busy" />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xlarge"
              status="busy"
            />
            <Avatar
              src="/images/user/user-01.jpg"
              size="xxlarge"
              status="busy"
            />
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
