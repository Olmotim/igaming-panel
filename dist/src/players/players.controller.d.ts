import { PlayersService } from './players.service';
export declare class PlayersController {
    private readonly playersService;
    constructor(playersService: PlayersService);
    create(body: {
        email: string;
        name: string;
    }): Promise<{
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
    updateStatus(id: number, body: {
        status: string;
    }): Promise<{
        id: number;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
    }>;
    addNote(id: number, body: {
        content: string;
    }, req: any): Promise<{
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
