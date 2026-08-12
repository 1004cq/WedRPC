CREATE TABLE `captures` (
	`id` varchar(64) NOT NULL,
	`linkId` varchar(64) NOT NULL,
	`ip` varchar(128),
	`gps` varchar(128),
	`fingerprint` text,
	`resolution` varchar(64),
	`userAgent` text,
	`filePath` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `captures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trackingLinks` (
	`id` varchar(64) NOT NULL,
	`redirectUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trackingLinks_id` PRIMARY KEY(`id`)
);
