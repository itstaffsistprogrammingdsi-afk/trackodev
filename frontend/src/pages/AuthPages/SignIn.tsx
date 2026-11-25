import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";
import AuthLayout from "./AuthPageLayout";
import { getToken, getUser } from "@/lib/authStore";
import { roleDestination, safeInternalRedirect } from "@/lib/authRedirect";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import type { MascotGaze, MascotState } from "@/features/ai/JellyMascot";

export default function SignIn() {
  const [searchParams] = useSearchParams();
  const redirectTo = safeInternalRedirect(searchParams.get("redirect"));
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Tema terang menyapa, tema gelap santai. Ekspresi interaksi tetap
  // menimpa state dasar ini selama form dipakai.
  const restingMascotState: MascotState =
    theme === "dark" ? "idle" : "greeting";

  const [mascotState, setMascotState] = useState<MascotState>(
    restingMascotState,
  );
  const [mascotGaze, setMascotGaze] = useState<MascotGaze>("center");
  // Hanya user yang sudah punya sesi saat halaman dibuka yang dialihkan.
  // Setelah login berhasil, form perlu waktu menampilkan ekspresi sukses.
  const [startedAuthenticated] = useState(() => Boolean(getToken()));

  useEffect(() => {
    setMascotState((current) =>
      current === "idle" || current === "greeting"
        ? restingMascotState
        : current,
    );
  }, [restingMascotState]);

  if (startedAuthenticated && getToken()) {
    return (
      <Navigate to={redirectTo ?? roleDestination(getUser())} replace />
    );
  }

  return (
    <>
      <PageMeta
        title={t("Masuk | Tracko", "Sign in | Tracko")}
        description={t(
          "Masuk ke aplikasi manajemen tugas Tracko.",
          "Sign in to the Tracko task management app.",
        )}
      />
      <AuthLayout mascotState={mascotState} mascotGaze={mascotGaze}>
        <SignInForm
          redirectTo={redirectTo}
          restingMascotState={restingMascotState}
          onMascotStateChange={setMascotState}
          onMascotGazeChange={setMascotGaze}
        />
      </AuthLayout>
    </>
  );
}
