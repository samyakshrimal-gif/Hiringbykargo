"use client";

import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) window.location.href = "/";
    else setErr("That's not it.");
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="font-display text-4xl">Kargo</div>
        <div className="eyebrow mt-1">shortlist · private</div>
        <input type="password" autoFocus className="field mt-8" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="mt-2 text-sm text-stop">{err}</p>}
        <button className="btn btn-ink mt-4 w-full">Enter</button>
      </form>
    </div>
  );
}
