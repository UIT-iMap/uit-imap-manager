import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../lib/types";
import { httpClient } from "../lib/httpClient";

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthed: boolean;
  setIsAuthed: (v: boolean) => void;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      const res = await httpClient.post<{
        success: boolean;
        message?: string;
        token?: string;
      }>("/auth", {
        body: { username, password },
      });

      if (res && res.token) {
        setToken(res.token);
        localStorage.setItem("token", res.token);
        const newUser = { name: username || "Admin" };
        setUser(newUser);
        localStorage.setItem("username", username || "Admin");
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

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthed(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        isAuthed,
        setIsAuthed,
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

