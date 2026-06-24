-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('DEPOSIT', 'FREE_SPINS', 'CASHBACK', 'NO_DEPOSIT');
CREATE TYPE "BonusStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'CANCELLED', 'EXPIRED');

-- AlterTable: valores existentes ya coinciden 1:1 con el enum
ALTER TABLE "PlayerBonus" ALTER COLUMN "type" TYPE "BonusType" USING ("type"::"BonusType");

ALTER TABLE "PlayerBonus" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlayerBonus" ALTER COLUMN "status" TYPE "BonusStatus" USING ("status"::"BonusStatus");
ALTER TABLE "PlayerBonus" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
