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
exports.WorkspacesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let WorkspacesService = class WorkspacesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(name, userId) {
        const workspace = await this.prisma.workspace.create({
            data: {
                name,
                members: {
                    create: {
                        userId,
                        role: 'owner',
                    },
                },
            },
        });
        return workspace;
    }
    async findAllForUser(userId) {
        return this.prisma.workspace.findMany({
            where: {
                members: {
                    some: { userId },
                },
            },
            include: {
                members: {
                    include: { user: { select: { id: true, email: true, role: true } } },
                },
                _count: { select: { tasks: true } },
            },
        });
    }
    async findOne(id, userId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                members: {
                    include: { user: { select: { id: true, email: true, role: true } } },
                },
                tasks: {
                    include: {
                        assignee: { select: { id: true, email: true } },
                    },
                },
            },
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace no encontrado');
        const isMember = workspace.members.some(m => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('No tienes acceso a este workspace');
        return workspace;
    }
    async update(id, name, userId) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: id } },
        });
        if (!member || member.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el owner puede editar el workspace');
        }
        return this.prisma.workspace.update({
            where: { id },
            data: { name },
        });
    }
    async remove(id, userId) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: id } },
        });
        if (!member || member.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el owner puede eliminar el workspace');
        }
        return this.prisma.workspace.delete({ where: { id } });
    }
    async addMember(workspaceId, memberEmail, userId) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!member || member.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el owner puede añadir miembros');
        }
        const newUser = await this.prisma.user.findUnique({
            where: { email: memberEmail },
        });
        if (!newUser)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.prisma.workspaceMember.create({
            data: { userId: newUser.id, workspaceId, role: 'member' },
        });
    }
};
exports.WorkspacesService = WorkspacesService;
exports.WorkspacesService = WorkspacesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkspacesService);
//# sourceMappingURL=workspaces.service.js.map