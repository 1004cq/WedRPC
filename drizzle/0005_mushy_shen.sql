ALTER TABLE `smtpSettings` ADD `webhookUrl` text;--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `webhookType` varchar(32) DEFAULT 'dingtalk';