CREATE TABLE "training_session" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"host_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "training_session_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_session_id_training_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_session_idx" ON "workout" USING btree ("session_id");