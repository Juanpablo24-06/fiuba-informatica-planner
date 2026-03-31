import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createTerm,
  deleteTerm,
  listTerms,
  termCreateSchema,
  termUpdateSchema,
  updateTerm
} from "@/lib/admin/terms";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  subjectCreateSchema,
  subjectUpdateSchema,
  updateSubject
} from "@/lib/admin/subjects";
import {
  createEnrollment,
  deleteEnrollment,
  enrollmentCreateSchema,
  enrollmentUpdateSchema,
  listEnrollments,
  updateEnrollment
} from "@/lib/admin/enrollments";
import {
  createEvent,
  deleteEvent,
  eventCreateSchema,
  eventUpdateSchema,
  listEvents,
  updateEvent
} from "@/lib/admin/events";
import {
  bootstrapCbc,
  getBootstrapStatus
} from "@/lib/admin/bootstrap-cbc";

export const MCP_TOOL_NAMES = [
  "list_terms",
  "get_current_term",
  "list_subjects",
  "list_enrollments",
  "list_events",
  "get_admin_snapshot",
  "get_bootstrap_cbc_status",
  "create_term",
  "update_term",
  "delete_term",
  "create_subject",
  "update_subject",
  "delete_subject",
  "create_enrollment",
  "update_enrollment",
  "delete_enrollment",
  "create_event",
  "update_event",
  "delete_event",
  "bootstrap_cbc"
] as const;

const toTextResult = (payload: Record<string, unknown>, summary: string) => ({
  content: [
    {
      type: "text" as const,
      text: `${summary}\n\n${JSON.stringify(payload, null, 2)}`
    }
  ],
  structuredContent: payload
});

const toErrorResult = (tool: string, error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text:
        error instanceof Error
          ? `La tool ${tool} falló: ${error.message}`
          : `La tool ${tool} falló por un error desconocido.`
    }
  ],
  structuredContent: {
    ok: false,
    tool,
    error: error instanceof Error ? error.message : "Error desconocido."
  }
});

const withToolResult = async (
  tool: string,
  action: () => Promise<{ summary: string; payload: Record<string, unknown> }>
) => {
  try {
    const result = await action();
    return toTextResult(result.payload, result.summary);
  } catch (error) {
    return toErrorResult(tool, error);
  }
};

const deleteSchema = z.object({
  id: z.string().uuid()
});

const updateTermSchema = termUpdateSchema.extend({
  id: z.string().uuid()
});

const updateSubjectSchema = subjectUpdateSchema.extend({
  id: z.string().uuid()
});

const listEnrollmentsSchema = z.object({
  termId: z.string().uuid().optional()
});

const updateEnrollmentSchema = enrollmentUpdateSchema.extend({
  id: z.string().uuid()
});

const listEventsSchema = z.object({
  termId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional()
});

const updateEventSchema = eventUpdateSchema.extend({
  id: z.string().uuid()
});

const buildSnapshot = async () => {
  const [terms, subjects, bootstrapStatus] = await Promise.all([
    listTerms(),
    listSubjects(),
    getBootstrapStatus()
  ]);

  const currentTerm =
    terms.find((term) => term.is_current) ??
    terms[0] ??
    null;

  const currentTermId = currentTerm?.id ?? null;
  const [enrollments, events] = await Promise.all([
    currentTermId ? listEnrollments(currentTermId) : Promise.resolve([]),
    currentTermId ? listEvents({ termId: currentTermId }) : Promise.resolve([])
  ]);

  return {
    current_term: currentTerm,
    counts: {
      terms: terms.length,
      subjects: subjects.length,
      current_term_enrollments: enrollments.length,
      current_term_events: events.length
    },
    terms,
    subjects,
    current_term_enrollments: enrollments,
    current_term_events: events,
    bootstrap_cbc: {
      loaded: bootstrapStatus.loaded,
      approved: bootstrapStatus.approved,
      total: bootstrapStatus.total,
      missing: bootstrapStatus.missing,
      term: bootstrapStatus.term
    }
  };
};

const registerReadTools = (server: McpServer) => {
  server.registerTool(
    "list_terms",
    {
      title: "List Terms",
      description: "Lista todos los cuatrimestres disponibles."
    },
    async () =>
      withToolResult("list_terms", async () => {
        const terms = await listTerms();
        return {
          summary: `Se listaron ${terms.length} cuatrimestres.`,
          payload: {
            ok: true,
            count: terms.length,
            terms
          }
        };
      })
  );

  server.registerTool(
    "get_current_term",
    {
      title: "Get Current Term",
      description: "Devuelve el cuatrimestre actual o el más reciente."
    },
    async () =>
      withToolResult("get_current_term", async () => {
        const terms = await listTerms();
        const term = terms.find((item) => item.is_current) ?? terms[0] ?? null;
        return {
          summary: term
            ? `Cuatrimestre actual: ${term.label}.`
            : "No hay cuatrimestre actual cargado.",
          payload: {
            ok: true,
            term
          }
        };
      })
  );

  server.registerTool(
    "list_subjects",
    {
      title: "List Subjects",
      description: "Lista todas las materias cargadas en la base."
    },
    async () =>
      withToolResult("list_subjects", async () => {
        const subjects = await listSubjects();
        return {
          summary: `Se listaron ${subjects.length} materias.`,
          payload: {
            ok: true,
            count: subjects.length,
            subjects
          }
        };
      })
  );

  server.registerTool(
    "list_enrollments",
    {
      title: "List Enrollments",
      description:
        "Lista cursadas. Si `termId` está presente, filtra por cuatrimestre.",
      inputSchema: listEnrollmentsSchema
    },
    async ({ termId }) =>
      withToolResult("list_enrollments", async () => {
        const enrollments = await listEnrollments(termId);
        return {
          summary: `Se listaron ${enrollments.length} cursadas${termId ? " para el cuatrimestre pedido" : ""}.`,
          payload: {
            ok: true,
            count: enrollments.length,
            termId: termId ?? null,
            enrollments
          }
        };
      })
  );

  server.registerTool(
    "list_events",
    {
      title: "List Events",
      description:
        "Lista eventos. Puede filtrar por `termId` y/o `enrollmentId`.",
      inputSchema: listEventsSchema
    },
    async ({ termId, enrollmentId }) =>
      withToolResult("list_events", async () => {
        const events = await listEvents({ termId, enrollmentId });
        return {
          summary: `Se listaron ${events.length} eventos.`,
          payload: {
            ok: true,
            count: events.length,
            termId: termId ?? null,
            enrollmentId: enrollmentId ?? null,
            events
          }
        };
      })
  );

  server.registerTool(
    "get_admin_snapshot",
    {
      title: "Get Admin Snapshot",
      description:
        "Devuelve una foto compacta del estado admin actual: cuatrimestre, materias, cursadas y eventos."
    },
    async () =>
      withToolResult("get_admin_snapshot", async () => {
        const snapshot = await buildSnapshot();
        return {
          summary: "Se generó el snapshot admin actual.",
          payload: {
            ok: true,
            snapshot
          }
        };
      })
  );

  server.registerTool(
    "get_bootstrap_cbc_status",
    {
      title: "Get CBC Bootstrap Status",
      description:
        "Consulta si el histórico CBC ya fue materializado como cuatrimestre aprobado."
    },
    async () =>
      withToolResult("get_bootstrap_cbc_status", async () => {
        const status = await getBootstrapStatus();
        return {
          summary: `Estado CBC: ${status.approved}/${status.total} aprobadas en ${status.term}.`,
          payload: {
            ok: true,
            status
          }
        };
      })
  );
};

const registerWriteTools = (server: McpServer) => {
  server.registerTool(
    "create_term",
    {
      title: "Create Term",
      description: "Crea un cuatrimestre nuevo.",
      inputSchema: termCreateSchema
    },
    async (input) =>
      withToolResult("create_term", async () => {
        const term = await createTerm(input);
        return {
          summary: term
            ? `Se creó el cuatrimestre ${term.label}.`
            : "No se pudo crear el cuatrimestre.",
          payload: {
            ok: Boolean(term),
            term
          }
        };
      })
  );

  server.registerTool(
    "update_term",
    {
      title: "Update Term",
      description: "Actualiza un cuatrimestre existente.",
      inputSchema: updateTermSchema
    },
    async ({ id, ...patch }) =>
      withToolResult("update_term", async () => {
        const term = await updateTerm(id, patch);
        return {
          summary: term
            ? `Se actualizó el cuatrimestre ${term.label}.`
            : "No se encontró el cuatrimestre a actualizar.",
          payload: {
            ok: Boolean(term),
            term
          }
        };
      })
  );

  server.registerTool(
    "delete_term",
    {
      title: "Delete Term",
      description: "Elimina un cuatrimestre por id.",
      inputSchema: deleteSchema
    },
    async ({ id }) =>
      withToolResult("delete_term", async () => {
        await deleteTerm(id);
        return {
          summary: "Se eliminó el cuatrimestre.",
          payload: {
            ok: true,
            id
          }
        };
      })
  );

  server.registerTool(
    "create_subject",
    {
      title: "Create Subject",
      description: "Crea una materia nueva.",
      inputSchema: subjectCreateSchema
    },
    async (input) =>
      withToolResult("create_subject", async () => {
        const subject = await createSubject(input);
        return {
          summary: `Se creó la materia ${subject.name}.`,
          payload: {
            ok: true,
            subject
          }
        };
      })
  );

  server.registerTool(
    "update_subject",
    {
      title: "Update Subject",
      description: "Actualiza una materia existente.",
      inputSchema: updateSubjectSchema
    },
    async ({ id, ...patch }) =>
      withToolResult("update_subject", async () => {
        const subject = await updateSubject(id, patch);
        return {
          summary: `Se actualizó la materia ${subject.name}.`,
          payload: {
            ok: true,
            subject
          }
        };
      })
  );

  server.registerTool(
    "delete_subject",
    {
      title: "Delete Subject",
      description: "Elimina una materia por id.",
      inputSchema: deleteSchema
    },
    async ({ id }) =>
      withToolResult("delete_subject", async () => {
        await deleteSubject(id);
        return {
          summary: "Se eliminó la materia.",
          payload: {
            ok: true,
            id
          }
        };
      })
  );

  server.registerTool(
    "create_enrollment",
    {
      title: "Create Enrollment",
      description: "Crea una cursada nueva.",
      inputSchema: enrollmentCreateSchema
    },
    async (input) =>
      withToolResult("create_enrollment", async () => {
        const enrollment = await createEnrollment(input);
        return {
          summary: "Se creó la cursada.",
          payload: {
            ok: true,
            enrollment
          }
        };
      })
  );

  server.registerTool(
    "update_enrollment",
    {
      title: "Update Enrollment",
      description: "Actualiza una cursada existente.",
      inputSchema: updateEnrollmentSchema
    },
    async ({ id, ...patch }) =>
      withToolResult("update_enrollment", async () => {
        const enrollment = await updateEnrollment(id, patch);
        return {
          summary: "Se actualizó la cursada.",
          payload: {
            ok: true,
            enrollment
          }
        };
      })
  );

  server.registerTool(
    "delete_enrollment",
    {
      title: "Delete Enrollment",
      description: "Elimina una cursada por id.",
      inputSchema: deleteSchema
    },
    async ({ id }) =>
      withToolResult("delete_enrollment", async () => {
        await deleteEnrollment(id);
        return {
          summary: "Se eliminó la cursada.",
          payload: {
            ok: true,
            id
          }
        };
      })
  );

  server.registerTool(
    "create_event",
    {
      title: "Create Event",
      description: "Crea un evento nuevo.",
      inputSchema: eventCreateSchema
    },
    async (input) =>
      withToolResult("create_event", async () => {
        const event = await createEvent(input);
        return {
          summary: `Se creó el evento ${event?.title ?? event?.type ?? "sin título"}.`,
          payload: {
            ok: true,
            event
          }
        };
      })
  );

  server.registerTool(
    "update_event",
    {
      title: "Update Event",
      description: "Actualiza un evento existente.",
      inputSchema: updateEventSchema
    },
    async ({ id, ...patch }) =>
      withToolResult("update_event", async () => {
        const event = await updateEvent(id, patch);
        return {
          summary: `Se actualizó el evento ${event?.title ?? event?.type ?? "sin título"}.`,
          payload: {
            ok: true,
            event
          }
        };
      })
  );

  server.registerTool(
    "delete_event",
    {
      title: "Delete Event",
      description: "Elimina un evento por id.",
      inputSchema: deleteSchema
    },
    async ({ id }) =>
      withToolResult("delete_event", async () => {
        await deleteEvent(id);
        return {
          summary: "Se eliminó el evento.",
          payload: {
            ok: true,
            id
          }
        };
      })
  );

  server.registerTool(
    "bootstrap_cbc",
    {
      title: "Bootstrap CBC",
      description:
        "Materializa el histórico CBC en el cuatrimestre 2023-0 y marca sus materias como aprobadas."
    },
    async () =>
      withToolResult("bootstrap_cbc", async () => {
        const result = await bootstrapCbc();
        return {
          summary: result.message,
          payload: {
            ok: true,
            result
          }
        };
      })
  );
};

export const registerMcpTools = (server: McpServer) => {
  registerReadTools(server);
  registerWriteTools(server);
};
