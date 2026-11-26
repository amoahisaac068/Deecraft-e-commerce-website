CREATE TABLE "orders" (
	"reference" text PRIMARY KEY,
	"email" text NOT NULL,
	"items" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
