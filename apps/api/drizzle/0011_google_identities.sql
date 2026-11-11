CREATE TABLE "google_identities" (
	"sub" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"linked_at" timestamp NOT NULL,
	CONSTRAINT "google_identities_user_id_unique" UNIQUE("user_id")
);
