-- Remember who released a held username so they can reclaim it during the hold.
ALTER TABLE "username_holds" ADD COLUMN "releasedByUserId" TEXT;
