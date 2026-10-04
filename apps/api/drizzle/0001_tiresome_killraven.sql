CREATE TABLE "job_runs" (
	"job" text NOT NULL,
	"key" text NOT NULL,
	"sent_at" bigint NOT NULL,
	CONSTRAINT "job_runs_job_key_pk" PRIMARY KEY("job","key")
);
