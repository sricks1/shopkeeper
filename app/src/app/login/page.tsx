"use client";

import { Wrench } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, active")
      .eq("id", user?.id ?? "")
      .single();

    if (!staffRow?.active) {
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
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@thejoinery.club"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isLoading} className="mt-1 w-full">
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-card bg-accent shadow-lg shadow-accent/30">
          <Wrench size={28} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">ShopKeeper</h1>
        <p className="mt-1.5 text-xs text-white/40 uppercase tracking-widest">The Joinery</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-2xl shadow-black/40">
        <p className="mb-5 text-sm text-zinc-500">Staff access only</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
