CREATE TABLE `agentHistoricalExposures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`eventId` int NOT NULL,
	`eventType` enum('historical','tv_program','iconic_ad','cultural_phenomenon') NOT NULL,
	`ageAtEvent` int NOT NULL,
	`isFormativeYear` boolean NOT NULL DEFAULT false,
	`relevanceScore` float NOT NULL DEFAULT 0.5,
	`memoryText` text,
	`emotionalValence` float,
	`memorySaliency` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentHistoricalExposures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `culturalPhenomena` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titolo` varchar(200) NOT NULL,
	`descrizione` text NOT NULL,
	`periodo` varchar(50) NOT NULL,
	`impatto` text NOT NULL,
	`segmentiCoinvolti` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `culturalPhenomena_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicalEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anno` int NOT NULL,
	`annoFine` int,
	`titolo` varchar(200) NOT NULL,
	`descrizione` text NOT NULL,
	`tipo` enum('politico','economico','culturale','tecnologico','naturale','criminalità','sport','internazionale','sociale') NOT NULL,
	`portata` enum('globale','nazionale','regionale') NOT NULL,
	`impatto_emotivo` enum('paura','speranza','rabbia','orgoglio','lutto','shock','gioia','indignazione','nostalgia','curiosità','meraviglia','tristezza') NOT NULL,
	`intensita` float NOT NULL DEFAULT 0.5,
	`segmentiPiuColpiti` json,
	`vettoreMediale` enum('radio','tv_generalista','stampa','internet','social_media') NOT NULL,
	`decennio` varchar(20) NOT NULL,
	`geolocalizzazione` varchar(100) NOT NULL DEFAULT 'Italia',
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicalEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `iconicAds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand` varchar(200) NOT NULL,
	`prodotto` varchar(200) NOT NULL,
	`slogan` varchar(300),
	`anno` int NOT NULL DEFAULT 0,
	`rete` varchar(100),
	`descrizione` text NOT NULL,
	`impattoculturale` text NOT NULL,
	`segmentoTarget` varchar(200),
	`periodo` varchar(50) NOT NULL,
	`intensitaCulturale` float NOT NULL DEFAULT 0.5,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `iconicAds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tvPrograms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titolo` varchar(200) NOT NULL,
	`rete` varchar(100) NOT NULL,
	`anni` varchar(100) NOT NULL,
	`annoInizio` int NOT NULL DEFAULT 0,
	`descrizione` text NOT NULL,
	`impattoculturale` text NOT NULL,
	`audienceTipo` varchar(200),
	`intensitaCulturale` float NOT NULL DEFAULT 0.5,
	`periodo` varchar(50) NOT NULL,
	`tipo` varchar(100) NOT NULL DEFAULT 'varietà',
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tvPrograms_id` PRIMARY KEY(`id`)
);
