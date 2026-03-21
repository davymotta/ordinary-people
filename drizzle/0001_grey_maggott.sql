CREATE TABLE `calibrationRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int,
	`iteration` int NOT NULL,
	`status` enum('pending','running','complete','failed') NOT NULL DEFAULT 'pending',
	`weightsBefore` json NOT NULL,
	`weightsAfter` json,
	`regimeModifiersBefore` json NOT NULL,
	`regimeModifiersAfter` json,
	`metrics` json,
	`adjustments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calibrationRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(300) NOT NULL,
	`topics` json NOT NULL,
	`tone` enum('aspirational','practical','provocative','informational','emotional') NOT NULL,
	`format` enum('short_video','image','long_article','carousel','story') NOT NULL,
	`emotionalCharge` float NOT NULL,
	`statusSignal` float NOT NULL,
	`priceSignal` float NOT NULL,
	`noveltySignal` float NOT NULL,
	`tribalIdentitySignal` float NOT NULL,
	`pricePoint` float NOT NULL,
	`channel` varchar(50) NOT NULL,
	`regimeId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groundTruth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`segmentResults` json NOT NULL,
	`knownRejections` json,
	`dataSource` varchar(200),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groundTruth_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archetypeId` varchar(100) NOT NULL,
	`label` varchar(200) NOT NULL,
	`ageMin` int NOT NULL,
	`ageMax` int NOT NULL,
	`incomeBand` enum('very_low','low','low_medium','medium','medium_high','high','very_high') NOT NULL,
	`geo` enum('urban','suburban','rural') NOT NULL,
	`education` enum('none','secondary','degree','postgrad') NOT NULL,
	`householdType` enum('single','couple','family','shared') NOT NULL,
	`noveltySeeking` float NOT NULL,
	`statusOrientation` float NOT NULL,
	`priceSensitivity` float NOT NULL,
	`riskAversion` float NOT NULL,
	`emotionalSusceptibility` float NOT NULL,
	`identityDefensiveness` float NOT NULL,
	`populationShare` float NOT NULL,
	`marketSpendShare` float NOT NULL,
	`topicAffinities` json,
	`formatAffinities` json,
	`channelUsage` json,
	`comfortablePriceMid` float,
	`comfortablePriceRange` float,
	`identityProfile` json,
	`bibliographyNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personas_id` PRIMARY KEY(`id`),
	CONSTRAINT `personas_archetypeId_unique` UNIQUE(`archetypeId`)
);
--> statement-breakpoint
CREATE TABLE `regimes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`label` varchar(200) NOT NULL,
	`description` text,
	`modPriceSensitivity` float NOT NULL DEFAULT 1,
	`modStatusOrientation` float NOT NULL DEFAULT 1,
	`modNoveltySeeking` float NOT NULL DEFAULT 1,
	`modRiskAversion` float NOT NULL DEFAULT 1,
	`modEmotionalSusceptibility` float NOT NULL DEFAULT 1,
	`modIdentityDefensiveness` float NOT NULL DEFAULT 1,
	`bibliographyBasis` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regimes_id` PRIMARY KEY(`id`),
	CONSTRAINT `regimes_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200),
	`status` enum('pending','running','complete','failed') NOT NULL DEFAULT 'pending',
	`config` json NOT NULL,
	`results` json,
	`metrics` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`error` text,
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);
