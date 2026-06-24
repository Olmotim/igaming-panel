-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('KYC', 'PAYMENTS', 'RISK', 'SUPPORT', 'OPERATIONS');

-- AlterTable "User"."role": map legacy free-text values to the new enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (
  CASE
    WHEN "role" = 'admin' THEN 'ADMIN'
    ELSE 'AGENT'
  END
)::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'AGENT';

-- AlterTable "User"."department": map legacy free-text department names to the new enum
ALTER TABLE "User" ALTER COLUMN "department" TYPE "Department" USING (
  CASE "department"
    WHEN 'CS' THEN 'SUPPORT'
    WHEN 'DOCUMENTS' THEN 'KYC'
    WHEN 'SECOND_LINE' THEN 'RISK'
    ELSE "department"
  END
)::"Department";

-- AlterTable "Ticket"."department": map legacy free-text department names to the new enum
ALTER TABLE "Ticket" ALTER COLUMN "department" TYPE "Department" USING (
  CASE "department"
    WHEN 'CS' THEN 'SUPPORT'
    WHEN 'DOCUMENTS' THEN 'KYC'
    WHEN 'SECOND_LINE' THEN 'RISK'
    ELSE "department"
  END
)::"Department";
