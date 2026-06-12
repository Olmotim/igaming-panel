import { PrismaService } from '../prisma.service';
export declare class TasksService {
    private prisma;
    constructor(prisma: PrismaService);
    private verifyMember;
    create(workspaceId: number, title: string, description: string | undefined, assignedTo: number | undefined, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    }>;
    findAll(workspaceId: number, userId: number): Promise<({
        assignee: {
            id: number;
            email: string;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    })[]>;
    updateStatus(taskId: number, status: string, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    }>;
    remove(taskId: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    }>;
}
