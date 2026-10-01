DO $$
BEGIN
  IF to_regclass('public.oauth_accounts') IS NULL THEN
    IF to_regclass('public."OAuthAccount"') IS NOT NULL THEN
      ALTER TABLE "OAuthAccount" RENAME TO oauth_accounts;
    ELSE
      CREATE TABLE oauth_accounts (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "tokenType" TEXT,
        "scope" TEXT,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
      );
    END IF;
  END IF;
END $$;

ALTER TABLE oauth_accounts ADD COLUMN IF NOT EXISTS "tokenType" TEXT;
ALTER TABLE oauth_accounts ADD COLUMN IF NOT EXISTS "scope" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'OAuthAccount_provider_providerAccountId_key'
      AND relkind = 'i'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'oauth_accounts_provider_providerAccountId_key'
      AND relkind = 'i'
  ) THEN
    ALTER INDEX "OAuthAccount_provider_providerAccountId_key"
      RENAME TO "oauth_accounts_provider_providerAccountId_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'OAuthAccount_userId_idx'
      AND relkind = 'i'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'oauth_accounts_userId_idx'
      AND relkind = 'i'
  ) THEN
    ALTER INDEX "OAuthAccount_userId_idx" RENAME TO "oauth_accounts_userId_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.oauth_accounts'::regclass
      AND conname = 'OAuthAccount_userId_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.oauth_accounts'::regclass
      AND conname = 'oauth_accounts_userId_fkey'
  ) THEN
    ALTER TABLE oauth_accounts
      RENAME CONSTRAINT "OAuthAccount_userId_fkey" TO "oauth_accounts_userId_fkey";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_providerAccountId_key"
  ON oauth_accounts("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "oauth_accounts_userId_idx"
  ON oauth_accounts("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.oauth_accounts'::regclass
      AND conname = 'oauth_accounts_userId_fkey'
  ) THEN
    ALTER TABLE oauth_accounts
      ADD CONSTRAINT "oauth_accounts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;