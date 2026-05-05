"use client";

import { createClient } from "@/lib/supabase/client";
import { Wrench } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-[#324168] focus:bg-white focus:ring-2 focus:ring-[#324168]/15";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/tools";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, active")
      .eq("id", user?.id ?? "")
      .single();

    if (!staffRow || !staffRow.active) {
      await supabase.auth.signOut();
      setError("Your account isn't set up for ShopKeeper access. Contact Steven.");
      setIsLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@thejoinery.club"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 w-full rounded-xl bg-[#e06829] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c55a22] disabled:opacity-60"
      >
        {isLoading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a112a] px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e06829] shadow-lg shadow-[#e06829]/30">
          <Wrench size={32} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">ShopKeeper</h1>
        <p className="mt-2 text-sm text-white/40 uppercase tracking-widest">
          The Joinery
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl shadow-black/40">
        <p className="mb-6 text-sm text-zinc-500">Staff access only</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
