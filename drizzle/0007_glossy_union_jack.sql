CREATE TABLE `brandAgents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100),
	`brandName` varchar(200) NOT NULL,
	`sector` varchar(100),
	`positioning` enum('luxury','premium','mid-market','mass-market','value'),
	`brandIdentity` json,
	`marketPresence` json,
	`digitalPresence` json,
	`targetAudience` json,
	`competitors` json,
	`defaultAgentPool` json,
	`researchRaw` json,
	`campaignHistory` json,
	`learnings` json,
	`onboardingStatus` enum('pending','researching','profiling','validating','complete') DEFAULT 'pending',
	`onboardingCompletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandAgents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calibrationResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandAgentId` int NOT NULL,
	`harvestedContent` json,
	`realEngagementStats` json,
	`simulationResults` json,
	`calibrationResults` json,
	`perDimension` json,
	`outliers` json,
	`weightsBefore` json,
	`weightsAfter` json,
	`calibrationStatus` enum('pending','harvesting','simulating','computing','complete','failed') DEFAULT 'pending',
	`errorMessage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `calibrationResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` ADD `haidtProfile` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `lifeHistoryNotes` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `contradictions` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `circadianPattern` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `relationalField` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `coreWound` varchar(300);--> statement-breakpoint
ALTER TABLE `agents` ADD `coreDesire` varchar(300);--> statement-breakpoint
ALTER TABLE `agents` ADD `innerVoiceTone` varchar(50);--> statement-breakpoint
ALTER TABLE `agents` ADD `publicIdentity` varchar(300);--> statement-breakpoint
ALTER TABLE `agents` ADD `privateBehavior` varchar(300);--> statement-breakpoint
ALTER TABLE `agents` ADD `timeOrientation` varchar(50);--> statement-breakpoint
ALTER TABLE `agents` ADD `moneyNarrative` varchar(300);--> statement-breakpoint
ALTER TABLE `agents` ADD `primaryPerceptionMode` varchar(20);--> statement-breakpoint
ALTER TABLE `agents` ADD `humorStyle` varchar(50);--> statement-breakpoint
ALTER TABLE `agents` ADD `biasVector` json;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `digestJson` json;