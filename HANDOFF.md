# HANDOFF — noktos-agent-frontend

**Estado:** ✅ **LOOP TERMINADO** — `READY_FOR_HUMAN_REVIEW` (2026-09-14) · **Revisión humana real iniciada** (2026-09-15)
**Rama:** `loop/agent-frontend`
**Tareas completadas:** 46 / 46 (`FE-000` a `FE-015`)
**Worktree:** cambios sin commitear al 2026-09-15 (fix de `HttpTransport` + test de regresión — ver §4)

> [!NOTE]
> `READY_FOR_HUMAN_REVIEW` es el estado terminal máximo previsto por el loop autónomo. No significa `PRODUCTION_READY`. En V1 la aplicación corre en memoria sin persistencia de sesión cliente; el sistema de diseño visual corporativo y branding comercial quedan explícitamente diferidos a una fase posterior (`D-015`).

> [!IMPORTANT]
> **Este repositorio queda congelado como baseline funcional de V1 (`D-016`, 2026-09-15).**
> V2 se construye en un repo hermano nuevo, **`noktos-agent-next`** (`P-001`, `Q-P1`
> resuelto), no como conversión in-place de este código. Este repo sigue recibiendo fixes de
> bugs encontrados en revisión humana (como el de §4), pero **no** nuevo trabajo de features
> de V2. La decisión de archivar/deprecar este repo queda explícitamente diferida a después
> de que `noktos-agent-next` pase los smoke tests de V2-A — no está decidida aquí. Ver
> **[`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md)**
> — copia canónica trackeada por git del plan V2 completo y las decisiones (`P-xxx`) que
> rigen esto; vive en el repo backend solo por continuidad de git, no porque las decisiones
> sean exclusivas de ese repo.

---

## 0. Revisión humana real — lo que se validó y lo que no (2026-09-15)

Lo siguiente fue observado directamente por un humano en navegador, contra el backend
corriendo. **No se marca nada como validado sin esta evidencia.**

**Validado:**
- Flujo autenticado navegador → backend funcionando.
- SSE en vivo: el frontend recibe eventos.
- `demo:greeting`: `POST /messages` aceptado → task creada → `SupervisorAgent` completó →
  el frontend proyectó la respuesta desde el snapshot de la task.
- Delegación (`demo:hotel-delegation`): `SupervisorAgent` → child task → `HotelSearchAgent`
  → ambas tasks `completed`; la relación parent/child es correcta.
- Mock de hoteles invocado (`[MOCK] Noktos hotel search adapter invoked.` en logs).
- Aprobación — camino Approve (`demo:add-reservation-to-cart`): aprobación visible →
  decisión `approved` → task reanudó → `[MOCK] Noktos cart adapter invoked.` observado.
- Aprobación — camino Reject: decisión `rejected` → la task no reanudó ejecución → no se
  observó invocación adicional del adaptador de carrito atribuible al rechazo.
- Un bug real de runtime encontrado, diagnosticado, corregido y probado (§4).
- Doble `POST /conversations` en `vite` dev (dos conversaciones distintas) vs. una sola en
  `vite preview` de producción — documentado como comportamiento de dev, no bloqueante (§5).

**Explícitamente NO probado todavía** (no asumir que pasa): expiración/TTL de aprobaciones,
estado `superseded`, rechazo de decisión por un usuario que no es el dueño de la
conversación, escenarios exhaustivos de reconexión/gap de SSE, reintentos/idempotencia
exhaustivos, cualquier caso de seguridad o production-readiness.

Detalle completo, con decisiones de producto asociadas: [`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md).

---

## 1. ¿Qué es este proyecto y qué se construyó?

`noktos-agent-frontend` es la interfaz web interactiva para la demo multi-agente observable de Noktos. Permite a los usuarios interactuar con el asistente supervisor, seguir el estado de tareas asíncronas en tiempo real, visualizar eventos vía Server-Sent Events (SSE) y autorizar o rechazar solicitudes sensibles mediante tarjetas de aprobación (*human-in-the-loop*).

### Aspectos arquitectónicos implementados:

1. **Clean Architecture + Atomic Design**:
   - **`src/domain/`**: Modelos de dominio puros (conversación, tareas, aprobaciones, eventos).
   - **`src/application/`**: Casos de uso (`createChatSession`), puertos (`AgentTransport`) y gestión de estado reactivo (`conversationTasks`, `conversationApprovals`, etc.).
   - **`src/infrastructure/`**: Implementaciones técnicas aisladas: `HttpTransport` (REST/SSE con reconexión), `SupabaseAuthService` y mapeadores.
   - **`src/presentation/`**: Componentes organizados bajo Atomic Design:
     - `atoms/`: Botones, inputs, badges de estado, etiquetas.
     - `molecules/`: Mensajes de chat, items de tareas, campos de preview de aprobaciones.
     - `organisms/`: `ChatWorkspace`, `TaskQueue`, `ApprovalCards`, `EventStreamViewer`, `LoginForm`.
     - `templates/` y `pages/`: Layout de dos columnas y vistas de sesión.
     - `hooks/` y `view-models/`: Proyección desacoplada para consumo de UI.

2. **Proyección asíncrona de respuestas del asistente (`D-014`)**:
   - El chat muestra de inmediato el estado pendiente cuando el envío retorna `202 Accepted` y `createdTaskIds`.
   - Los eventos SSE invalidan y refrescan el snapshot autoritativo de tareas (`GET /conversations/:id/tasks`).
   - La respuesta visible del asistente se deriva de `task.result.summary` al completarse la tarea.
   - **Nunca** se renderizan payloads crudos de eventos SSE ni `chain-of-thought`.

3. **Diseño visual funcional diferido para post-V1 (`D-015`)**:
   - Para V1 se mantiene una presentación funcional limpia en HTML semántico con estilos base mínimos.
   - El branding corporativo, paleta comercial definitiva y librerías externas de diseño se difieren a una fase posterior con revisión humana.

4. **Contratos congelados en 1.0.0 (`D-007`)**:
   - `src/contracts/` es una copia estricta verificada byte a byte contra `contracts.lock` mediante `npm run verify:contracts`.

---

## 2. Integración con el Contrato de API (Backend)

La capa de infraestructura (`HttpTransport.ts`) se conecta a los endpoints congelados en `1.0.0` del backend:

| Operación | Método y Ruta Backend | Propósito |
| :--- | :--- | :--- |
| Crear conversación | `POST /conversations` | Inicializa la sesión de chat. |
| Enviar mensaje | `POST /conversations/:id/messages` | Envía mensaje del usuario y obtiene `createdTaskIds`. |
| Snapshot de tareas | `GET /conversations/:id/tasks` | Obtiene lista autoritativa de tareas y sus resultados. |
| Snapshot de aprobaciones | `GET /conversations/:id/approvals` | Obtiene aprobaciones pendientes y resueltas. |
| Decisión de aprobación | `POST /approvals/:id/decision` | Envía `approve` o `reject` con idempotencia. |
| Descriptores de agentes | `GET /agents` | Consulta agentes disponibles. |
| Eventos en vivo | `GET /conversations/:id/events` | Stream SSE vía `fetch` + `ReadableStream` con `Last-Event-ID`. |

---

## 3. ¿Qué toca hacer a partir de aquí? (Próximos Pasos)

La guía detallada de verificación humana se encuentra en **[`docs/HUMAN_REVIEW.md`](./docs/HUMAN_REVIEW.md)**.

### Paso 1: Configurar variables de entorno
Crea un archivo `.env` local basándote en `.env.example`:
```dotenv
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-public-anon-key>
VITE_BACKEND_URL=http://localhost:3000
```
> [!CAUTION]
> Utiliza únicamente la anon key pública de Supabase. Nunca coloques la `service_role` key ni secretos en este frontend.

### Paso 2: Ejecutar el servidor de desarrollo
Desde la raíz del repositorio:
```bash
./node_modules/.bin/vite --host 127.0.0.1
```
Abre la URL indicada (usualmente `http://127.0.0.1:5173`) en el navegador.

Para previsualizar el build compilado en `dist/`:
```bash
./node_modules/.bin/vite preview --host 127.0.0.1
```

### Paso 3: Flujo de prueba interactivo (Human Review)
1. **Inicio de sesión**: Ingresa con un usuario de prueba de Supabase. Confirma que el token se conserva únicamente en memoria (al recargar la página la sesión se reinicia limpiamente).
2. **Envío de mensaje**: Envía un mensaje en el chat (por ejemplo: *"Busca un hotel en Cancún para la próxima semana"*).
3. **Observabilidad de tareas**: Observa cómo la tarea se crea en la cola, pasa a `running` y finalmente a `completed`.
4. **Respuesta del asistente**: Verifica que la respuesta en el chat se proyecte a partir del resumen de la tarea completada sin exponer razonamiento interno (`chain-of-thought`).
5. **Tarjeta de aprobación**: Simula una reserva (`add_reservation_to_cart`) y confirma que aparece la tarjeta de aprobación con los datos claros (`hotelName`, fechas, precio) y botones para Aprobar / Rechazar.
6. **Stream de eventos**: Verifica que el visor lateral de eventos SSE muestre los eventos operacionales en orden secuencial.

### Paso 4: Roadmap para V2 (Post-V1)

> [!NOTE]
> Esta lista es la que dejó el loop autónomo al cerrar V1. **Ya no es el roadmap vigente.**
> El roadmap V2 real, con decisiones de producto (`P-xxx`) y milestones ejecutables, vive en
> [`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md). En resumen: V2 usa un frontend Next.js **nuevo** (`D-016`); branding y
> persistencia de sesión quedan diferidos a V3+, no son parte de V2.

1. **Sistema de Diseño y Branding**: Incorporar biblioteca de componentes o Tailwind CSS con la identidad visual corporativa definitiva de Noktos. — *diferido a V3+, ver [`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md).*
2. **Persistencia de sesión segura**: Evaluar opciones de refresco de tokens o sesión duradera si el producto comercial lo requiere. — *diferido a V3+ salvo blocker real, ver [`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md).*
3. **Soporte responsive y accesibilidad**: Refinar la vista móvil y realizar auditoría de accesibilidad WCAG 2.1 AA (`Q-003`). — *sigue abierto, no es requisito de V2.*

---

## 4. Bugs encontrados y corregidos en revisión humana (2026-09-15)

### `HttpTransport` — receptor incorrecto en `fetchImplementation`

**Síntoma:** tras el login, todos los paneles mostraban "could not be initialized"; cero
requests `POST /conversations` llegaban a la red; sin error en consola.

**Causa raíz** ([`src/infrastructure/api/HttpTransport.ts`](./src/infrastructure/api/HttpTransport.ts)):
se guardaba `this.fetchImplementation = options.fetch ?? globalThis.fetch` (una referencia
nativa sin bind) y luego se invocaba como método: `this.fetchImplementation(...)`. `fetch`
nativo exige `window`/`globalThis` como receptor; invocarlo como método de la instancia lo
rompe. Confirmado en Chrome DevTools: `TypeError: Failed to execute 'fetch' on 'Window':
Illegal invocation`.

**Fix:** `this.fetchImplementation = options.fetch ?? globalThis.fetch.bind(globalThis);`

**Test de regresión:** `scripts/test-http-transport-fetch-binding.mjs` (`npm test`). Sin
dependencias nuevas — usa la API programática de `vite` (ya instalada) para cargar el
`.ts` real, y un mock de `fetch` que replica el brand-check nativo (el `fetch` de Node no lo
hace por sí solo, verificado). Se confirmó que el test **falla** contra el código sin el fix
antes de aceptarlo como válido.

**Validaciones post-fix:** `npm test` PASS, `npm run verify:contracts` OK, `npm run build`
limpio, cero `console.*` temporales en `src/`.

**No tocado:** auth, comportamiento de Supabase, persistencia de sesión, CORS del backend,
contratos, arquitectura de SSE.

**Estado:** cambios en el working tree, **sin commitear** al cierre de esta sesión.

## 5. Observación de desarrollo — doble `POST /conversations`

En `vite` modo dev se observaron dos `POST /conversations`, creando dos conversaciones
distintas. En un build de producción (`vite build` + `vite preview`) se observó una sola.
Consistente con el doble-invoke deliberado de efectos de React 18 `StrictMode` en desarrollo
(`src/main.tsx` envuelve `<App/>` en `<StrictMode>`). **No se considera blocker.** No se
quitó `StrictMode` para ocultarlo. Detalle en [`../noktos-agent-backend/docs/workspace/PROGRESS.md`](../noktos-agent-backend/docs/workspace/PROGRESS.md).
