import { PrismaService } from '../prisma.service';
export declare class WorkspacesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(name: string, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    findAllForUser(userId: number): Promise<({
        _count: {
            tasks: number;
        };
        members: ({
            user: {
                id: number;
                email: string;
                role: string;
            };
        } & {
            id: number;
            role: string;
            joinedAt: Date;
            userId: number;
            workspaceId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    })[]>;
    findOne(id: number, userId: number): Promise<{
        tasks: ({
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
        })[];
        members: ({
            user: {
                id: number;
                email: string;
                role: string;
            };
        } & {
            id: number;
            role: string;
            joinedAt: Date;
            userId: number;
            workspaceId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    update(id: number, name: string, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    remove(id: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    addMember(workspaceId: number, memberEmail: string, userId: number): Promise<{
        id: number;
        role: string;
        joinedAt: Date;
        userId: number;
        workspaceId: number;
    }>;
}
