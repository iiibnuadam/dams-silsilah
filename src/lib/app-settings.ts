import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, profiles } from "@/db/schema";

/** Fixed id for the single settings row — there is only ever one. */
const APP_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

async function getOrCreateSettings() {
  const existing = await db.query.appSettings.findFirst({ where: eq(appSettings.id, APP_SETTINGS_ID) });
  if (existing) return existing;
  const [created] = await db.insert(appSettings).values({ id: APP_SETTINGS_ID }).onConflictDoNothing().returning();
  return created ?? (await db.query.appSettings.findFirst({ where: eq(appSettings.id, APP_SETTINGS_ID) }))!;
}

/** True before any account exists (bootstrap) or once an admin has explicitly opened registration. */
export async function isRegistrationOpen(): Promise<boolean> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
  if (count === 0) return true;
  const settings = await getOrCreateSettings();
  return settings.registrationOpen;
}

export async function setRegistrationOpen(open: boolean): Promise<void> {
  await getOrCreateSettings();
  await db.update(appSettings).set({ registrationOpen: open, updatedAt: new Date() }).where(eq(appSettings.id, APP_SETTINGS_ID));
}
