import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isRegistrationOpen, setRegistrationOpen } from "@/lib/app-settings";

async function requireSuperadmin() {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (profile?.role !== "superadmin") throw new Error("FORBIDDEN");
  return user;
}

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperadmin();
  return db.select().from(profiles).orderBy(profiles.createdAt);
});

export const getRegistrationOpen = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperadmin();
  return { open: await isRegistrationOpen() };
});

export const updateRegistrationOpen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ open: z.boolean() }))
  .handler(async ({ data }) => {
    await requireSuperadmin();
    await setRegistrationOpen(data.open);
    return { ok: true };
  });

/** Deactivates (or reactivates) an account — not a hard delete, so it's reversible and doesn't
 * touch Supabase Auth or orphan any trees/persons the account created. */
export const setUserDisabled = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.uuid(), disabled: z.boolean() }))
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin();
    if (data.userId === admin.id) throw new Error("Anda tidak bisa menonaktifkan akun Anda sendiri.");

    if (data.disabled) {
      const remainingSuperadmins = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.role, "superadmin"), eq(profiles.disabled, false), ne(profiles.id, data.userId)));
      const target = await db.query.profiles.findFirst({ where: eq(profiles.id, data.userId) });
      if (target?.role === "superadmin" && remainingSuperadmins.length === 0) {
        throw new Error("Tidak bisa menonaktifkan satu-satunya superadmin yang tersisa.");
      }
    }

    await db.update(profiles).set({ disabled: data.disabled }).where(eq(profiles.id, data.userId));
    return { ok: true };
  });
