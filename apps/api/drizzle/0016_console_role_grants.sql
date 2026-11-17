-- D-160 R2-3b (Connor, Nov 16, 2026, 8:27 AM MST): the Owner's changes to the Roles & Permissions
-- matrix, within the ceiling `CONSOLE_CAPS` keeps in code. Additive: one new table, nothing else.
CREATE TABLE "console_role_grants" (
	"role" text NOT NULL,
	"capability" text NOT NULL,
	"allowed" boolean NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "console_role_grants_role_capability_pk" PRIMARY KEY("role","capability"),
	CONSTRAINT "console_role_grants_role" CHECK ("console_role_grants"."role" in ('Admin', 'Support')),
	CONSTRAINT "console_role_grants_capability" CHECK ("console_role_grants"."capability" in ('build', 'masq', 'account', 'billview', 'refund', 'jobs', 'export', 'ops', 'staff'))
);
