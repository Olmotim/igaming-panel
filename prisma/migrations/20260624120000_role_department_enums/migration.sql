-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('KYC', 'PAYMENTS', 'RISK', 'SUPPORT', 'OPERATIONS');

-- AlterTable "User"."role": map legacy free-text values to the new enum (case-insensitive)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (
  CASE
    WHEN UPPER("role") = 'ADMIN' THEN 'ADMIN'
    ELSE 'AGENT'
  END
)::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'AGENT';

-- AlterTable "User"."department": map legacy free-text department names to the new enum.
-- Se normaliza a mayúsculas ANTES de comparar/castear, porque hay entornos con datos
-- pre-sesión en mixed-case (ej. el seed antiguo creaba 'Operations', no 'OPERATIONS').
ALTER TABLE "User" ALTER COLUMN "department" TYPE "Department" USING (
  CASE UPPER("department")
    WHEN 'CS' THEN 'SUPPORT'
    WHEN 'DOCUMENTS' THEN 'KYC'
    WHEN 'SECOND_LINE' THEN 'RISK'
    ELSE UPPER("department")
  END
)::"Department";

-- AlterTable "Ticket"."department": mismo tratamiento case-insensitive que arriba.
ALTER TABLE "Ticket" ALTER COLUMN "department" TYPE "Department" USING (
  CASE UPPER("department")
    WHEN 'CS' THEN 'SUPPORT'
    WHEN 'DOCUMENTS' THEN 'KYC'
    WHEN 'SECOND_LINE' THEN 'RISK'
    ELSE UPPER("department")
  END
)::"Department";
