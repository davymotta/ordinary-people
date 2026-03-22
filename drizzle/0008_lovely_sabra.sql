CREATE TABLE `agentBrandStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`brandAgentId` int NOT NULL,
	`brandFamiliarity` float NOT NULL DEFAULT 0,
	`brandSentiment` float NOT NULL DEFAULT 0,
	`exposureCount` int NOT NULL DEFAULT 0,
	`lastExposureAt` timestamp,
	`saturationLevel` float NOT NULL DEFAULT 0,
	`accumulatedIrritation` float NOT NULL DEFAULT 0,
	`contentMemory` json,
	`currentEmotionalState` varchar(100),
	`touchpointHistory` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentBrandStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journeySimulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandAgentId` int,
	`name` varchar(300) NOT NULL,
	`simulationType` enum('journey','retargeting','media_mix','competitive','content_calendar') NOT NULL DEFAULT 'journey',
	`touchpoints` json NOT NULL,
	`agentIds` json,
	`totalAgents` int NOT NULL DEFAULT 0,
	`journeyStatus` enum('pending','running','complete','failed') DEFAULT 'pending',
	`results` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journeySimulations_id` PRIMARY KEY(`id`)
);
