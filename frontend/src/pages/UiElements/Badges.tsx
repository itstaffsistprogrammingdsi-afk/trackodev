import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { PlusIcon } from "../../icons";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useLanguage } from "@/context/LanguageContext";

export default function Badges() {
  const { t } = useLanguage();
  return (
    <div>
      <PageMeta
        title={t("Dasbor Lencana React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Badges Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Dasbor Lencana React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Badges Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Lencana", "Badges")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("Dengan latar terang", "With light background")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            {/* Light Variant */}
            <Badge variant="light" color="primary">
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="light" color="success">
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="light" color="error">
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="light" color="warning">
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="light" color="info">
              {t("Info")}
            </Badge>
            <Badge variant="light" color="light">
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="light" color="dark">
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
        <ComponentCard title={t("Dengan latar penuh", "With solid background")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            {/* Light Variant */}
            <Badge variant="solid" color="primary">
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="solid" color="success">
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="solid" color="error">
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="solid" color="warning">
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="solid" color="info">
              {t("Info")}
            </Badge>
            <Badge variant="solid" color="light">
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="solid" color="dark">
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
        <ComponentCard title={t("Latar terang dengan ikon kiri", "Light background with left icon")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="light" color="primary" startIcon={<PlusIcon />}>
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="light" color="success" startIcon={<PlusIcon />}>
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="light" color="error" startIcon={<PlusIcon />}>
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="light" color="warning" startIcon={<PlusIcon />}>
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="light" color="info" startIcon={<PlusIcon />}>
              {t("Info")}
            </Badge>
            <Badge variant="light" color="light" startIcon={<PlusIcon />}>
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="light" color="dark" startIcon={<PlusIcon />}>
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
        <ComponentCard title={t("Latar penuh dengan ikon kiri", "Solid background with left icon")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="solid" color="primary" startIcon={<PlusIcon />}>
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="solid" color="success" startIcon={<PlusIcon />}>
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="solid" color="error" startIcon={<PlusIcon />}>
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="solid" color="warning" startIcon={<PlusIcon />}>
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="solid" color="info" startIcon={<PlusIcon />}>
              {t("Info")}
            </Badge>
            <Badge variant="solid" color="light" startIcon={<PlusIcon />}>
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="solid" color="dark" startIcon={<PlusIcon />}>
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
        <ComponentCard title={t("Latar terang dengan ikon kanan", "Light background with right icon")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="light" color="primary" endIcon={<PlusIcon />}>
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="light" color="success" endIcon={<PlusIcon />}>
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="light" color="error" endIcon={<PlusIcon />}>
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="light" color="warning" endIcon={<PlusIcon />}>
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="light" color="info" endIcon={<PlusIcon />}>
              {t("Info")}
            </Badge>
            <Badge variant="light" color="light" endIcon={<PlusIcon />}>
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="light" color="dark" endIcon={<PlusIcon />}>
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
        <ComponentCard title={t("Latar penuh dengan ikon kanan", "Solid background with right icon")}>
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="solid" color="primary" endIcon={<PlusIcon />}>
              {t("Utama", "Primary")}
            </Badge>
            <Badge variant="solid" color="success" endIcon={<PlusIcon />}>
              {t("Berhasil", "Success")}
            </Badge>{" "}
            <Badge variant="solid" color="error" endIcon={<PlusIcon />}>
              {t("Kesalahan", "Error")}
            </Badge>{" "}
            <Badge variant="solid" color="warning" endIcon={<PlusIcon />}>
              {t("Peringatan", "Warning")}
            </Badge>{" "}
            <Badge variant="solid" color="info" endIcon={<PlusIcon />}>
              {t("Info")}
            </Badge>
            <Badge variant="solid" color="light" endIcon={<PlusIcon />}>
              {t("Terang", "Light")}
            </Badge>
            <Badge variant="solid" color="dark" endIcon={<PlusIcon />}>
              {t("Gelap", "Dark")}
            </Badge>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
