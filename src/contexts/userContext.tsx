import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../lib/types";

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthed: boolean;
  setIsAuthed: (v: boolean) => void;
  login: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({ name: "Admin" });
  const [isAuthed, setIsAuthed] = useState(false);

  const login = (name: string) => {
    // Any data entered is valid; logic handling left blank per spec.
    setUser({ name: name || "Anonymous" });
    setIsAuthed(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthed(false);
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, isAuthed, setIsAuthed, login, logout }}
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
