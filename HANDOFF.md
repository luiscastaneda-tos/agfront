# HANDOFF — noktos-agent-frontend

**Estado:** ✅ **LOOP TERMINADO** — `READY_FOR_HUMAN_REVIEW` (2026-09-14)
**Rama:** `loop/agent-frontend`
**Tareas completadas:** 46 / 46 (`FE-000` a `FE-015`)
**Worktree:** Limpio, todos los cambios integrados y verificados

> [!NOTE]
> `READY_FOR_HUMAN_REVIEW` es el estado terminal máximo previsto por el loop autónomo. No significa `PRODUCTION_READY`. En V1 la aplicación corre en memoria sin persistencia de sesión cliente; el sistema de diseño visual corporativo y branding comercial quedan explícitamente diferidos a una fase posterior (`D-015`).

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
1. **Sistema de Diseño y Branding**: Incorporar biblioteca de componentes o Tailwind CSS con la identidad visual corporativa definitiva de Noktos.
2. **Persistencia de sesión segura**: Evaluar opciones de refresco de tokens o sesión duradera si el producto comercial lo requiere.
3. **Soporte responsive y accesibilidad**: Refinar la vista móvil y realizar auditoría de accesibilidad WCAG 2.1 AA (`Q-003`).
