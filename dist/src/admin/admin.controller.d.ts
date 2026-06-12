import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getUsers(): Promise<{
        id: number;
        email: string;
        role: string;
        createdAt: Date;
    }[]>;
}
