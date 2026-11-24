import { Link } from "react-router";

import PageMeta from "../../components/common/PageMeta";
import { authPrimaryButtonClass } from "../../components/auth/AuthField";
import { useLanguage } from "@/context/LanguageContext";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  const { t } = useLanguage();

  return (
    <>
      <PageMeta
        title={t("Aktivasi akun | Tracko", "Account activation | Tracko")}
        description={t(
          "Akun Tracko dibuat oleh admin divisi atau melalui sinkronisasi HRIS.",
          "Tracko accounts are created by division admins or through HRIS sync.",
        )}
      />
      <AuthLayout>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
          {t("Aktivasi akun", "Account activation")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-fg-muted">
          {t(
            "Akun Tracko dibuat oleh admin divisi atau melalui sinkronisasi HRIS. Hubungi admin jika Anda belum memiliki akses.",
            "Tracko accounts are created by division admins or through HRIS sync. Contact an admin if you don't have access yet.",
          )}
        </p>
        <Link to="/signin" className={`${authPrimaryButtonClass} mt-6`}>
          {t("Kembali ke halaman masuk", "Back to sign in")}
        </Link>
      </AuthLayout>
    </>
  );
}
