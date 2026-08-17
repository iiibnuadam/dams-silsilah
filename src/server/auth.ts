import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isRegistrationOpen } from "@/lib/app-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.email(),
      password: z.string().min(8),
      displayName: z.string().min(1).max(120),
    }),
  )
  .handler(async ({ data }) => {
    // The very first account in the system bootstraps as superadmin and always gets in; every
    // account after that needs registration to be explicitly open (see src/lib/app-settings.ts).
    const [{ count: profileCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const isFirstAccount = profileCount === 0;
    if (!isFirstAccount && !(await isRegistrationOpen())) {
      throw new Error("Pendaftaran saat ini ditutup. Hubungi admin untuk mendapatkan akses.");
    }

    const supabase = createSupabaseServerClient();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: `${getRequestUrl().origin}/auth/confirm` },
    });
    if (error) throw new Error(error.message);
    if (!signUpData.user) throw new Error("Registrasi gagal, coba lagi.");

    await db
      .insert(profiles)
      .values({
        id: signUpData.user.id,
        email: data.email,
        displayName: data.displayName,
        role: isFirstAccount ? "superadmin" : "user",
      })
      .onConflictDoNothing();

    // If the Supabase project requires email confirmation, signUp succeeds but returns no
    // session until the user clicks the confirmation link — don't attempt to log them in yet.
    return { userId: signUpData.user.id, needsEmailConfirmation: !signUpData.session };
  });

/** Public — the /register page checks this before showing the form. */
export const getRegistrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { open: await isRegistrationOpen() };
});

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentUser();
});

const emailOtpType = z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/** Consumes the token from the confirmation-email link and establishes the session cookie. */
export const confirmEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ tokenHash: z.string().min(1), type: emailOtpType }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: data.type });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
