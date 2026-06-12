import { WorkspacesService } from './workspaces.service';
export declare class WorkspacesController {
    private readonly workspacesService;
    constructor(workspacesService: WorkspacesService);
    create(body: {
        name: string;
    }, req: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    findAll(req: any): Promise<({
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
    findOne(id: number, req: any): Promise<{
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
    update(id: number, body: {
        name: string;
    }, req: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    remove(id: number, req: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    addMember(id: number, body: {
        email: string;
    }, req: any): Promise<{
        id: number;
        role: string;
        joinedAt: Date;
        userId: number;
        workspaceId: number;
    }>;
}
