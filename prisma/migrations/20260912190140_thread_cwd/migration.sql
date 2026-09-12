/*
  Warnings:

  - Added the required column `cwd` to the `threads` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_threads" (
    "thread_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cwd" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);
INSERT INTO "new_threads" ("created_at", "deleted_at", "model", "thread_id", "title", "updated_at") SELECT "created_at", "deleted_at", "model", "thread_id", "title", "updated_at" FROM "threads";
DROP TABLE "threads";
ALTER TABLE "new_threads" RENAME TO "threads";
CREATE INDEX "threads_updated_at_idx" ON "threads"("updated_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
