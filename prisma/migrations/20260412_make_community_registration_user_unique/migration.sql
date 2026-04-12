TRUNCATE TABLE
  "CommunityRegistrationEntry",
  "CommunityRegistrationBatch",
  "CommunityRegistrationBoard"
RESTART IDENTITY CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommunityRegistrationEntry_userId_key'
  ) THEN
    ALTER TABLE "CommunityRegistrationEntry"
    ADD CONSTRAINT "CommunityRegistrationEntry_userId_key" UNIQUE ("userId");
  END IF;
END $$;
