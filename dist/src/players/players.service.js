"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let PlayersService = class PlayersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(email, name) {
        const existing = await this.prisma.player.findUnique({ where: { email } });
        if (existing)
            throw new common_1.ConflictException('Ya existe un jugador con ese email');
        return this.prisma.player.create({
            data: { email, name },
        });
    }
    async findAll(search) {
        return this.prisma.player.findMany({
            where: search
                ? {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { name: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                createdAt: true,
                _count: { select: { notes: true } },
            },
        });
    }
    async findOne(id) {
        const player = await this.prisma.player.findUnique({
            where: { id },
            include: {
                notes: {
                    include: {
                        author: { select: { id: true, email: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!player)
            throw new common_1.NotFoundException('Jugador no encontrado');
        return player;
    }
    async updateStatus(id, status) {
        const player = await this.prisma.player.findUnique({ where: { id } });
        if (!player)
            throw new common_1.NotFoundException('Jugador no encontrado');
        return this.prisma.player.update({
            where: { id },
            data: { status },
        });
    }
    async addNote(playerId, content, authorId) {
        const player = await this.prisma.player.findUnique({ where: { id: playerId } });
        if (!player)
            throw new common_1.NotFoundException('Jugador no encontrado');
        return this.prisma.playerNote.create({
            data: { content, playerId, authorId },
            include: {
                author: { select: { id: true, email: true } },
            },
        });
    }
};
exports.PlayersService = PlayersService;
exports.PlayersService = PlayersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlayersService);
//# sourceMappingURL=players.service.js.map