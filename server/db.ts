import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
import { trackingLinks, captures, InsertTrackingLink, InsertCapture } from "../drizzle/schema";
import { desc } from "drizzle-orm";

export async function createTrackingLink(data: InsertTrackingLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(trackingLinks).values(data);
  return data;
}

export async function getTrackingLinks() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(trackingLinks).orderBy(desc(trackingLinks.createdAt));
}

export async function getTrackingLinkById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.select().from(trackingLinks).where(eq(trackingLinks.id, id)).limit(1);
  return res[0] || null;
}

export async function deleteTrackingLink(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trackingLinks).where(eq(trackingLinks.id, id));
  await db.delete(captures).where(eq(captures.linkId, id));
  return { success: true };
}

export async function createCapture(data: InsertCapture) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(captures).values(data);
  return data;
}

export async function getCaptures(linkId?: string) {
  const db = await getDb();
  if (!db) return [];
  if (linkId) {
    return await db.select().from(captures).where(eq(captures.linkId, linkId)).orderBy(desc(captures.createdAt));
  }
  return await db.select().from(captures).orderBy(desc(captures.createdAt));
}

export async function deleteCapture(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Error");
  await db.delete(captures).where(eq(captures.id, id));
  return { success: true };
}

export async function clearAllCaptures(linkId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Error");
  if (linkId) {
    await db.delete(captures).where(eq(captures.linkId, linkId));
  } else {
    await db.delete(captures);
  }
  return { success: true };
}
