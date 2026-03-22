ALTER TABLE `campaignReactions` ADD `scrolledPast` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `attentionScore` float;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `gutReactionScore` float;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `emotionalSignature` json;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `rationalAdjustment` float;--> statement-breakpoint
ALTER TABLE `campaignReactions` ADD `socialAdjustment` float;