ALTER TABLE `agentBrandStates` ADD `psycheState` json;--> statement-breakpoint
ALTER TABLE `agentBrandStates` ADD `psycheLastTick` timestamp;--> statement-breakpoint
ALTER TABLE `agentBrandStates` ADD `psycheActiveBiases` json;--> statement-breakpoint
ALTER TABLE `agentBrandStates` ADD `psycheMood` varchar(50);