"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CandidateActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"rescore" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function rescore() {
    setBusy("rescore");
    setErr(null);
    const res = await fetch(`/api/candidates/${id}/rescore`, { method: "POST" });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || "Failed");
    setBusy(null);
    router.refresh();
  }
  async function remove() {
    if (!confirm("Remove this candidate and their record?")) return;
    setBusy("delete");
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-3 text-xs">
      {err && <span className="text-stop">{err}</span>}
      <button onClick={rescore} disabled={!!busy} className="underline hover:text-ink disabled:opacity-50">
        {busy === "rescore" ? "Re-scoring…" : "Re-score"}
      </button>
      <button onClick={remove} disabled={!!busy} className="underline hover:text-stop disabled:opacity-50">
        Remove
      </button>
    </span>
  );
}
