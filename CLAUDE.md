# iGaming Panel — Backend (CLAUDE.md)

Este archivo es contexto persistente para Claude Code. Léelo al empezar cualquier sesión en este repo.

## Qué es este proyecto

Backoffice de gestión para operadores de iGaming (casino online), construido como proyecto de portfolio. El diseño está basado en experiencia profesional real del autor trabajando en customer service de iGaming, así que la lógica de negocio (KYC, juego responsable, departamentos de soporte, AML/riesgo) intenta reflejar cómo funcionan estos sistemas en la realidad, no es un CRUD genérico.

Decisión de diseño intencional: el proyecto NO llama a APIs externas de verdad (proveedores de pago, KYC, etc.) — todo vive en la propia base de datos. Esto es a propósito para mantener el scope manejable como portfolio; el README ya aclara que un sistema en producción usaría proveedores externos. No propongas integrar servicios externos reales salvo que se pida explícitamente.

Repo hermano (frontend): `igaming-panel-front`, Next.js + TypeScript + Tailwind + shadcn/ui, consume esta API.

## Stack

- NestJS (TypeScript)
- Prisma 7 + PostgreSQL 16 (vía `@prisma/adapter-pg`)
- Auth: JWT (access + refresh) con Passport, bcrypt para hashing
- `@nestjs/schedule` para cron jobs
- Jest para tests unitarios

## Comandos

```bash
npm run start:dev       # desarrollo, watch mode, puerto 3000
npm run test             # tests unitarios
npm run test:e2e         # tests end-to-end
npm run test:cov         # cobertura
npm run seed              # poblar BD con datos demo ficticios
npx prisma migrate dev --name <nombre>   # nueva migración tras cambiar schema.prisma
npx prisma generate                       # regenerar cliente tras migrar
```

Entorno local: Windows 11, PowerShell (no WSL), Docker Desktop para Postgres (`docker start igaming-postgres`, puerto 5432). El `.env.local` y similares se crean directamente en VS Code, no por terminal, para evitar problemas de encoding en PowerShell.

## Despliegue

Railway (Nixpacks — **nunca añadir un Dockerfile**, rompe el build). Start command: `npm run build && npm run start:migrate`. El compilado queda en `dist/src/main`, por eso `start:prod` es `node dist/src/main` (no `dist/main`). **Nunca modificar `tsconfig.json`** — rompe `nest build` en silencio. Las migraciones se aplican automáticamente en el deploy vía `prisma migrate deploy` dentro de `start:migrate`.

## Estructura de módulos

- `auth/` — registro, login, refresh, logout, guards (`JwtAuthGuard`, `RolesGuard`), estrategia JWT
- `players/` — el módulo central: perfil de jugador, KYC, pagos, bonos, juego responsable (RG), historial de login, notas internas
- `tickets/` — sistema de tickets de soporte con filtrado por departamento
- `admin/` — gestión de usuarios internos y sus departamentos
- `workspaces/` y `tasks/` — **módulo NO activo**. Es scaffolding inicial (Kanban genérico) que se decidió conservar pero que no está integrado con la lógica de negocio de iGaming ni enlazado desde el frontend. No lo elimines ni lo "completes" asumiendo que hay que terminarlo — solo tócalo si se te pide explícitamente.

## Estado conocido tras auditoría (mantener actualizado)

Este proyecto se ha construido en sesiones de chat separadas con distintas herramientas de IA, lo que generó inconsistencias reales. Lista de problemas conocidos — antes de "arreglar" algo no listado en un prompt activo, asume que puede ser intencional y pregunta:

- Falta validación de inputs (DTOs/class-validator) — en proceso de arreglo.
- El refresh token no usa cookies HttpOnly todavía (se está migrando) — si ves código de cookies en `document.cookie` del lado frontend, es el problema conocido, no lo "arregles" sin coordinarlo con el repo frontend.
- Roles: hoy solo existen `user`/`admin` como string libre en `User.role`. Puede estar evolucionando a un modelo más granular (agent/supervisor/admin + departamento) — confirma el estado actual del schema antes de asumir cuál es el modelo de permisos vigente.
- Los campos de estado (`status`, `priority`, `riskLevel`, etc.) son `String` libre en el schema, no enums — si trabajas en un módulo y ves esto, no lo "corrijas" de pasada salvo que sea el objetivo explícito de la tarea, para no mezclar migraciones de scope distinto.

## Convenciones de código

- Sigue el patrón ya usado en `WorkspacesService` para autorización (comprobar pertenencia/rol antes de actuar) como referencia de lo que SÍ está bien hecho, incluso si ese módulo está inactivo.
- Mantén las migraciones de Prisma pequeñas y con nombre descriptivo; no acumules varios cambios de schema no relacionados en una sola migración.
- No comitees archivos generados (`tsconfig.build.tsbuildinfo`, `dist/`, `coverage/`).
- Las credenciales de la demo pública (`demo@igamingpanel.com`) son intencionalmente públicas y usan solo datos ficticios — no es un descuido, está documentado en el README.
