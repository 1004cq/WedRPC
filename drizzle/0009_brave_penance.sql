ALTER TABLE `auditLogs` ADD `targetType` varchar(64);--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `targetId` varchar(128);--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `result` varchar(32) DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `userAgent` text;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `integrityHash` varchar(128);