import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Current authenticated profile, or null. Safe to call from any server function/loader. A
 * deactivated account (profiles.disabled) is treated as not logged in here — this is the one
 * place that check needs to live, since every auth-gated route/server function goes through it.
 */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (!profile || profile.disabled) return null;

  return { id: user.id, email: user.email ?? "", role: profile.role, displayName: profile.displayName };
}

/** Throws if unauthenticated. Use inside server functions that require a logged-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
