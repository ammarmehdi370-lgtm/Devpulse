ALTER TABLE "CodeExecution" RENAME COLUMN "code" TO "codeSnapshot";
ALTER TABLE "CodeExecution" ADD COLUMN "error" TEXT;
