CREATE TABLE `smtpSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`user` varchar(255) NOT NULL,
	`pass` varchar(255) NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`emailSubjectTemplate` text,
	`emailHtmlTemplate` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smtpSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `smtpSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `trackingLinks` ADD `userId` int;