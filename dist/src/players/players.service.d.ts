import { PrismaService } from '../prisma.service';
export declare class PlayersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(email: string, name: string): Promise<{
        id: number;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
    }>;
    findAll(search?: string): Promise<{
        id: number;
        email: string;
        createdAt: Date;
        name: string;
        _count: {
            notes: number;
        };
        status: string;
    }[]>;
    findOne(id: number): Promise<{
        notes: ({
            author: {
                id: number;
                email: string;
            };
        } & {
            id: number;
            createdAt: Date;
            content: string;
            playerId: number;
            authorId: number;
        })[];
    } & {
        id: number;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
    }>;
    updateStatus(id: number, status: string): Promise<{
        id: number;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
    }>;
    addNote(playerId: number, content: string, authorId: number): Promise<{
        author: {
            id: number;
            email: string;
        };
    } & {
        id: number;
        createdAt: Date;
        content: string;
        playerId: number;
        authorId: number;
    }>;
}
