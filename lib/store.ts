import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Candidate, Hire, SuccessPattern } from "./types";
import { DEFAULT_PATTERN, SEED_HIRES } from "./rubric";

// Supabase when configured; otherwise a local JSON file so the app runs
// with zero setup during development.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let sb: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  sb ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return sb;
}

export const storageMode = () => (supabase() ? "supabase" : "local");

interface LocalDb {
  candidates: Candidate[];
  hires: Hire[];
  pattern: SuccessPattern | null;
}
const DB_FILE = path.join(process.cwd(), ".data", "db.json");

async function readLocal(): Promise<LocalDb> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch {
    return { candidates: [], hires: [], pattern: null };
  }
}
async function writeLocal(db: LocalDb) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}
// Serialise local writes so parallel uploads don't clobber each other.
let chain: Promise<unknown> = Promise.resolve();
function withLocal<T>(fn: (db: LocalDb) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await readLocal();
    const out = await fn(db);
    await writeLocal(db);
    return out;
  });
  chain = run.catch(() => {});
  return run;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------- candidates ----------

export async function listCandidates(): Promise<Candidate[]> {
  const s = supabase();
  if (s) return check(await s.from("candidates").select("*").order("created_at", { ascending: false })) as Candidate[];
  return (await readLocal()).candidates.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const s = supabase();
  if (s) return (check(await s.from("candidates").select("*").eq("id", id).maybeSingle()) as Candidate) ?? null;
  return (await readLocal()).candidates.find((c) => c.id === id) ?? null;
}

export async function insertCandidate(c: Omit<Candidate, "id" | "created_at">): Promise<Candidate> {
  const row: Candidate = { ...c, id: randomUUID(), created_at: new Date().toISOString() };
  const s = supabase();
  if (s) return check(await s.from("candidates").insert(row).select().single()) as Candidate;
  return withLocal((db) => {
    db.candidates.push(row);
    return row;
  });
}

export async function updateCandidate(id: string, patch: Partial<Candidate>): Promise<Candidate> {
  const s = supabase();
  if (s) return check(await s.from("candidates").update(patch).eq("id", id).select().single()) as Candidate;
  return withLocal((db) => {
    const c = db.candidates.find((x) => x.id === id);
    if (!c) throw new Error("Candidate not found");
    Object.assign(c, patch);
    return c;
  });
}

export async function deleteCandidate(id: string) {
  const s = supabase();
  if (s) return void check(await s.from("candidates").delete().eq("id", id));
  await withLocal((db) => {
    db.candidates = db.candidates.filter((c) => c.id !== id);
  });
}

// ---------- hires ----------

export async function listHires(): Promise<Hire[]> {
  const s = supabase();
  if (s) {
    let rows = check(await s.from("hires").select("*").order("joined_on", { ascending: true })) as (Hire & { joined_on?: string })[];
    if (!rows.length) {
      rows = check(
        await s
          .from("hires")
          .insert(SEED_HIRES.map((h, i) => ({ ...h, id: randomUUID(), joined_on: i })))
          .select()
      ) as Hire[];
    }
    return rows.map(({ joined_on: _j, ...h }) => h as Hire);
  }
  return withLocal((db) => {
    if (!db.hires.length) db.hires = SEED_HIRES.map((h) => ({ ...h, id: randomUUID() }));
    return db.hires;
  });
}

export async function updateHire(id: string, patch: Partial<Hire>): Promise<void> {
  const s = supabase();
  if (s) return void check(await s.from("hires").update(patch).eq("id", id));
  await withLocal((db) => {
    const h = db.hires.find((x) => x.id === id);
    if (h) Object.assign(h, patch);
  });
}

// ---------- success pattern ----------

export async function getPattern(): Promise<SuccessPattern> {
  const s = supabase();
  if (s) {
    const row = check(await s.from("settings").select("value").eq("key", "pattern").maybeSingle()) as { value: SuccessPattern } | null;
    return row?.value ?? DEFAULT_PATTERN;
  }
  return (await readLocal()).pattern ?? DEFAULT_PATTERN;
}

export async function savePattern(p: SuccessPattern | null) {
  const s = supabase();
  if (s) {
    if (!p) return void check(await s.from("settings").delete().eq("key", "pattern"));
    return void check(await s.from("settings").upsert({ key: "pattern", value: p }));
  }
  await withLocal((db) => {
    db.pattern = p;
  });
}
