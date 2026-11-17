CREATE TABLE "api_metrics" (
	"minute" bigint NOT NULL,
	"route" text NOT NULL,
	"count" integer NOT NULL,
	"errors_4xx" integer NOT NULL,
	"errors_5xx" integer NOT NULL,
	"hist" jsonb NOT NULL,
	CONSTRAINT "api_metrics_minute_route_pk" PRIMARY KEY("minute","route"),
	CONSTRAINT "api_metrics_counts" CHECK ("api_metrics"."count" >= 0 and "api_metrics"."errors_4xx" >= 0 and "api_metrics"."errors_5xx" >= 0 and "api_metrics"."errors_4xx" + "api_metrics"."errors_5xx" <= "api_metrics"."count")
);
--> statement-breakpoint
CREATE TABLE "job_ticks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint,
	"status" text NOT NULL,
	"error_kind" text,
	"trigger" text NOT NULL,
	"actor_user_id" text,
	CONSTRAINT "job_ticks_status" CHECK ("job_ticks"."status" in ('running', 'succeeded', 'failed', 'skipped')),
	CONSTRAINT "job_ticks_trigger" CHECK ("job_ticks"."trigger" in ('schedule', 'manual')),
	CONSTRAINT "job_ticks_actor" CHECK (("job_ticks"."trigger" = 'manual') = ("job_ticks"."actor_user_id" is not null)),
	CONSTRAINT "job_ticks_finished" CHECK (("job_ticks"."status" = 'running') = ("job_ticks"."finished_at" is null))
);
--> statement-breakpoint
CREATE INDEX "job_ticks_job_started_idx" ON "job_ticks" USING btree ("job","started_at");--> statement-breakpoint
CREATE INDEX "job_ticks_started_idx" ON "job_ticks" USING btree ("started_at");