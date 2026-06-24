-- CreateEnum
CREATE TYPE "RGLimitType" AS ENUM ('DEPOSIT_LIMIT', 'SESSION_LIMIT', 'COOL_OFF', 'SELF_EXCLUSION', 'REALITY_CHECK');
CREATE TYPE "RGLimitPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "RGLimitStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- AlterTable: valores existentes ya coinciden 1:1 con el enum (period es nullable, todos NULL hoy)
ALTER TABLE "PlayerRGLimit" ALTER COLUMN "type" TYPE "RGLimitType" USING ("type"::"RGLimitType");
ALTER TABLE "PlayerRGLimit" ALTER COLUMN "period" TYPE "RGLimitPeriod" USING ("period"::"RGLimitPeriod");

ALTER TABLE "PlayerRGLimit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlayerRGLimit" ALTER COLUMN "status" TYPE "RGLimitStatus" USING ("status"::"RGLimitStatus");
ALTER TABLE "PlayerRGLimit" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
