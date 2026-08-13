import { getDb } from "./db";
import { captures } from "../drizzle/schema";
import { encrypt, decrypt } from "./crypto";
import { eq } from "drizzle-orm";

export async function migrateExistingCapturesEncryption() {
  const db = await getDb();
  if (!db) return;

  try {
    const all = await db.select().from(captures);
    for (const cap of all) {
      let updated = false;
      const patch: { gps?: string; fingerprint?: string } = {};

      if (cap.gps && !cap.gps.includes(":")) {
        patch.gps = encrypt(cap.gps);
        updated = true;
      }
      if (cap.fingerprint && !cap.fingerprint.includes(":")) {
        patch.fingerprint = encrypt(cap.fingerprint);
        updated = true;
      }

      if (updated) {
        await db.update(captures).set(patch).where(eq(captures.id, cap.id));
      }
    }
    console.log("[Migration] Existing captures encrypted successfully.");
  } catch (err) {
    console.error("[Migration] Failed to encrypt existing captures:", err);
  }
}
