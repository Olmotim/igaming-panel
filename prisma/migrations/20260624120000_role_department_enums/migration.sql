-- Migración idempotente: el primer intento de aplicarla en producción falló a mitad de
-- camino (el motor de Prisma no envuelve todo el script en una sola transacción), dejando
-- los tipos ya creados y "User"."role" ya migrado, pero "User"."department" y
-- "Ticket"."department" todavía en texto. Cada bloque comprueba el estado actual antes
-- de actuar, así que es seguro re-ejecutarla desde cualquier punto, y también funciona
-- igual en una base nueva donde nada de esto existe todavía.

-- CreateEnum (idempotente)
DO $outer$
BEGIN
  CREATE TYPE "Role" AS ENUM ('AGENT', 'SUPERVISOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $outer$;

DO $outer$
BEGIN
  CREATE TYPE "Department" AS ENUM ('KYC', 'PAYMENTS', 'RISK', 'SUPPORT', 'OPERATIONS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $outer$;

-- AlterTable "User"."role": map legacy free-text values to the new enum (case-insensitive)
DO $outer$
BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT$sql$;
    EXECUTE $sql$ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (
      CASE
        WHEN UPPER("role") = 'ADMIN' THEN 'ADMIN'
        ELSE 'AGENT'
      END
    )::"Role"$sql$;
    EXECUTE $sql$ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'AGENT'$sql$;
  END IF;
END $outer$;

-- AlterTable "User"."department": map legacy free-text department names to the new enum.
-- Se normaliza a mayúsculas ANTES de comparar/castear, porque hay entornos con datos
-- pre-sesión en mixed-case (ej. el seed antiguo creaba 'Operations', no 'OPERATIONS').
DO $outer$
BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'department') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "User" ALTER COLUMN "department" TYPE "Department" USING (
      CASE UPPER("department")
        WHEN 'CS' THEN 'SUPPORT'
        WHEN 'DOCUMENTS' THEN 'KYC'
        WHEN 'SECOND_LINE' THEN 'RISK'
        ELSE UPPER("department")
      END
    )::"Department"$sql$;
  END IF;
END $outer$;

-- AlterTable "Ticket"."department": mismo tratamiento case-insensitive que arriba.
DO $outer$
BEGIN
  IF (SELECT udt_name FROM information_schema.columns WHERE table_name = 'Ticket' AND column_name = 'department') = 'text' THEN
    EXECUTE $sql$ALTER TABLE "Ticket" ALTER COLUMN "department" TYPE "Department" USING (
      CASE UPPER("department")
        WHEN 'CS' THEN 'SUPPORT'
        WHEN 'DOCUMENTS' THEN 'KYC'
        WHEN 'SECOND_LINE' THEN 'RISK'
        ELSE UPPER("department")
      END
    )::"Department"$sql$;
  END IF;
END $outer$;
