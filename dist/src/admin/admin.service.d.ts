import { PrismaService } from '../prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getUsers(): Promise<{
        id: number;
        email: string;
        role: string;
        createdAt: Date;
    }[]>;
}
