import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// El rol pasado es el MÍNIMO requerido (jerarquía: AGENT < SUPERVISOR < ADMIN).
export const Roles = (minRole: Role) => SetMetadata(ROLES_KEY, minRole);
