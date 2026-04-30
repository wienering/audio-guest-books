CREATE INDEX IF NOT EXISTS "idx_event_analytics_events_event_id_created_at" ON "event_analytics_events" ("event_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_analytics_events_event_type" ON "event_analytics_events" ("event_type");
