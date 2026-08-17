import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Current authenticated profile, or null. Safe to call from any server function/loader. */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

/** Throws if unauthenticated. Use inside server functions that require a logged-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
