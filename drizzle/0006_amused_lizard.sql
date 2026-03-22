CREATE TABLE `archetypeProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archetypeProfileId` varchar(100) NOT NULL,
	`openness` enum('L','M','H') NOT NULL,
	`conscientiousness` enum('L','M','H') NOT NULL,
	`extraversion` enum('L','M','H') NOT NULL,
	`agreeableness` enum('L','M','H') NOT NULL,
	`neuroticism` enum('L','M','H') NOT NULL,
	`archetypeId` varchar(50) NOT NULL,
	`haidtCareHarm` enum('H','L') NOT NULL,
	`haidtFairnessCheating` enum('H','L') NOT NULL,
	`haidtLoyaltyBetrayal` enum('H','L') NOT NULL,
	`haidtAuthoritySubversion` enum('H','L') NOT NULL,
	`haidtSanctityDegradation` enum('H','L') NOT NULL,
	`haidtLibertyOppression` enum('H','L') NOT NULL,
	`culturalClusterId` varchar(50) NOT NULL,
	`hasCoherenceViolations` boolean NOT NULL DEFAULT false,
	`coherenceViolations` json,
	`systemPrompt` text,
	`activityLevel` float NOT NULL DEFAULT 0.5,
	`sentimentBias` float NOT NULL DEFAULT 0,
	`stance` enum('supportive','opposing','neutral','observer') NOT NULL DEFAULT 'neutral',
	`influenceWeight` float NOT NULL DEFAULT 0.5,
	`echoChamberStrength` float NOT NULL DEFAULT 0.3,
	`responseDelayMin` int NOT NULL DEFAULT 1,
	`responseDelayMax` int NOT NULL DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archetypeProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `archetypeProfiles_archetypeProfileId_unique` UNIQUE(`archetypeProfileId`)
);
--> statement-breakpoint
CREATE TABLE `culturalClusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clusterId` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`countries` json,
	`pdi` int,
	`idv` int,
	`mas` int,
	`uai` int,
	`lto` int,
	`ivr` int,
	`description` text NOT NULL,
	`culturalTraits` json,
	`consumerCulture` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `culturalClusters_id` PRIMARY KEY(`id`),
	CONSTRAINT `culturalClusters_clusterId_unique` UNIQUE(`clusterId`)
);
--> statement-breakpoint
CREATE TABLE `haidtFoundations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`foundationId` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`highDescription` text NOT NULL,
	`highTriggers` json,
	`highAdResponse` text NOT NULL,
	`lowDescription` text NOT NULL,
	`lowTriggers` json,
	`lowAdResponse` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `haidtFoundations_id` PRIMARY KEY(`id`),
	CONSTRAINT `haidtFoundations_foundationId_unique` UNIQUE(`foundationId`)
);
--> statement-breakpoint
CREATE TABLE `hofstedeCountries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ctr` varchar(10) NOT NULL,
	`country` varchar(100) NOT NULL,
	`pdi` int,
	`idv` int,
	`mas` int,
	`uai` int,
	`lto` int,
	`ivr` int,
	`assignedCluster` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hofstedeCountries_id` PRIMARY KEY(`id`),
	CONSTRAINT `hofstedeCountries_country_unique` UNIQUE(`country`)
);
--> statement-breakpoint
CREATE TABLE `pearsonArchetypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archetypeId` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`coreDesire` text NOT NULL,
	`coreFear` text NOT NULL,
	`strategy` text NOT NULL,
	`gift` varchar(200) NOT NULL,
	`shadow` varchar(200) NOT NULL,
	`brandExamples` json,
	`consumerTriggers` json,
	`adResponse` text NOT NULL,
	`bigFiveAffinity` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pearsonArchetypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `pearsonArchetypes_archetypeId_unique` UNIQUE(`archetypeId`)
);
