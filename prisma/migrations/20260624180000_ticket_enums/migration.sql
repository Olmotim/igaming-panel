-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_INFO', 'RESOLVED', 'CLOSED');

-- AlterTable: valores existentes ya coinciden 1:1 con el enum (incluye PENDING_INFO, en uso real)
ALTER TABLE "Ticket" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "priority" TYPE "TicketPriority" USING ("priority"::"TicketPriority");
ALTER TABLE "Ticket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus" USING ("status"::"TicketStatus");
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'OPEN';
