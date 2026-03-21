ALTER TABLE `campaigns` ADD `regimeState` json;--> statement-breakpoint
ALTER TABLE `personas` ADD `conformismIndex` float DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `authorityTrust` float DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `delayedGratification` float DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `culturalCapital` float DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `locusOfControl` float DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `mediaDiet` json;--> statement-breakpoint
ALTER TABLE `personas` ADD `referenceGroup` varchar(100);--> statement-breakpoint
ALTER TABLE `personas` ADD `rejectionGroup` varchar(100);--> statement-breakpoint
ALTER TABLE `personas` ADD `generationalCohort` varchar(50);--> statement-breakpoint
ALTER TABLE `regimes` ADD `modConformismIndex` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `regimes` ADD `modAuthorityTrust` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `regimes` ADD `modDelayedGratification` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `regimes` ADD `modCulturalCapital` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `regimes` ADD `modLocusOfControl` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` DROP COLUMN `regimeId`;