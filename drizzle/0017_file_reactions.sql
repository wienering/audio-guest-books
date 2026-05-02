CREATE TYPE "public"."file_reaction_type" AS ENUM('heart', 'laugh', 'cry', 'smile', 'fire', 'clap');--> statement-breakpoint
CREATE TABLE "file_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"reaction_type" "file_reaction_type" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
ALTER TABLE "file_reactions" ADD CONSTRAINT "file_reactions_file_id_audio_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."audio_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_reactions_file_id_reaction_type_uidx" ON "file_reactions" USING btree ("file_id","reaction_type");--> statement-breakpoint
CREATE INDEX "file_reactions_file_id_idx" ON "file_reactions" USING btree ("file_id");
