-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "defaultChargeAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_defaultChargeAccountId_fkey" FOREIGN KEY ("defaultChargeAccountId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
