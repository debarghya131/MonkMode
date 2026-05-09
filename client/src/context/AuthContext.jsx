import { createContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const TOKEN_KEY = "monkmode_token";
const USER_KEY = "monkmode_user";
const DEMO_MODE_KEY = "monkmode_demo_mode";

const DEMO_USER = {
  id: "demo-user",
  name: "Demo Monk",
  email: "demo@monkmode.com",
  isDemo: true
};

const getStoredAuth = () => {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedToken || !storedUser) {
    return { token: "", user: null };
  }

  try {
    return {
      token: storedToken,
      user: JSON.parse(storedUser)
    };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: "", user: null };
  }
};

export function AuthProvider({ children }) {
  const storedAuth = getStoredAuth();
  const [user, setUser] = useState(storedAuth.user);
  const [token, setToken] = useState(storedAuth.token);
  const isBootstrapping = false;
  const isDemoSession = Boolean(user?.isDemo) || String(token || "").startsWith("demo-mode-");

  const persistAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.removeItem(DEMO_MODE_KEY);
  };

  const clearAuth = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DEMO_MODE_KEY);
  };

  const startDemoMode = () => {
    const demoToken = `demo-mode-${Date.now()}`;
    setToken(demoToken);
    setUser(DEMO_USER);
    localStorage.setItem(TOKEN_KEY, demoToken);
    localStorage.setItem(USER_KEY, JSON.stringify(DEMO_USER));
    localStorage.setItem(DEMO_MODE_KEY, "true");
    return DEMO_USER;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persistAuth(data.token, data.user);
    return data.user;
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    persistAuth(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    clearAuth();
  };

  const value = {
    isAuthenticated: Boolean(token),
    isBootstrapping,
    isDemoMode: isDemoSession,
    login,
    logout,
    register,
    startDemoMode,
    token,
    user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
