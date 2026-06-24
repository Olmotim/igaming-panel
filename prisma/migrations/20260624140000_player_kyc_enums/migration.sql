-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('NONE', 'TIER_1', 'TIER_2', 'TIER_3');
CREATE TYPE "IdDocStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ProofDocStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "PepStatus" AS ENUM ('NOT_PEP', 'PEP', 'UNDER_REVIEW');

-- AlterTable: todos los valores existentes ya están en mayúsculas y coinciden 1:1 con el enum
ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" DROP DEFAULT;
ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" TYPE "KycLevel" USING ("kycLevel"::"KycLevel");
ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" SET DEFAULT 'NONE';

ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" DROP DEFAULT;
ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" TYPE "IdDocStatus" USING ("idDocStatus"::"IdDocStatus");
ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" SET DEFAULT 'NOT_REQUESTED';

ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" DROP DEFAULT;
ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" TYPE "ProofDocStatus" USING ("poaDocStatus"::"ProofDocStatus");
ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" SET DEFAULT 'NOT_REQUESTED';

ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" DROP DEFAULT;
ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" TYPE "ProofDocStatus" USING ("sofDocStatus"::"ProofDocStatus");
ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" SET DEFAULT 'NOT_REQUESTED';

ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" DROP DEFAULT;
ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" TYPE "PepStatus" USING ("pepStatus"::"PepStatus");
ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" SET DEFAULT 'NOT_PEP';
