CREATE TABLE "access_group_members" (
	"group_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"added_at" bigint NOT NULL,
	CONSTRAINT "access_group_members_group_id_email_pk" PRIMARY KEY("group_id","email"),
	CONSTRAINT "access_group_members_email" CHECK ("access_group_members"."email" = lower(trim("access_group_members"."email")))
);
--> statement-breakpoint
CREATE TABLE "access_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" text NOT NULL,
	"email_domain" text,
	"expires_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "access_groups_plan" CHECK ("access_groups"."plan" in ('library', 'cohort', 'agents', 'membership', 'agent_plan')),
	CONSTRAINT "access_groups_domain" CHECK ("access_groups"."email_domain" is null or "access_groups"."email_domain" = lower(trim("access_groups"."email_domain")))
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"email" text PRIMARY KEY NOT NULL,
	"verified_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_group_members" ADD CONSTRAINT "access_group_members_group_id_access_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."access_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- D-148: the Utah Life team (Connor, 2026-11-12): every verified @liveutah.com address holds the
-- Amplified Agent Plan's entitlement at no charge, with no end. No roster: the list stays empty.
INSERT INTO "access_groups" ("id", "name", "plan", "email_domain", "expires_at", "created_at")
VALUES ('utah-life', 'Utah Life', 'agent_plan', 'liveutah.com', NULL, (extract(epoch from now()) * 1000)::bigint)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- D-148: addresses already proven before this table existed. Only `claimToken` spends a sign-in link
-- or an invite, and only when the emailed link is followed, so a spent one is proof. Set and reset
-- password links are left out: finishing a password spends every outstanding one, followed or not.
INSERT INTO "email_verifications" ("email", "verified_at")
SELECT lower(trim("email")), (extract(epoch from min("used_at")) * 1000)::bigint
FROM "auth_tokens"
WHERE "purpose" IN ('sign_in', 'invite') AND "used_at" IS NOT NULL
GROUP BY lower(trim("email"))
ON CONFLICT ("email") DO NOTHING;
