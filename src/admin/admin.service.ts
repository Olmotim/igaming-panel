import { Injectable } from '@nestjs/common';
import { Department } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

async getUsers() {
  return this.prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });
}

async updateUserDepartment(id: number, department: Department) {
  return this.prisma.user.update({
    where: { id },
    data: { department },
    select: { id: true, email: true, role: true, department: true },
  });
}
}