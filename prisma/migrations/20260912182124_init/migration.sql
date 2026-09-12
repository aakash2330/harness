-- CreateTable
CREATE TABLE "threads" (
    "thread_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" TEXT NOT NULL PRIMARY KEY,
    "thread_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_streaming" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads" ("thread_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "threads_updated_at_idx" ON "threads"("updated_at");

-- CreateIndex
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");
