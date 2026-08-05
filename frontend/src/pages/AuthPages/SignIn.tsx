import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Masuk | Tracko"
        description="Masuk ke aplikasi manajemen tugas Tracko."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
