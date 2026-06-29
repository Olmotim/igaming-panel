-- Idempotente por el mismo motivo que las migraciones anteriores de esta tanda.

-- CreateEnum (idempotente)
DO $outer$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

DO $outer$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $outer$;

DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerPayment' AND column_name = 'type') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerPayment" ALTER COLUMN "type" TYPE "PaymentType" USING ("type"::"PaymentType")$sql$;
  END IF;
END $outer$;

-- status: en producción hay filas con 'COMPLETED' (inconsistencia del seed original, detectada
-- en la Fase 1 de la auditoría) — se normaliza a 'APPROVED', el valor que la lógica de negocio
-- real usa para disparar el ajuste de balance.
DO $outer$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'PlayerPayment' AND column_name = 'status') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "PlayerPayment" ALTER COLUMN "status" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerPayment" ALTER COLUMN "status" TYPE "PaymentStatus" USING (
      CASE "status"
        WHEN 'COMPLETED' THEN 'APPROVED'
        ELSE "status"
      END
    )::"PaymentStatus"$sql$;
    EXECUTE $sql$ALTER TABLE "PlayerPayment" ALTER COLUMN "status" SET DEFAULT 'PENDING'$sql$;
  END IF;
END $outer$;
