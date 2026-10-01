export const AUTH_COOKIE = "kargo_session";

export async function tokenFor(password: string) {
  const data = new TextEncoder().encode(`kargo:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
