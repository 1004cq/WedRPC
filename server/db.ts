import { eq, desc, and, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trackingLinks, captures, smtpSettings, auditLogs, InsertTrackingLink, InsertCapture, InsertSmtpSetting } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    textFields.forEach((field) => {
      const value = user[field];
      if (value !== undefined) {
        values[field] = value ?? null;
        updateSet[field] = value ?? null;
      }
    });

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

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// 追踪链接操作
export async function createTrackingLink(data: InsertTrackingLink) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(trackingLinks).values(data);
}

export async function getTrackingLinks(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return await db.select().from(trackingLinks).where(eq(trackingLinks.userId, userId)).orderBy(desc(trackingLinks.createdAt));
  }
  return await db.select().from(trackingLinks).orderBy(desc(trackingLinks.createdAt));
}

export async function getTrackingLinkById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(trackingLinks).where(eq(trackingLinks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteTrackingLink(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(captures).set({ deletedAt: new Date() }).where(and(eq(captures.linkId, id), isNull(captures.deletedAt)));
  await db.delete(trackingLinks).where(eq(trackingLinks.id, id));
}

// 采集记录操作
export async function createCapture(data: InsertCapture) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(captures).values(data);
}

export async function getCaptures(linkId?: string, linkIds?: string[]) {
  const db = await getDb();
  if (!db) return [];
  if (linkId) {
    return await db.select().from(captures).where(and(eq(captures.linkId, linkId), isNull(captures.deletedAt))).orderBy(desc(captures.createdAt));
  }
  if (linkIds && linkIds.length > 0) {
    return await db.select().from(captures).where(and(inArray(captures.linkId, linkIds), isNull(captures.deletedAt))).orderBy(desc(captures.createdAt));
  }
  return await db.select().from(captures).where(isNull(captures.deletedAt)).orderBy(desc(captures.createdAt));
}

export async function getCaptureById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(captures).where(and(eq(captures.id, id), isNull(captures.deletedAt))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteCapture(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(captures).set({ deletedAt: new Date() }).where(and(eq(captures.id, id), isNull(captures.deletedAt)));
}

export async function clearCaptures(linkId?: string, linkIds?: string[]) {
  const db = await getDb();
  if (!db) return;
  if (linkId) {
    await db.update(captures).set({ deletedAt: new Date() }).where(and(eq(captures.linkId, linkId), isNull(captures.deletedAt)));
  } else if (linkIds && linkIds.length > 0) {
    await db.update(captures).set({ deletedAt: new Date() }).where(and(inArray(captures.linkId, linkIds), isNull(captures.deletedAt)));
  } else {
    await db.update(captures).set({ deletedAt: new Date() }).where(isNull(captures.deletedAt));
  }
}

// SMTP 设置操作
export async function getSmtpSetting(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const res = await db.select().from(smtpSettings).where(eq(smtpSettings.userId, userId)).limit(1);
  return res.length > 0 ? res[0] : undefined;
}

export async function upsertSmtpSetting(data: InsertSmtpSetting) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(smtpSettings).values(data).onDuplicateKeyUpdate({
    set: {
      host: data.host,
      port: data.port,
      user: data.user,
      pass: data.pass,
      recipient: data.recipient,
      emailSubjectTemplate: data.emailSubjectTemplate,
      emailHtmlTemplate: data.emailHtmlTemplate,
      webhookUrl: data.webhookUrl,
      webhookType: data.webhookType,
      webhookTemplate: data.webhookTemplate,
      webhookAlertLevel: data.webhookAlertLevel,
    },
  });
}

export async function getAuditLogs(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(100);
  }
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
}
