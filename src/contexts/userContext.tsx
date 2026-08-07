import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../lib/types";
import { httpClient, setAccessToken, getAccessToken, setUnauthCallback } from "../lib/httpClient";

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthed: boolean;
  setIsAuthed: (v: boolean) => void;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateToken = (newToken: string | null) => {
    setAccessToken(newToken);
    setTokenState(newToken);
  };

  useEffect(() => {
    setUnauthCallback(() => {
      updateToken(null);
      setUser(null);
      setIsAuthed(false);
    });

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const res = await httpClient.post<{
          success: boolean;
          accessToken: string;
          user?: { username: string; name?: string };
        }>("/auth/refresh");

        if (res && res.accessToken) {
          updateToken(res.accessToken);
          const userData: User = res.user
            ? { name: res.user.name || res.user.username || "Admin", username: res.user.username }
            : { name: "Admin" };
          setUser(userData);
          setIsAuthed(true);
        } else {
          updateToken(null);
          setUser(null);
          setIsAuthed(false);
        }
      } catch {
        updateToken(null);
        setUser(null);
        setIsAuthed(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      const res = await httpClient.post<{
        success: boolean;
        message?: string;
        accessToken?: string;
        token?: string;
        user?: { username: string; name?: string };
      }>("/auth/login", {
        body: { username, password },
      });

      const tokenReceived = res.accessToken || res.token;
      if (res && tokenReceived) {
        updateToken(tokenReceived);
        const userData: User = res.user
          ? { name: res.user.name || res.user.username || username || "Admin", username: res.user.username }
          : { name: username || "Admin", username };
        setUser(userData);
        setIsAuthed(true);
      } else {
        throw new Error(res?.message || "Authentication failed");
      }
    } catch (err: any) {
      if (err?.data?.message) {
        throw new Error(err.data.message);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await httpClient.post("/auth/logout");
    } catch {
      // Ignore network / logout errors
    } finally {
      updateToken(null);
      setUser(null);
      setIsAuthed(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken: updateToken,
        isAuthed,
        setIsAuthed,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
