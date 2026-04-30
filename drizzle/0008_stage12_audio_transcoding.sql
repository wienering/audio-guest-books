CREATE TYPE "public"."audio_transcoding_status" AS ENUM('not_needed', 'pending', 'processing', 'succeeded', 'failed');--> statement-breakpoint
ALTER TABLE "audio_files" ADD COLUMN "is_original" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_files" ADD COLUMN "derived_from_id" uuid;--> statement-breakpoint
ALTER TABLE "audio_files" ADD COLUMN "transcoding_error" text;--> statement-breakpoint
ALTER TABLE "audio_files" ADD COLUMN "transcoding_status" audio_transcoding_status;--> statement-breakpoint
UPDATE "audio_files" SET "transcoding_status" = 'not_needed' WHERE "transcoding_status" IS NULL;--> statement-breakpoint
ALTER TABLE "audio_files" ALTER COLUMN "transcoding_status" SET DEFAULT 'not_needed';--> statement-breakpoint
ALTER TABLE "audio_files" ALTER COLUMN "transcoding_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_derived_from_id_audio_files_id_fk" FOREIGN KEY ("derived_from_id") REFERENCES "public"."audio_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
