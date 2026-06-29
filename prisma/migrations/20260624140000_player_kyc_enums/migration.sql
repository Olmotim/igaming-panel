-- Idempotente por el mismo motivo que 20260624120000: un intento previo en producción
-- pudo haber creado los tipos sin llegar a convertir las columnas.

-- CreateEnum (idempotente)
DO $outer$ BEGIN
  CREATE TYPE "KycLevel" AS ENUM ('NONE', 'TIER_1', 'TIER_2', 'TIER_3');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

DO $outer$ BEGIN
  CREATE TYPE "IdDocStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

DO $outer$ BEGIN
  CREATE TYPE "ProofDocStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

DO $outer$ BEGIN
  CREATE TYPE "PepStatus" AS ENUM ('NOT_PEP', 'PEP', 'UNDER_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

-- kycLevel: 'FULL' (valor real visto en producción, fuera del set documentado) se mapea a TIER_3,
-- el nivel más alto, por encima de TIER_2 que ya estaba en uso.
DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerKYC' AND column_name = 'kycLevel') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" TYPE "KycLevel" USING (
      CASE "kycLevel"
        WHEN 'FULL' THEN 'TIER_3'
        ELSE "kycLevel"
      END
    )::"KycLevel"$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "kycLevel" SET DEFAULT 'NONE'$sql$;
  END IF;
END $outer$;

DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerKYC' AND column_name = 'idDocStatus') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" TYPE "IdDocStatus" USING ("idDocStatus"::"IdDocStatus")$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "idDocStatus" SET DEFAULT 'NOT_REQUESTED'$sql$;
  END IF;
END $outer$;

-- poaDocStatus/sofDocStatus: en producción "poaDocStatus" usa 'APPROVED' (en vez de 'VERIFIED')
-- para el mismo estado — se normaliza a 'VERIFIED', el valor canónico elegido para este enum.
DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerKYC' AND column_name = 'poaDocStatus') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" TYPE "ProofDocStatus" USING (
      CASE "poaDocStatus"
        WHEN 'APPROVED' THEN 'VERIFIED'
        ELSE "poaDocStatus"
      END
    )::"ProofDocStatus"$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "poaDocStatus" SET DEFAULT 'NOT_REQUESTED'$sql$;
  END IF;
END $outer$;

DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerKYC' AND column_name = 'sofDocStatus') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" TYPE "ProofDocStatus" USING (
      CASE "sofDocStatus"
        WHEN 'APPROVED' THEN 'VERIFIED'
        ELSE "sofDocStatus"
      END
    )::"ProofDocStatus"$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "sofDocStatus" SET DEFAULT 'NOT_REQUESTED'$sql$;
  END IF;
END $outer$;

DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerKYC' AND column_name = 'pepStatus') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" TYPE "PepStatus" USING ("pepStatus"::"PepStatus")$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerKYC" ALTER COLUMN "pepStatus" SET DEFAULT 'NOT_PEP'$sql$;
  END IF;
END $outer$;
