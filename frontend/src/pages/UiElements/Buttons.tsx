import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { BoxIcon } from "../../icons";
import { useLanguage } from "@/context/LanguageContext";

export default function Buttons() {
  const { t } = useLanguage();
  return (
    <div>
      <PageMeta
        title={t("Dasbor Tombol React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Buttons Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Dasbor Tombol React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Buttons Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Tombol", "Buttons")} />
      <div className="space-y-5 sm:space-y-6">
        {/* Primary Button */}
        <ComponentCard title={t("Tombol utama", "Primary button")}>
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              {t("Teks tombol", "Button text")}
            </Button>
            <Button size="md" variant="primary">
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title={t("Tombol utama dengan ikon kiri", "Primary button with left icon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="primary"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
            <Button
              size="md"
              variant="primary"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title={t("Tombol utama dengan ikon kanan", "Primary button with right icon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="primary"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
            <Button
              size="md"
              variant="primary"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button */}
        <ComponentCard title={t("Tombol sekunder", "Secondary button")}>
          <div className="flex items-center gap-5">
            {/* Outline Button */}
            <Button size="sm" variant="outline">
              {t("Teks tombol", "Button text")}
            </Button>
            <Button size="md" variant="outline">
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button with Start Icon */}
        <ComponentCard title={t("Tombol garis luar dengan ikon kiri", "Outline button with left icon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="outline"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
            <Button
              size="md"
              variant="outline"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Outline Button with Start Icon */}
        <ComponentCard title={t("Tombol garis luar dengan ikon kanan", "Outline button with right icon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="outline"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
            <Button
              size="md"
              variant="outline"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("Teks tombol", "Button text")}
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
