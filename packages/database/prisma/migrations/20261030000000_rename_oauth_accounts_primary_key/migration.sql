DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.oauth_accounts'::regclass
      AND conname = 'OAuthAccount_pkey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.oauth_accounts'::regclass
      AND conname = 'oauth_accounts_pkey'
  ) THEN
    ALTER TABLE "oauth_accounts"
      RENAME CONSTRAINT "OAuthAccount_pkey" TO "oauth_accounts_pkey";
  END IF;
END $$;
