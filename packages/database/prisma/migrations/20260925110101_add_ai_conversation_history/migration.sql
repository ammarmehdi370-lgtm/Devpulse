-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "AIMessage"
  ALTER COLUMN "role" TYPE "AIMessageRole"
  USING ("role"::text::"AIMessageRole");
