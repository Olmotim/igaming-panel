-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'SELF_EXCLUDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable "Player"."status": normaliza los valores legacy en minúscula a mayúscula y migra al enum
ALTER TABLE "Player" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Player" ALTER COLUMN "status" TYPE "PlayerStatus" USING (
  CASE "status"
    WHEN 'active' THEN 'ACTIVE'
    WHEN 'pending_verification' THEN 'PENDING_VERIFICATION'
    WHEN 'suspended' THEN 'SUSPENDED'
    WHEN 'self_excluded' THEN 'SELF_EXCLUDED'
    ELSE 'PENDING_VERIFICATION'
  END
)::"PlayerStatus";
ALTER TABLE "Player" ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

-- AlterTable "Player"."riskLevel": ya está en mayúsculas, solo cambia el tipo de columna
ALTER TABLE "Player" ALTER COLUMN "riskLevel" DROP DEFAULT;
ALTER TABLE "Player" ALTER COLUMN "riskLevel" TYPE "RiskLevel" USING ("riskLevel"::"RiskLevel");
ALTER TABLE "Player" ALTER COLUMN "riskLevel" SET DEFAULT 'LOW';
