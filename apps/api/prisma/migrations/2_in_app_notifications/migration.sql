-- Migration 2: Centralized Persistent In-App Notification Center

CREATE TABLE IF NOT EXISTS "in_app_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "actionUrl" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "in_app_notifications_userId_createdAt_idx" ON "in_app_notifications"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "in_app_notifications_userId_readAt_idx" ON "in_app_notifications"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "in_app_notifications_userId_category_idx" ON "in_app_notifications"("userId", "category");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'in_app_notifications_userId_fkey'
    ) THEN
        ALTER TABLE "in_app_notifications" 
        ADD CONSTRAINT "in_app_notifications_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

