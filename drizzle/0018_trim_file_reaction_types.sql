DELETE FROM "file_reactions" WHERE "reaction_type" IN ('fire', 'clap');--> statement-breakpoint
ALTER TYPE "public"."file_reaction_type" RENAME TO "file_reaction_type_old";--> statement-breakpoint
CREATE TYPE "public"."file_reaction_type" AS ENUM('heart', 'laugh', 'cry', 'smile');--> statement-breakpoint
ALTER TABLE "file_reactions" ALTER COLUMN "reaction_type" TYPE "public"."file_reaction_type" USING ("reaction_type"::text::"public"."file_reaction_type");--> statement-breakpoint
DROP TYPE "public"."file_reaction_type_old";
