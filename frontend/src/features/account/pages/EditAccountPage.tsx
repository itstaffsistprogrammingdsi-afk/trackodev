import { Link } from "react-router-dom";
import { useAccountQuery } from "../hooks/useAccount";
import AvatarUploader from "../components/AvatarUploader";
import ProfileCard from "../components/ProfileCard";
import PasswordCard from "../components/PasswordCard";

export default function EditAccountPage() {
  const { data: user, isLoading, isError } = useAccountQuery();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Edit Akun
        </h2>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Kembali
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Memuat data akun...
        </p>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Gagal memuat data akun. Silakan coba lagi.
        </p>
      )}

      {user && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
              Foto Profil
            </h3>
            <AvatarUploader name={user.name} avatarUrl={user.avatar} />
          </div>

          <ProfileCard user={user} />
          <PasswordCard />
        </div>
      )}
    </div>
  );
}
