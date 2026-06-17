/*
  Warnings:

  - You are about to drop the column `name` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "name",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "bonusBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "canBet" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canDeposit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReceiveBonus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canWithdraw" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isPEP" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT DEFAULT 'es',
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "realBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "registrationChannel" TEXT DEFAULT 'web',
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
ADD COLUMN     "riskNotes" TEXT,
ADD COLUMN     "sofVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayerKYC" (
    "id" SERIAL NOT NULL,
    "kycLevel" TEXT NOT NULL DEFAULT 'NONE',
    "idDocType" TEXT,
    "idDocNumber" TEXT,
    "idDocExpiry" TIMESTAMP(3),
    "idDocIssuingCountry" TEXT,
    "idDocStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "idDocUrl" TEXT,
    "poaDocType" TEXT,
    "poaDocStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "poaDocUrl" TEXT,
    "sofDocStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "sofDocUrl" TEXT,
    "sofDescription" TEXT,
    "pepStatus" TEXT NOT NULL DEFAULT 'NOT_PEP',
    "pepNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "PlayerKYC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPayment" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "accountNumber" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "PlayerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerBonus" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "wagering" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wageringCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxWinAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,
    "grantedById" INTEGER NOT NULL,

    CONSTRAINT "PlayerBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRGLimit" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT,
    "amount" DOUBLE PRECISION,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "requestedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "coolingOffUntil" TIMESTAMP(3),
    "excludedUntil" TIMESTAMP(3),
    "therapyFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "PlayerRGLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerLoginHistory" (
    "id" SERIAL NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "PlayerLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerKYC_playerId_key" ON "PlayerKYC"("playerId");

-- AddForeignKey
ALTER TABLE "PlayerKYC" ADD CONSTRAINT "PlayerKYC_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerKYC" ADD CONSTRAINT "PlayerKYC_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPayment" ADD CONSTRAINT "PlayerPayment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerBonus" ADD CONSTRAINT "PlayerBonus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerBonus" ADD CONSTRAINT "PlayerBonus_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRGLimit" ADD CONSTRAINT "PlayerRGLimit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLoginHistory" ADD CONSTRAINT "PlayerLoginHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
