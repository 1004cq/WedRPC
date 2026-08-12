import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const trackingLinks = mysqlTable("trackingLinks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  redirectUrl: text("redirectUrl").notNull(),
  userId: int("userId"), // 多用户权限隔离
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const captures = mysqlTable("captures", {
  id: varchar("id", { length: 64 }).primaryKey(),
  linkId: varchar("linkId", { length: 64 }).notNull(),
  ip: varchar("ip", { length: 128 }),
  gps: varchar("gps", { length: 128 }),
  fingerprint: text("fingerprint"),
  resolution: varchar("resolution", { length: 64 }),
  userAgent: text("userAgent"),
  filePath: text("filePath").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const smtpSettings = mysqlTable("smtpSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull(),
  user: varchar("user", { length: 255 }).notNull(),
  pass: varchar("pass", { length: 255 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  emailSubjectTemplate: text("emailSubjectTemplate"),
  emailHtmlTemplate: text("emailHtmlTemplate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackingLink = typeof trackingLinks.$inferSelect;
export type InsertTrackingLink = typeof trackingLinks.$inferInsert;

export type Capture = typeof captures.$inferSelect;
export type InsertCapture = typeof captures.$inferInsert;

export type SmtpSetting = typeof smtpSettings.$inferSelect;
export type InsertSmtpSetting = typeof smtpSettings.$inferInsert;
