import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import api from "../lib/axios";

// ✅ TYPE USER (sesuaikan kalau ada field tambahan)
type User = {
  id: number;
  name: string;
  email: string;
};

export default function UserProfiles() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  // ✅ pakai useCallback biar aman di dependency
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: User }>("/auth/me");
      setUser(res.data.user);
    } catch {
      // ❌ err tidak dipakai → langsung hilangkan
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // ✅ tidak warning lagi

  // 🔥 LOGOUT
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore error
    }

    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <PageMeta title="Profile Dashboard" description="User Profile Page" />

      <PageBreadcrumb pageTitle="Profile" />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>

        {/* DEBUG USER */}
        {user && (
          <div className="mb-4 text-sm text-gray-500">
            Login sebagai: <strong>{user.name}</strong> ({user.email})
          </div>
        )}

        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
          <UserAddressCard />
        </div>
      </div>
    </>
  );
}