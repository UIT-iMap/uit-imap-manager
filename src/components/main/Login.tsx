import { useState } from "react";
import { MapPin, LogIn } from "lucide-react";
import Button from "../ui/Button";
import { useUser } from "../../contexts/userContext";

export default function Login() {
  const { login } = useUser();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Any data entered is valid; auth logic intentionally left blank.
    login(name);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-sky-400 text-white">
            <MapPin size={22} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">UIT iMap Manager</h1>
          <p className="text-sm text-slate-400">Sign in to manage map data</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Username</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. admin"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
        </div>

        <Button type="submit" variant="primary" icon={<LogIn size={15} />} className="w-full justify-center">
          Sign in
        </Button>
      </form>
    </div>
  );
}
