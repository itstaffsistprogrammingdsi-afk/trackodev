import { Link } from "react-router";

import PageMeta from "../../components/common/PageMeta";
import { authPrimaryButtonClass } from "../../components/auth/AuthField";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Aktivasi akun | Tracko"
        description="Akun Tracko dibuat oleh admin divisi atau melalui sinkronisasi HRIS."
      />
      <AuthLayout>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
          Aktivasi akun
        </h1>
        <p className="mt-2 text-sm leading-6 text-fg-muted">
          Akun Tracko dibuat oleh admin divisi atau melalui sinkronisasi HRIS.
          Hubungi admin jika Anda belum memiliki akses.
        </p>
        <Link to="/signin" className={`${authPrimaryButtonClass} mt-6`}>
          Kembali ke halaman masuk
        </Link>
      </AuthLayout>
    </>
  );
}
