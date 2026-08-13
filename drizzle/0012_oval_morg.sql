ALTER TABLE `smtpSettings` ADD `trustedProxyIps` text;--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `smtpTestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `smtpTestResult` varchar(32);--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `webhookLastSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `webhookLastResult` varchar(32);--> statement-breakpoint
ALTER TABLE `smtpSettings` ADD `webhookLastError` text;