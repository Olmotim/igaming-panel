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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let TasksService = class TasksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verifyMember(workspaceId, userId) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!member)
            throw new common_1.ForbiddenException('No tienes acceso a este workspace');
        return member;
    }
    async create(workspaceId, title, description, assignedTo, userId) {
        await this.verifyMember(workspaceId, userId);
        return this.prisma.task.create({
            data: {
                title,
                description,
                assignedTo,
                workspaceId,
            },
        });
    }
    async findAll(workspaceId, userId) {
        await this.verifyMember(workspaceId, userId);
        return this.prisma.task.findMany({
            where: { workspaceId },
            include: {
                assignee: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateStatus(taskId, status, userId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task)
            throw new common_1.NotFoundException('Tarea no encontrada');
        await this.verifyMember(task.workspaceId, userId);
        return this.prisma.task.update({
            where: { id: taskId },
            data: { status },
        });
    }
    async remove(taskId, userId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task)
            throw new common_1.NotFoundException('Tarea no encontrada');
        const member = await this.prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: task.workspaceId } },
        });
        if (!member || member.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el owner puede eliminar tareas');
        }
        return this.prisma.task.delete({ where: { id: taskId } });
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map