CREATE TABLE "video_progress" (
	"user_id" text NOT NULL,
	"module_id" text NOT NULL,
	"video_id" text NOT NULL,
	"max_pct" double precision NOT NULL,
	"last_position_s" double precision NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "video_progress_user_id_module_id_video_id_pk" PRIMARY KEY("user_id","module_id","video_id")
);
