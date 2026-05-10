import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  tickType: "blue" | "black" | "orange" | null;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

const STORAGE_KEY = "braw_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        fetch(`/api/auth/me/${parsed.id}`)
          .then((r) => {
            if (!r.ok) { localStorage.removeItem(STORAGE_KEY); setLoading(false); return; }
            return r.json();
          })
          .then((data) => {
            if (data) { setUser(data); }
            setLoading(false);
          })
          .catch(() => { localStorage.removeItem(STORAGE_KEY); setLoading(false); });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  function login(u: AuthUser) {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
