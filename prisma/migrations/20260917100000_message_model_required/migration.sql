-- Backfill from the owning thread, then make the column required (SQLite table rebuild).
UPDATE "messages" SET "model" = (SELECT "model" FROM "threads" WHERE "threads"."thread_id" = "messages"."thread_id") WHERE "model" IS NULL;

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_messages" (
    "message_id" TEXT NOT NULL PRIMARY KEY,
    "thread_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "is_streaming" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads" ("thread_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("message_id", "thread_id", "role", "text", "model", "is_streaming", "created_at", "updated_at")
SELECT "message_id", "thread_id", "role", "text", "model", "is_streaming", "created_at", "updated_at" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");
PRAGMA foreign_keys=ON;
