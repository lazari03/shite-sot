-- CreateTable
CREATE TABLE "Heartbeat" (
    "name" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "detail" JSONB,

    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("name")
);
