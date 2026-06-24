# API Contract — iGaming Panel Backend

Contrato de la API tras la auditoría de seguridad/arquitectura (Fases 1–7). Cubre `auth`, `players` y `tickets` endpoint por endpoint, el diseño final de roles/departamentos (Fase 3), y los cambios de contrato respecto a como estaba el código antes de esta sesión.

No cubre `admin` (gestión de usuarios/departamentos, fuera del scope pedido) ni `workspaces`/`tasks` (módulo inactivo, ver README).

---

## 0. Convenciones generales

- **Base URL**: la que exponga el deploy (local: `http://localhost:3000`).
- **Autenticación**: header `Authorization: Bearer <access_token>` en todos los endpoints protegidos por `JwtAuthGuard`. El `access_token` expira en 15 minutos.
- **Refresh token**: viaja en una cookie **httpOnly** `refresh_token` (`Secure` solo en producción, `SameSite=Lax`, `Max-Age=7d`, `Path=/auth`). El cliente nunca lo lee ni lo escribe directamente — el navegador la envía solo a `POST /auth/refresh` y `POST /auth/logout` por el `Path=/auth`. Requiere que el cliente HTTP mande `credentials: 'include'` (CORS ya tiene `credentials: true`).
- **Validación de body**: `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true, transform: true`. Cualquier campo no declarado en el DTO, o con un valor fuera del enum/tipo esperado, devuelve **400** antes de llegar al controller. Las fechas (`Date`) se aceptan como string ISO 8601 en el body y se convierten automáticamente a `Date` (vía `@Type(() => Date)`).
- **Validación de query params**: los query params (`GET /tickets`, `GET /players`) **no pasan por un DTO** — se tipan en la firma del método pero no se validan en runtime. Un valor de enum inválido en un query param no se rechaza con 400; simplemente no hará match en el filtro de Prisma.
- **IDs de ruta**: todos los `:id` usan `ParseIntPipe` → **400** si no es un entero válido.
- **Formato de error** (estándar de Nest, sin envoltorio adicional):
  ```json
  { "statusCode": 403, "message": "No tienes acceso a este departamento", "error": "Forbidden" }
  ```
  Para errores de validación, `message` es un array de strings (uno por campo inválido).
- **Formato de éxito**: sin envoltorio — el body es directamente el recurso (objeto o array) que devuelve el controller.
- **Status codes**: `POST` → `201`, `GET`/`PUT` → `200` (default de Nest, no hay overrides con `@HttpCode` en ningún controller de esta sesión).

---

## 1. Auth (`/auth`)

### `POST /auth/register`
Sin autenticación.

**Body** (`RegisterDto`):
```json
{ "email": "string (formato email)", "password": "string (mínimo 8 caracteres)" }
```

**201**:
```json
{ "id": 1, "email": "agente@empresa.com", "role": "AGENT" }
```
`role` siempre es `"AGENT"` — no se puede registrar con otro rol desde este endpoint; lo asigna el default del schema.

**Errores**: `400` (validación), `409` (`"El email ya está registrado"`).

---

### `POST /auth/login`
Sin autenticación.

**Body** (`LoginDto`):
```json
{ "email": "string (formato email)", "password": "string (no vacío)" }
```

**201**:
```json
{ "access_token": "eyJ..." }
```
+ `Set-Cookie: refresh_token=...; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=604800`

**Errores**: `400` (validación), `401` (`"Credenciales incorrectas"`).

---

### `POST /auth/refresh`
Sin body. Requiere la cookie `refresh_token` (la pone `/auth/login`).

**201**:
```json
{ "access_token": "eyJ..." }
```
+ cookie `refresh_token` renovada (rotación de refresh token en cada uso).

**Errores**: `401` si la cookie falta, es inválida, expiró, o no coincide con el hash guardado en BD.

---

### `POST /auth/logout`
Requiere `JwtAuthGuard` (Bearer token).

**201**:
```json
{ "message": "Sesión cerrada correctamente" }
```
+ limpia la cookie `refresh_token` y borra el `refreshToken` hasheado en BD.

**Errores**: `401` (sin token o inválido).

---

### `GET /auth/profile`
Requiere `JwtAuthGuard`.

**200**:
```json
{ "id": 1, "email": "agente@empresa.com", "role": "AGENT", "department": "SUPPORT" }
```
`department` puede ser `null` (p. ej. un ADMIN sin departamento asignado).

**Errores**: `401`.

---

### `GET /auth/admin`
Requiere `JwtAuthGuard` + `RolesGuard` con `@Roles(Role.ADMIN)` (mínimo ADMIN).

**200**:
```json
{ "message": "Bienvenido al panel de administración", "user": { "id": 1, "email": "...", "role": "ADMIN", "department": null } }
```

**Errores**: `401` (sin token), `403` (autenticado pero rol < ADMIN).

---

## 2. Roles y departamentos (diseño final — Fase 3)

### `Role` (enum, `User.role`, default `AGENT`)

| Valor | Alcance |
|---|---|
| `AGENT` | Su propio `department` únicamente |
| `SUPERVISOR` | Su propio `department`, con permisos elevados (aprobar pagos/KYC/bonos, cambiar status del jugador) |
| `ADMIN` | Cross-departamento — `assertDepartment` lo deja pasar siempre, sin mirar su `department` |

Jerarquía (no es una lista de roles exactos, es un **mínimo**): `AGENT (0) < SUPERVISOR (1) < ADMIN (2)`. `@Roles(Role.X)` en un controller/método declara el rol **mínimo** requerido; `RolesGuard` compara rangos (`hasMinRole`), no igualdad. Un `ADMIN` siempre pasa cualquier `@Roles(...)`.

### `Department` (enum, `User.department` nullable, `Ticket.department` obligatorio)

Valores: `KYC`, `PAYMENTS`, `RISK`, `SUPPORT`, `OPERATIONS`.

La validación de pertenencia a departamento **no es un guard genérico** — vive dentro de cada service vía `assertDepartment(userRole, userDepartment, allowed)` (`src/auth/authorization.helper.ts`):
- Si `userRole === ADMIN` → pasa siempre.
- Si no, `userDepartment` debe estar incluido en `allowed` (uno o varios departamentos) → si no, `403 ForbiddenException('No tienes acceso a este departamento')`.

`assertMinRole(role, min)` es el equivalente para rol: `403 ForbiddenException('No tienes el rol necesario para realizar esta acción')` si no alcanza el mínimo.

### Tabla de endpoints protegidos (players + tickets)

| Endpoint | Mecanismo | Regla |
|---|---|---|
| `PUT /players/:id/balances` | `RolesGuard` + `@Roles(Role.ADMIN)` a nivel de **handler** | Solo ADMIN, sin importar departamento — es el único endpoint de esta sesión con guard de rol a nivel de ruta en lugar de chequeo en el service |
| `PUT /players/:id/status` | Chequeo en service | `department ∈ {RISK, SUPPORT}` + rol mínimo `SUPERVISOR` |
| `PUT /players/:id/risk` | Chequeo en service | `department = RISK` + rol mínimo `SUPERVISOR` |
| `PUT /players/:id/kyc` | Chequeo en service | `department = KYC` siempre; si la operación es una **decisión** (`idDocStatus` → `APPROVED`/`REJECTED`, `poaDocStatus`/`sofDocStatus` → `VERIFIED`/`REJECTED`, o `pepStatus` → `PEP`) además rol mínimo `SUPERVISOR`. Subir/editar un documento sin cambiar su estado a una decisión solo requiere `AGENT` |
| `POST /players/:id/payments` | Chequeo en service | `department = PAYMENTS` |
| `PUT /players/payments/:paymentId/status` | Chequeo en service | `department = PAYMENTS` + rol mínimo `SUPERVISOR` |
| `POST /players/:id/bonuses` | Chequeo en service | `department ∈ {PAYMENTS, SUPPORT}` |
| `PUT /players/bonuses/:bonusId/status` | Chequeo en service | `department ∈ {PAYMENTS, SUPPORT}` + rol mínimo `SUPERVISOR` |
| `POST /players/:id/rg`, `PUT /players/rg/:limitId/status` | — | Sin restricción de departamento/rol — cualquier agente autenticado |
| `GET /tickets/:id`, `PUT /tickets/:id/status`, `POST /tickets/:id/comments` | Chequeo en service (`assertCanAccessTicket`) | ADMIN, o creador (`createdById`) del ticket, o asignado (`assignedToId`), o mismo `department` que el ticket — si ninguna se cumple, `403` |
| `PUT /tickets/:id` | Igual que arriba | Además, si el body cambia `department` o `assignedToId`, requiere rol mínimo `SUPERVISOR` (reasignar cruza el ámbito del ticket) |
| `GET /tickets` | — | No es un 403: cualquier rol que no sea ADMIN ve **forzosamente** su propio departamento (el query param `department` se ignora); ADMIN puede filtrar libremente o ver todos |
| `GET /auth/admin` | `RolesGuard` + `@Roles(Role.ADMIN)` | Solo ADMIN |

El resto de endpoints de `players` (crear/leer/editar datos personales, notas, restricciones, historial de login, lecturas de KYC/pagos/bonos/RG) solo requieren `JwtAuthGuard` — cualquier agente autenticado, de cualquier departamento.

---

## 3. Players (`/players`)

Todos requieren `JwtAuthGuard` (Bearer token) salvo que se indique lo contrario.

### `POST /players`
**Body** (`CreatePlayerDto`):
```json
{ "email": "string (email)", "firstName": "string (no vacío)", "lastName": "string (no vacío)" }
```
**201**: el `Player` creado (con defaults: `status: "PENDING_VERIFICATION"`, `realBalance: 0`, `bonusBalance: 0`, `riskLevel: "LOW"`, `canDeposit/canWithdraw/canBet/canReceiveBonus/canLogin: true`, `tags: []`).

**Errores**: `400`, `409` (`"Ya existe un jugador con ese email"`).

---

### `GET /players?search=<string>`
`search` opcional, busca por `email`/`firstName`/`lastName` (insensible a mayúsculas).

**200**: array de resúmenes:
```json
[{
  "id": 1, "email": "...", "firstName": "...", "lastName": "...",
  "status": "ACTIVE", "riskLevel": "LOW", "createdAt": "...",
  "_count": { "notes": 3 },
  "kyc": { "idDocStatus": "APPROVED", "poaDocStatus": "VERIFIED", "sofDocStatus": "NOT_REQUESTED" } ,
  "rgLimits": [{ "id": 7 }]
}]
```
`kyc` es `null` si el jugador no tiene ficha KYC. `rgLimits` solo incluye autoexclusiones (`type: SELF_EXCLUSION`) activas (`status: ACTIVE`) — un array vacío si no tiene ninguna.

---

### `GET /players/:id`
**200**: el `Player` completo con relaciones:
```json
{
  "...campos del Player...",
  "notes": [{ "id": 1, "content": "...", "createdAt": "...", "author": { "id": 2, "email": "..." } }],
  "kyc": { "...PlayerKYC..." } | null,
  "payments": [{ "...PlayerPayment..." }],
  "bonuses": [{ "...PlayerBonus...", "grantedBy": { "id": 2, "email": "..." } }],
  "rgLimits": [{ "...PlayerRGLimit..." }],
  "tickets": [{ "id": 1, "title": "...", "status": "OPEN", "priority": "HIGH", "department": "PAYMENTS", "createdAt": "..." }],
  "loginHistory": [{ "...PlayerLoginHistory (últimos 10)..." }]
}
```
**Errores**: `404` (`"Jugador no encontrado"`).

---

### `PUT /players/:id`
**Body** (`UpdatePlayerDto`, todos opcionales): `firstName`, `lastName`, `phone`, `dateOfBirth` (string ISO → `Date`), `gender`, `nationality`, `country`, `city`, `address`, `language`, `tags: string[]`.

**200**: `Player` actualizado. **Errores**: `400`, `404`.

---

### `PUT /players/:id/status`
🔒 `department ∈ {RISK, SUPPORT}` + rol mínimo `SUPERVISOR`.

**Body** (`UpdatePlayerStatusDto`):
```json
{ "status": "ACTIVE" }
```
Valores válidos: `PENDING_VERIFICATION` | `ACTIVE` | `SUSPENDED` | `SELF_EXCLUDED`.

Efecto secundario: ajusta automáticamente `canDeposit`/`canWithdraw`/`canBet`/`canReceiveBonus`/`canLogin` según el nuevo estado (p. ej. `SUSPENDED`/`SELF_EXCLUDED` los pone todos en `false`).

**200**: `Player` actualizado. **Errores**: `400`, `403`, `404`.

---

### `PUT /players/:id/balances`
🔒 **Solo `Role.ADMIN`** (guard a nivel de ruta, no chequeo de departamento).

**Body** (`UpdateBalancesDto`, ambos opcionales):
```json
{ "realBalance": 150.50, "bonusBalance": 20 }
```
**200**: `Player` actualizado. **Errores**: `400`, `403` (no ADMIN), `404`.

---

### `PUT /players/:id/restrictions`
Sin restricción de departamento/rol.

**Body** (`UpdateRestrictionsDto`, todos opcionales booleanos): `canDeposit`, `canWithdraw`, `canBet`, `canReceiveBonus`, `canLogin`.

**200**: `Player` actualizado. **Errores**: `400`, `404`.

---

### `PUT /players/:id/risk`
🔒 `department = RISK` + rol mínimo `SUPERVISOR`.

**Body** (`UpdateRiskDto`, todos opcionales):
```json
{ "riskLevel": "HIGH", "isPEP": true, "sofVerified": false, "riskNotes": "string" }
```
`riskLevel`: `LOW` | `MEDIUM` | `HIGH`.

**200**: `Player` actualizado. **Errores**: `400`, `403`, `404`.

---

### `POST /players/:id/notes`
**Body** (`AddNoteDto`):
```json
{ "content": "string (no vacío)" }
```
**201**: `PlayerNote` creada con `author: { id, email }`. **Errores**: `400`, `404`.

---

### `GET /players/:id/login-history`
**200**: array de hasta 20 `PlayerLoginHistory`, orden descendente.

---

### `GET /players/:id/kyc`
**200**: `PlayerKYC` con `reviewedBy: { id, email } | null`, o `null` si no existe ficha.

---

### `PUT /players/:id/kyc`
🔒 `department = KYC` siempre; **+ rol mínimo `SUPERVISOR` si la operación es una decisión** (ver tabla de §2).

**Body** (`UpsertKycDto`, todos opcionales — es un upsert por `playerId`):
```json
{
  "kycLevel": "TIER_2",
  "idDocType": "PASSPORT", "idDocNumber": "string", "idDocExpiry": "2030-12-31", "idDocIssuingCountry": "ES",
  "idDocStatus": "APPROVED", "idDocUrl": "string",
  "poaDocType": "string", "poaDocStatus": "VERIFIED", "poaDocUrl": "string",
  "sofDocStatus": "VERIFIED", "sofDocUrl": "string", "sofDescription": "string",
  "pepStatus": "NOT_PEP", "pepNotes": "string"
}
```
Enums: `kycLevel` = `NONE`|`TIER_1`|`TIER_2`|`TIER_3`. `idDocStatus` = `NOT_REQUESTED`|`PENDING`|**`APPROVED`**|`REJECTED`. `poaDocStatus`/`sofDocStatus` = `NOT_REQUESTED`|`PENDING`|**`VERIFIED`**|`REJECTED` — ⚠️ **distinto enum que `idDocStatus`**: el valor de "aprobado" es `VERIFIED`, no `APPROVED`, para estos dos campos. `pepStatus` = `NOT_PEP`|`PEP`|`UNDER_REVIEW`.

**200**: `PlayerKYC` (creado o actualizado), con `reviewedAt`/`reviewedById` seteados al usuario autenticado en cada llamada. **Errores**: `400`, `403`, `404`.

---

### `GET /players/:id/payments`
**200**: array de `PlayerPayment`, orden descendente.

---

### `POST /players/:id/payments`
🔒 `department = PAYMENTS`.

**Body** (`AddPaymentDto`):
```json
{ "type": "DEPOSIT", "amount": 100, "currency": "EUR", "status": "PENDING", "paymentMethod": "string", "accountNumber": "string", "reference": "string", "notes": "string" }
```
`type` = `DEPOSIT`|`WITHDRAWAL` (requerido). `amount` debe ser positivo. `status` opcional = `PENDING`|`APPROVED`|`REJECTED` (resto opcionales).

**201**: `PlayerPayment` creado. **Errores**: `400`, `403`, `404`.

---

### `PUT /players/payments/:paymentId/status`
🔒 `department = PAYMENTS` + rol mínimo `SUPERVISOR`.

**Body** (`UpdatePaymentStatusDto`):
```json
{ "status": "APPROVED" }
```
Efecto secundario (atómico, en transacción): si pasa a `APPROVED`, ajusta `realBalance` del jugador (+monto si `DEPOSIT`, −monto si `WITHDRAWAL`); si se revierte desde `APPROVED`, deshace el efecto.

**200**: `PlayerPayment` actualizado. **Errores**: `400`, `403`, `404` (`"Pago no encontrado"`).

---

### `GET /players/:id/bonuses`
**200**: array de `PlayerBonus` con `grantedBy: { id, email }`.

---

### `POST /players/:id/bonuses`
🔒 `department ∈ {PAYMENTS, SUPPORT}`.

**Body** (`AddBonusDto`):
```json
{ "type": "DEPOSIT", "description": "string", "amount": 50, "wagering": 10, "maxWinAmount": 200, "expiresAt": "2026-12-31" }
```
`type` = `DEPOSIT`|`FREE_SPINS`|`CASHBACK`|`NO_DEPOSIT` (requerido). `amount` positivo, requerido.

Efecto secundario (atómico): incrementa `bonusBalance` del jugador en `amount`.

**201**: `PlayerBonus` creado con `grantedBy`. **Errores**: `400`, `403`, `404`.

---

### `PUT /players/bonuses/:bonusId/status`
🔒 `department ∈ {PAYMENTS, SUPPORT}` + rol mínimo `SUPERVISOR`.

**Body** (`UpdateBonusStatusDto`):
```json
{ "status": "CANCELLED" }
```
`status` = `ACTIVE`|`CLAIMED`|`CANCELLED`|`EXPIRED`.

Efecto secundario (atómico): si pasa de `ACTIVE` a `CANCELLED`/`EXPIRED`, decrementa `bonusBalance` en el monto del bono.

**200**: `PlayerBonus` actualizado. **Errores**: `400`, `403`, `404` (`"Bono no encontrado"`).

---

### `GET /players/:id/rg`
**200**: array de `PlayerRGLimit`, orden descendente.

---

### `POST /players/:id/rg`
Sin restricción de departamento/rol.

**Body** (`AddRgLimitDto`):
```json
{ "type": "SELF_EXCLUSION", "period": "WEEKLY", "amount": 500, "duration": 30, "endDate": "...", "coolingOffUntil": "...", "excludedUntil": "2026-12-31", "therapyFlag": false }
```
`type` (requerido) = `DEPOSIT_LIMIT`|`SESSION_LIMIT`|`COOL_OFF`|`SELF_EXCLUSION`|`REALITY_CHECK`. `period` opcional = `DAILY`|`WEEKLY`|`MONTHLY`.

Efecto secundario (atómico, misma transacción): si `type = SELF_EXCLUSION`, marca al jugador como `status: SELF_EXCLUDED` automáticamente.

**201**: `PlayerRGLimit` creado. **Errores**: `400`, `404`.

---

### `PUT /players/rg/:limitId/status`
Sin restricción de departamento/rol.

**Body** (`UpdateRgLimitStatusDto`):
```json
{ "status": "CANCELLED" }
```
`status` = `ACTIVE`|`EXPIRED`|`CANCELLED`.

**200**: `PlayerRGLimit` actualizado. **Errores**: `400`, `404` (`"Límite no encontrado"`).

> Nota: no hay endpoint HTTP para esto, pero existe un cron interno (`@Cron(EVERY_HOUR)`) que expira autoexclusiones vencidas (`excludedUntil <= now`) y reactiva al jugador (`status: ACTIVE`) automáticamente, sin intervención de un agente.

---

## 4. Tickets (`/tickets`)

Todos requieren `JwtAuthGuard`.

### `POST /tickets`
**Body** (`CreateTicketDto`):
```json
{ "title": "string (no vacío)", "description": "string (no vacío)", "department": "PAYMENTS", "priority": "HIGH", "playerId": 1, "assignedToId": 2 }
```
`department` (requerido) = `KYC`|`PAYMENTS`|`RISK`|`SUPPORT`|`OPERATIONS`. `priority` (requerido) = `LOW`|`MEDIUM`|`HIGH`|`URGENT`. `playerId`/`assignedToId` opcionales (enteros).

**201**: `Ticket` creado con `createdBy: { id, email }`, `assignedTo: { id, email } | null`, `player: { id, firstName, lastName, email } | null`.

**Errores**: `400`. No hay verificación explícita de que `playerId`/`assignedToId` existan antes de insertar — si no existen, la base de datos rechaza el insert por violación de foreign key (no se traduce a un 404/400 controlado).

---

### `GET /tickets?status=&department=&priority=&createdById=&assignedToId=`
Todos los query params opcionales. `createdById`/`assignedToId` se parsean a entero.

**Filtrado por departamento**: si el usuario autenticado **no** es `ADMIN`, el filtro de `department` ignora el query param y fuerza siempre su propio `department`. Si **es** `ADMIN`, puede pasar cualquier `department` o ninguno (ve todos).

**200**: array de `Ticket` con `createdBy`/`assignedTo`/`player` resumidos (igual forma que en `POST /tickets`).

---

### `GET /tickets/:id`
🔒 ADMIN, o creador, o asignado, o mismo departamento que el ticket.

**200**: `Ticket` con `createdBy`/`assignedTo`/`player` + `comments: [{ id, content, createdAt, author: { id, email } }]` (orden ascendente).

**Errores**: `403` (`"No tienes acceso a este ticket"`), `404` (`"Ticket no encontrado"`).

---

### `PUT /tickets/:id/status`
🔒 Mismo chequeo que `GET /tickets/:id`.

**Body** (`UpdateTicketStatusDto`):
```json
{ "status": "RESOLVED" }
```
`status` = `OPEN`|`IN_PROGRESS`|`PENDING_INFO`|`RESOLVED`|`CLOSED`.

Efecto secundario: si pasa a `RESOLVED`, setea `resolvedAt = now()`.

**200**: `Ticket` actualizado. **Errores**: `403`, `404`.

---

### `PUT /tickets/:id`
🔒 Mismo chequeo que `GET /tickets/:id`; **+ rol mínimo `SUPERVISOR` si el body incluye `department` o `assignedToId`**.

**Body** (`UpdateTicketDto`, todos opcionales):
```json
{ "title": "string", "description": "string", "priority": "URGENT", "department": "RISK", "assignedToId": 3 }
```
**200**: `Ticket` actualizado. **Errores**: `403` (incluye el caso de reasignar sin ser SUPERVISOR+), `404`.

---

### `POST /tickets/:id/comments`
🔒 Mismo chequeo que `GET /tickets/:id`.

**Body** (`AddCommentDto`):
```json
{ "content": "string (no vacío)" }
```
**201**: `TicketComment` creado con `author: { id, email }`. **Errores**: `403`, `404`.

---

## 5. Cambios de contrato respecto a antes de esta sesión

### Auth
| Antes | Ahora |
|---|---|
| `POST /auth/login` devolvía `{ access_token, refresh_token }` en el body | Devuelve solo `{ access_token }`; `refresh_token` va en cookie httpOnly |
| `POST /auth/refresh` recibía `{ refresh_token }` en el body | No recibe body; lee la cookie `refresh_token` |
| `POST /auth/logout` solo borraba el `refreshToken` en BD | Además limpia la cookie `refresh_token` |
| `@Roles('admin')` (string exacto, comparación por igualdad) | `@Roles(Role.ADMIN)` (enum, semántica de **rol mínimo** vía jerarquía) |
| Ningún DTO — `@Body() body: { email: string; password: string }` (interfaz TS, sin validar en runtime) | DTOs con `class-validator` (`RegisterDto`, `LoginDto`) — valores inválidos devuelven `400` antes de llegar al service |

### Players
| Antes | Ahora |
|---|---|
| Todos los endpoints con body usaban interfaces TS planas sin validar en runtime | DTOs con `class-validator`/`class-transformer` en los 14 endpoints con body |
| Cualquier agente autenticado podía: cambiar `status`, modificar balance, cambiar `riskLevel`/PEP, aprobar/rechazar KYC, crear/aprobar pagos, asignar/cancelar bonos | Todo lo anterior ahora exige departamento (y a veces rol `SUPERVISOR`+) según la tabla de §2; `updateBalances` exige `ADMIN` |
| `updatePaymentStatus`, `addBonus`, `updateBonusStatus`, `addRGLimit` y la reactivación del cron hacían 2 escrituras separadas (estado + balance) sin transacción | Envueltas en `$transaction` — atómicas |
| `Player.status`: string libre en minúscula (`"active"`, `"pending_verification"`, `"suspended"`, `"self_excluded"`) | Enum `PlayerStatus` en **mayúscula** (`ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `SELF_EXCLUDED`) — **rompe a cualquier cliente que mandara los valores en minúscula** |
| `Player.riskLevel`, `PlayerKYC.*`, `PlayerPayment.type/status`, `PlayerBonus.type/status`, `PlayerRGLimit.type/period/status`: strings libres (cualquier valor pasaba) | Enums reales — un valor fuera de la lista permitida ahora devuelve `400` (antes se guardaba tal cual, sin validar) |
| — | `poaDocStatus`/`sofDocStatus` usan `VERIFIED` como valor de "aprobado" (campo nuevo `ProofDocStatus`), distinto de `idDocStatus` que usa `APPROVED` (`IdDocStatus`) — antes ambos eran el mismo string libre, así que un cliente podía (incorrectamente) mandar `APPROVED` para los tres |
| `PlayersService` único, ~440 líneas | Dividido en 5 services (`PlayersService`, `PlayersKycService`, `PlayersPaymentsService`, `PlayersBonusesService`, `PlayersRgService`) detrás del mismo `PlayersController` — **sin cambio de rutas ni de contrato HTTP** |

### Tickets
| Antes | Ahora |
|---|---|
| `department` en el body se aceptaba en cualquier case (`"payments"`, `"Payments"`, `"PAYMENTS"`) — el service hacía `.toUpperCase()` | El DTO exige el valor exacto en mayúscula (`@IsEnum(Department)`); minúsculas ahora devuelven `400` |
| `GET /tickets/:id`, `PUT /tickets/:id/status`, `PUT /tickets/:id`, `POST /tickets/:id/comments`: sin ningún control de acceso más allá de estar autenticado | Ahora exigen pertenecer al departamento del ticket, ser su creador/asignado, o ser ADMIN — `403` si no |
| Reasignar `department`/`assignedToId` en `PUT /tickets/:id`: cualquier agente | Exige rol mínimo `SUPERVISOR` |
| `Ticket.status`: string libre | Enum `TicketStatus`, incluye el valor `PENDING_INFO` (ya estaba en uso en datos reales, no es nuevo) |
| `Ticket.priority`: string libre | Enum `TicketPriority` |

### Dashboard (no pedido en este documento, pero afecta la integración)
`GET /dashboard/metrics` vivía en `AppController` (sin prefijo) usando `AdminService`. Ahora vive en `DashboardController`/`DashboardService` — **misma ruta exacta, mismo contrato de respuesta**, sin cambios para el frontend.

### Esquema/BD (no son endpoints, pero determinan qué valores acepta cada body)
`User.role`: pasó de string libre (`"user"`/`"admin"`) a enum `Role` (`AGENT`/`SUPERVISOR`/`ADMIN`). `User.department`: de string libre a enum `Department`.
