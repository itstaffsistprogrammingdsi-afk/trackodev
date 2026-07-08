import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  getMe,
  User,
} from "../lib/auth.service";

import {
  getToken,
  getUser,
} from "../lib/authStore";

// ============================================
// CONTEXT TYPE
// ============================================

type AuthContextType = {
  user: User | null;

  loading: boolean;

  setUser: (
    user: User | null
  ) => void;

  loadUser: () => Promise<void>;

  hasRole: (
    role: string
  ) => boolean;

  can: (
    permission: string
  ) => boolean;
};

// ============================================
// CONTEXT
// ============================================

const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

// ============================================
// PROVIDER
// ============================================

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {

const [user, setUser] =
  useState<User | null>(null);

const [loading, setLoading] =
  useState(true);

  // ==========================================
  // LOAD USER
  // ==========================================

const loadUser = async (): Promise<void> => {
  setLoading(true);

  try {
    const token = getToken();

    if (!token) {
      setUser(null);
      return;
    }

    const cached = getUser();

    if (cached) {
      setUser(cached);
    }

    const fresh = await getMe();

    if (fresh) {
      setUser(fresh);

      localStorage.setItem(
        "user",
        JSON.stringify(fresh)
      );
    }
  } catch (error) {
    console.error(error);

    /**
     * JANGAN hapus token di sini
     */

    setUser(null);
  } finally {
    setLoading(false);
  }
};

  // ==========================================
  // INIT
  // ==========================================

  useEffect(() => {
    loadUser();
  }, []);

  // ==========================================
  // ROLE CHECK
  // ==========================================

  const hasRole = (
    role: string
  ): boolean => {

    return (
      user?.roles?.includes(role)
      ?? false
    );
  };

  // ==========================================
  // PERMISSION CHECK
  // ==========================================

const can = (
  permission: string
): boolean => {


  return (
    user?.permissions?.includes(permission)
    ?? false
  );
};

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        loadUser,
        hasRole,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useAuth = () => {

  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
};