CREATE TABLE `agentMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`memoryType` enum('episodic','semantic','social','brand') NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`emotionalValence` float NOT NULL DEFAULT 0,
	`emotionalIntensity` float NOT NULL DEFAULT 0.5,
	`tags` json,
	`sourceEventId` int,
	`decayRate` float NOT NULL DEFAULT 0.01,
	`importance` float NOT NULL DEFAULT 0.5,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`moodValence` float NOT NULL DEFAULT 0,
	`moodArousal` float NOT NULL DEFAULT 0.5,
	`financialStress` float NOT NULL DEFAULT 0.3,
	`socialTrust` float NOT NULL DEFAULT 0.5,
	`institutionalTrust` float NOT NULL DEFAULT 0.5,
	`maslowCurrent` int NOT NULL DEFAULT 3,
	`activeConcerns` json,
	`regimePerception` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`age` int NOT NULL,
	`city` varchar(100) NOT NULL,
	`region` varchar(100) NOT NULL,
	`geo` enum('Nord','Centro','Sud','Isole') NOT NULL,
	`profession` varchar(200) NOT NULL,
	`incomeBand` varchar(50) NOT NULL,
	`incomeEstimate` float NOT NULL,
	`education` enum('licenza_elementare','licenza_media','diploma','laurea_triennale','laurea_magistrale','dottorato') NOT NULL,
	`householdType` varchar(100) NOT NULL,
	`familyMembers` int NOT NULL DEFAULT 1,
	`generation` enum('Silent','Boomer','GenX','Millennial','GenZ') NOT NULL,
	`populationShare` float NOT NULL,
	`system1Dominance` float NOT NULL DEFAULT 0.7,
	`lossAversionCoeff` float NOT NULL DEFAULT 2,
	`mentalAccountingProfile` json,
	`culturalCapital` float NOT NULL DEFAULT 0.5,
	`habitusProfile` json,
	`conspicuousConsumptionIndex` float NOT NULL DEFAULT 0.3,
	`maslowBaseline` int NOT NULL DEFAULT 3,
	`autonomyOrientation` float NOT NULL DEFAULT 0.5,
	`noveltySeeking` float NOT NULL DEFAULT 0.5,
	`priceSensitivity` float NOT NULL DEFAULT 0.5,
	`statusOrientation` float NOT NULL DEFAULT 0.5,
	`riskAversion` float NOT NULL DEFAULT 0.5,
	`emotionalSusceptibility` float NOT NULL DEFAULT 0.5,
	`identityDefensiveness` float NOT NULL DEFAULT 0.5,
	`mediaDiet` json,
	`topicAffinities` json,
	`socialContacts` json,
	`systemPrompt` text,
	`avatarUrl` varchar(500),
	`bibliographyNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `campaignReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignTestId` int NOT NULL,
	`agentId` int NOT NULL,
	`overallScore` float,
	`attractionScore` float,
	`repulsionScore` float,
	`adequacyScore` float,
	`buyProbability` float,
	`shareProbability` float,
	`emotionalValence` float,
	`emotionalIntensity` float,
	`gutReaction` text,
	`reflection` text,
	`quote` text,
	`attractions` json,
	`repulsions` json,
	`tensions` text,
	`motivations` text,
	`memoryContext` json,
	`stateAtReaction` json,
	`socialInfluence` json,
	`status` enum('pending','processing','complete','failed') DEFAULT 'pending',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaignReactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaignReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignTestId` int NOT NULL,
	`avgOverallScore` float,
	`avgBuyProbability` float,
	`avgShareProbability` float,
	`avgAttractionScore` float,
	`avgRepulsionScore` float,
	`weightedMarketInterest` float,
	`scoreDistribution` json,
	`byGeneration` json,
	`byGeo` json,
	`byIncome` json,
	`executiveSummary` text,
	`commonPatterns` text,
	`keyDivergences` text,
	`topAttractions` json,
	`topRepulsions` json,
	`segmentInsights` text,
	`recommendations` text,
	`riskFlags` json,
	`status` enum('pending','generating','complete','failed') DEFAULT 'pending',
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaignReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaignReports_campaignTestId_unique` UNIQUE(`campaignTestId`)
);
--> statement-breakpoint
CREATE TABLE `campaignTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(300),
	`status` enum('pending','running','complete','failed') DEFAULT 'pending',
	`agentIds` json,
	`totalAgents` int NOT NULL DEFAULT 0,
	`completedAgents` int NOT NULL DEFAULT 0,
	`aggregatedResults` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaignTests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventExposures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`eventId` int NOT NULL,
	`reaction` text,
	`stateChanges` json,
	`memoryCreated` boolean DEFAULT false,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventExposures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worldEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text NOT NULL,
	`eventType` enum('macro_economic','personal_life','social','media','cultural','natural') NOT NULL,
	`intensity` float NOT NULL DEFAULT 0.5,
	`scope` enum('global','national','regional','personal','segment') NOT NULL DEFAULT 'national',
	`targetAgentIds` json,
	`targetSegment` json,
	`mediaUrls` json,
	`mediaType` enum('none','image','video','mixed') DEFAULT 'none',
	`economicImpact` float NOT NULL DEFAULT 0,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worldEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `tone` enum('aspirational','practical','provocative','informational','emotional','humorous','urgent') NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `format` enum('short_video','image','long_article','carousel','story','banner','post') NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `emotionalCharge` float NOT NULL DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `statusSignal` float NOT NULL DEFAULT 0.3;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `priceSignal` float NOT NULL DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `noveltySignal` float NOT NULL DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `tribalIdentitySignal` float NOT NULL DEFAULT 0.3;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `pricePoint` float;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `copyText` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `mediaUrls` json;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `mediaType` enum('none','image','video','mixed') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `campaigns` DROP COLUMN `regimeState`;