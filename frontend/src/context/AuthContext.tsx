import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getMe, User } from "../lib/auth.service";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const loadUser = async () => {
    const token = localStorage.getItem("token");

    // 🔥 kalau tidak ada token stop
    if (!token) {
      setUser(null);
      return;
    }

    const cached = localStorage.getItem("user");

    if (cached) {
      setUser(JSON.parse(cached));
    }

    try {
      const fresh = await getMe();
      setUser(fresh);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
