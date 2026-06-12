import { TasksService } from './tasks.service';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(workspaceId: number, body: {
        title: string;
        description?: string;
        assignedTo?: number;
    }, req: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    }>;
    findAll(workspaceId: number, req: any): Promise<({
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
    updateStatus(taskId: number, body: {
        status: string;
    }, req: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: number;
        title: string;
        description: string | null;
        status: string;
        assignedTo: number | null;
    }>;
    remove(taskId: number, req: any): Promise<{
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
