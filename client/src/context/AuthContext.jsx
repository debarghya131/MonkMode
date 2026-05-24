import { useAuth as useClerkAuth, useUser } from "@clerk/react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setApiTokenProvider } from "../api/axios";

const AuthContext = createContext(null);

const DEMO_MODE_KEY = "monkmode_demo_mode";
const LEGACY_TOKEN_KEY = "monkmode_token";
const LEGACY_USER_KEY = "monkmode_user";

const DEMO_USER = {
  id: "demo-user",
  name: "Demo Monk",
  email: "demo@monkmode.com",
  isDemo: true
};

const readDemoModeFlag = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
};

const clearLegacyAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

const normalizeClerkUser = (clerkUser) => {
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    "";
  const fullName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

  return {
    id: clerkUser.id,
    name: fullName || email || "Friend",
    email
  };
};

export function AuthProvider({ children }) {
  const { getToken, isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [demoModeRequested, setDemoModeRequested] = useState(readDemoModeFlag);
  const isDemoSession = demoModeRequested && !isSignedIn;

  useEffect(() => {
    clearLegacyAuth();
  }, []);

  useEffect(() => {
    if (!isSignedIn || !demoModeRequested) return;
    localStorage.removeItem(DEMO_MODE_KEY);
    setDemoModeRequested(false);
  }, [demoModeRequested, isSignedIn]);

  useEffect(() => {
    setApiTokenProvider(async () => {
      if (!isLoaded || !isSignedIn || isDemoSession) return "";
      return (await getToken()) || "";
    });

    return () => {
      setApiTokenProvider(async () => "");
    };
  }, [getToken, isDemoSession, isLoaded, isSignedIn]);

  const startDemoMode = useCallback(() => {
    clearLegacyAuth();
    localStorage.setItem(DEMO_MODE_KEY, "true");
    setDemoModeRequested(true);
    return DEMO_USER;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(DEMO_MODE_KEY);
    clearLegacyAuth();
    setDemoModeRequested(false);
    if (isSignedIn) {
      void signOut();
    }
  }, [isSignedIn, signOut]);

  const value = useMemo(() => ({
    isAuthenticated: isDemoSession || Boolean(isSignedIn),
    hasRealSession: Boolean(isSignedIn),
    isBootstrapping: !isLoaded && !isDemoSession,
    isDemoMode: isDemoSession,
    authMode: isDemoSession ? "demo" : isSignedIn ? "clerk" : "guest",
    logout,
    startDemoMode,
    token: isDemoSession ? "demo-mode" : "",
    user: isDemoSession ? DEMO_USER : normalizeClerkUser(clerkUser)
  }), [clerkUser, isDemoSession, isLoaded, isSignedIn, logout, startDemoMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
