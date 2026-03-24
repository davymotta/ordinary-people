ALTER TABLE `campaignReactions` ADD `psycheMood` varchar(50);--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `psycheActiveBiases` json;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `psycheWoundActive` boolean DEFAULT false;