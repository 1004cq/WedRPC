ALTER TABLE `captures` ADD `ipSource` varchar(32);--> statement-breakpoint
ALTER TABLE `captures` ADD `isPrivateIp` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `consentVersion` varchar(32) DEFAULT '2026-08' NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `consentAt` timestamp;--> statement-breakpoint
ALTER TABLE `captures` ADD `collectionMode` varchar(32) DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `riskFlags` text;--> statement-breakpoint
ALTER TABLE `trackingLinks` ADD `collectionMode` varchar(32) DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE `trackingLinks` ADD `retentionDays` int DEFAULT 30 NOT NULL;