-- Política: los datos propios de un Player (KYC, pagos, bonos, límites RG, login history, notas)
-- nunca deben perderse por accidente -> RESTRICT. Las relaciones opcionales que solo "etiquetan"
-- un Ticket (assignedTo, player) se liberan con SET NULL si el referenciado se borra. Los comentarios
-- de un ticket no tienen sentido sin su ticket -> CASCADE si el ticket se borra.

-- PlayerNote
ALTER TABLE "PlayerNote" DROP CONSTRAINT "PlayerNote_playerId_fkey";
ALTER TABLE "PlayerNote" ADD CONSTRAINT "PlayerNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerNote" DROP CONSTRAINT "PlayerNote_authorId_fkey";
ALTER TABLE "PlayerNote" ADD CONSTRAINT "PlayerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlayerKYC
ALTER TABLE "PlayerKYC" DROP CONSTRAINT "PlayerKYC_playerId_fkey";
ALTER TABLE "PlayerKYC" ADD CONSTRAINT "PlayerKYC_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerKYC" DROP CONSTRAINT "PlayerKYC_reviewedById_fkey";
ALTER TABLE "PlayerKYC" ADD CONSTRAINT "PlayerKYC_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PlayerPayment
ALTER TABLE "PlayerPayment" DROP CONSTRAINT "PlayerPayment_playerId_fkey";
ALTER TABLE "PlayerPayment" ADD CONSTRAINT "PlayerPayment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlayerBonus
ALTER TABLE "PlayerBonus" DROP CONSTRAINT "PlayerBonus_playerId_fkey";
ALTER TABLE "PlayerBonus" ADD CONSTRAINT "PlayerBonus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerBonus" DROP CONSTRAINT "PlayerBonus_grantedById_fkey";
ALTER TABLE "PlayerBonus" ADD CONSTRAINT "PlayerBonus_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlayerRGLimit
ALTER TABLE "PlayerRGLimit" DROP CONSTRAINT "PlayerRGLimit_playerId_fkey";
ALTER TABLE "PlayerRGLimit" ADD CONSTRAINT "PlayerRGLimit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlayerLoginHistory
ALTER TABLE "PlayerLoginHistory" DROP CONSTRAINT "PlayerLoginHistory_playerId_fkey";
ALTER TABLE "PlayerLoginHistory" ADD CONSTRAINT "PlayerLoginHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ticket
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_createdById_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_assignedToId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_playerId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TicketComment
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_ticketId_fkey";
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_authorId_fkey";
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
