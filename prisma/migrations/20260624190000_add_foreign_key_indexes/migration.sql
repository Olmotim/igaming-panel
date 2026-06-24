-- CreateIndex
CREATE INDEX "PlayerNote_playerId_idx" ON "PlayerNote"("playerId");
CREATE INDEX "PlayerNote_authorId_idx" ON "PlayerNote"("authorId");

CREATE INDEX "PlayerKYC_reviewedById_idx" ON "PlayerKYC"("reviewedById");

CREATE INDEX "PlayerPayment_playerId_idx" ON "PlayerPayment"("playerId");

CREATE INDEX "PlayerBonus_playerId_idx" ON "PlayerBonus"("playerId");
CREATE INDEX "PlayerBonus_grantedById_idx" ON "PlayerBonus"("grantedById");

CREATE INDEX "PlayerRGLimit_playerId_idx" ON "PlayerRGLimit"("playerId");

CREATE INDEX "PlayerLoginHistory_playerId_idx" ON "PlayerLoginHistory"("playerId");

CREATE INDEX "Ticket_playerId_idx" ON "Ticket"("playerId");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "Ticket_createdById_idx" ON "Ticket"("createdById");

CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");
CREATE INDEX "TicketComment_authorId_idx" ON "TicketComment"("authorId");
