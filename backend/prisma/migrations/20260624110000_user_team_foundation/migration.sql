-- Sprint 3 Stage 0
ALTER TABLE "organizations" ADD COLUMN "segment" VARCHAR(80);
ALTER TABLE "document_templates" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- Expand users
ALTER TABLE "users"
ADD COLUMN "avatar_asset_id" UUID,
ADD COLUMN "phone" VARCHAR(30),
ADD COLUMN "job_title" VARCHAR(100),
ADD COLUMN "notes" TEXT,
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disabled_at" TIMESTAMPTZ(3);

-- Team preferences
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- Granular permissions complement RBAC
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "can_financial" BOOLEAN NOT NULL DEFAULT false,
    "can_users" BOOLEAN NOT NULL DEFAULT false,
    "can_reports" BOOLEAN NOT NULL DEFAULT false,
    "can_schedules" BOOLEAN NOT NULL DEFAULT false,
    "can_templates" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- Avatar metadata is separate from organization branding assets
CREATE TABLE "user_avatar_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_key" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_avatar_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_avatar_asset_id_key" ON "users"("avatar_asset_id");
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
CREATE UNIQUE INDEX "user_permissions_user_id_key" ON "user_permissions"("user_id");
CREATE UNIQUE INDEX "user_avatar_assets_storage_key_key" ON "user_avatar_assets"("storage_key");

ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
ADD CONSTRAINT "user_permissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users"
ADD CONSTRAINT "users_avatar_asset_id_fkey"
FOREIGN KEY ("avatar_asset_id") REFERENCES "user_avatar_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "user_preferences" ("user_id", "updated_at")
SELECT "id", CURRENT_TIMESTAMP FROM "users";

INSERT INTO "user_permissions" (
    "user_id",
    "can_financial",
    "can_users",
    "can_reports",
    "can_schedules",
    "can_templates",
    "updated_at"
)
SELECT
    "id",
    CASE WHEN "role" = 'OWNER' THEN true ELSE false END,
    CASE WHEN "role" = 'OWNER' THEN true ELSE false END,
    CASE WHEN "role" = 'OWNER' THEN true ELSE false END,
    CASE WHEN "role" = 'OWNER' THEN true ELSE false END,
    CASE WHEN "role" = 'OWNER' THEN true ELSE false END,
    CURRENT_TIMESTAMP
FROM "users";

-- Existing seeded templates become protected system templates.
UPDATE "document_templates" SET "is_system" = true WHERE "is_default" = true;
