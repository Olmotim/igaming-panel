-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: valores existentes ya coinciden 1:1 con el enum
ALTER TABLE "PlayerPayment" ALTER COLUMN "type" TYPE "PaymentType" USING ("type"::"PaymentType");

ALTER TABLE "PlayerPayment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" TYPE "PaymentStatus" USING ("status"::"PaymentStatus");
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
