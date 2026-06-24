import { ForbiddenException } from '@nestjs/common';
import { Department, Role } from '@prisma/client';

export interface ActingUser {
  id: number;
  role: Role;
  department: Department | null;
}

const ROLE_RANK: Record<Role, number> = {
  [Role.AGENT]: 0,
  [Role.SUPERVISOR]: 1,
  [Role.ADMIN]: 2,
};

export function hasMinRole(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function assertMinRole(role: Role, min: Role) {
  if (!hasMinRole(role, min)) {
    throw new ForbiddenException('No tienes el rol necesario para realizar esta acción');
  }
}

// ADMIN siempre pasa, sin importar su departamento (acceso cross-departamento).
export function assertDepartment(
  userRole: Role,
  userDepartment: Department | null,
  allowed: Department | Department[],
) {
  if (userRole === Role.ADMIN) return;

  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  if (!userDepartment || !allowedList.includes(userDepartment)) {
    throw new ForbiddenException('No tienes acceso a este departamento');
  }
}
