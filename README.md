# iGaming Panel — Backend

REST API for an iGaming backoffice panel, built so support, KYC, and admin teams can manage players, support tickets, and internal workspaces. Built with NestJS, Prisma, and PostgreSQL.

Frontend repository: [igaming-panel-front](https://github.com/Olmotim/igaming-panel-front)

## Stack

- **NestJS** + TypeScript
- **PostgreSQL** via **Prisma ORM** (using the `@prisma/adapter-pg` adapter)
- **Authentication**: JWT with access + refresh tokens, Passport, roles and guards
- **bcrypt** for password hashing
- **@nestjs/schedule** for scheduled tasks
- **Jest** for unit and e2e tests

## Key features

- **Auth**: registration, login, token refresh, logout, profile, and role-protected routes
- **Player management**: player profile, account status, balances, restrictions, and risk level
- **KYC**: document verification status per player
- **Payments**: transaction logging and status updates per player
- **Bonuses**: bonus assignment and tracking per player
- **Responsible Gaming**: gaming limits and their status
- **Login history** per player
- **Support tickets**: creation, comments, and status updates
- **Workspaces**: teams with members and associated tasks
- **Admin**: user and department management

## Tests

The project includes unit tests for the main services and controllers (auth, players, tickets, tasks, workspaces, admin):

```bash
npm run test       # unit tests
npm run test:e2e   # end-to-end tests
npm run test:cov   # coverage
```

## Environment variables

Create a `.env` file in the project root with:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
FRONTEND_URL=http://localhost:3001
PORT=3000
```

## Local installation and setup

```bash
npm install
npx prisma migrate deploy
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Deployment

Configured to deploy on Railway (build via Nixpacks, no Dockerfile). The `start:migrate` script applies Prisma migrations before starting the server in production.