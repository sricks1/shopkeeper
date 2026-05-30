"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function AddCommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("task_comments").insert({
      task_id: taskId,
      body: body.trim(),
      author_id: user?.id ?? null,
    });

    setIsLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20"
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || !body.trim()}
        className="self-end rounded-lg bg-[#e06829] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isLoading ? "Posting…" : "Post Comment"}
      </button>
    </form>
  );
}
