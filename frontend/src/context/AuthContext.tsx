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

  const token = getToken();

  if (!token) {
    setUser(null);
    setLoading(false);
    return;
  }

  const cached = getUser();

  if (cached) {
    setUser(cached);
  }

  try {
    const fresh = await getMe();

    setUser(fresh);
  } catch (error) {
    console.error(
      "GET ME ERROR =",
      error
    );

    setUser(null);

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );
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