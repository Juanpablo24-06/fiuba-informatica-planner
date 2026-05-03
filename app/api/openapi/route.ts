import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" }
} as const;

const successEnvelope = (key: string, schema: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: ["ok", key],
  properties: {
    ok: { type: "boolean", enum: [true] },
    [key]: schema
  }
});

const errorEnvelope = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "error"],
  properties: {
    ok: { type: "boolean", enum: [false] },
    error: { type: "string" }
  }
} as const;

const uuid = { type: "string", format: "uuid" } as const;
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nullableInteger = { anyOf: [{ type: "integer" }, { type: "null" }] } as const;
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] } as const;
const nullableBoolean = { anyOf: [{ type: "boolean" }, { type: "null" }] } as const;

const buildOpenApiSpec = (origin: string) => ({
  openapi: "3.1.0",
  info: {
    title: "FIUBA Informatica Custom GPT Actions",
    version: "1.0.0",
    description:
      "Acciones administrativas completas para cuatrimestres, materias, cursadas, eventos y bootstrap CBC."
  },
  servers: [{ url: origin }],
  paths: {
    "/api/gpt-actions/admin/snapshot": {
      get: {
        operationId: "getAdminSnapshot",
        summary: "Obtiene una foto completa del estado admin actual.",
        responses: {
          "200": {
            description: "Snapshot admin generado.",
            content: {
              "application/json": {
                schema: successEnvelope("snapshot", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          },
          default: {
            description: "Error",
            content: { "application/json": { schema: errorEnvelope } }
          }
        }
      }
    },
    "/api/gpt-actions/admin/bootstrap-cbc": {
      get: {
        operationId: "getBootstrapCbcStatus",
        summary: "Consulta el estado del histórico CBC.",
        responses: {
          "200": {
            description: "Estado actual del CBC.",
            content: {
              "application/json": {
                schema: successEnvelope("status", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      },
      post: {
        operationId: "bootstrapCbc",
        summary: "Materializa el histórico CBC como materias aprobadas.",
        responses: {
          "200": {
            description: "Bootstrap ejecutado.",
            content: {
              "application/json": {
                schema: successEnvelope("result", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/terms": {
      get: {
        operationId: "listTerms",
        summary: "Lista todos los cuatrimestres.",
        responses: {
          "200": {
            description: "Cuatrimestres listados.",
            content: {
              "application/json": {
                schema: successEnvelope("terms", {
                  type: "array",
                  items: { $ref: "#/components/schemas/Term" }
                })
              }
            }
          }
        }
      },
      post: {
        operationId: "createTerm",
        summary: "Crea un cuatrimestre.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TermCreateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Cuatrimestre creado.",
            content: {
              "application/json": {
                schema: successEnvelope("term", { $ref: "#/components/schemas/Term" })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/terms/{id}": {
      patch: {
        operationId: "updateTerm",
        summary: "Actualiza un cuatrimestre.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TermUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Cuatrimestre actualizado.",
            content: {
              "application/json": {
                schema: successEnvelope("term", { $ref: "#/components/schemas/Term" })
              }
            }
          }
        }
      },
      delete: {
        operationId: "deleteTerm",
        summary: "Elimina un cuatrimestre.",
        parameters: [idParam],
        responses: {
          "200": {
            description: "Cuatrimestre eliminado.",
            content: {
              "application/json": {
                schema: successEnvelope("deleted", { type: "boolean", enum: [true] })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/subjects": {
      get: {
        operationId: "listSubjects",
        summary: "Lista todas las materias.",
        responses: {
          "200": {
            description: "Materias listadas.",
            content: {
              "application/json": {
                schema: successEnvelope("subjects", {
                  type: "array",
                  items: { $ref: "#/components/schemas/Subject" }
                })
              }
            }
          }
        }
      },
      post: {
        operationId: "createSubject",
        summary: "Crea una materia.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubjectCreateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Materia creada.",
            content: {
              "application/json": {
                schema: successEnvelope("subject", { $ref: "#/components/schemas/Subject" })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/subjects/{id}": {
      patch: {
        operationId: "updateSubject",
        summary: "Actualiza una materia.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubjectUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Materia actualizada.",
            content: {
              "application/json": {
                schema: successEnvelope("subject", { $ref: "#/components/schemas/Subject" })
              }
            }
          }
        }
      },
      delete: {
        operationId: "deleteSubject",
        summary: "Elimina una materia.",
        parameters: [idParam],
        responses: {
          "200": {
            description: "Materia eliminada.",
            content: {
              "application/json": {
                schema: successEnvelope("deleted", { type: "boolean", enum: [true] })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/enrollments": {
      get: {
        operationId: "listEnrollments",
        summary: "Lista cursadas, opcionalmente filtradas por cuatrimestre.",
        parameters: [
          {
            name: "termId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "Cursadas listadas.",
            content: {
              "application/json": {
                schema: successEnvelope("enrollments", {
                  type: "array",
                  items: { type: "object", additionalProperties: true }
                })
              }
            }
          }
        }
      },
      post: {
        operationId: "createEnrollment",
        summary: "Crea una cursada.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EnrollmentCreateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Cursada creada.",
            content: {
              "application/json": {
                schema: successEnvelope("enrollment", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/enrollments/{id}": {
      patch: {
        operationId: "updateEnrollment",
        summary: "Actualiza una cursada.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EnrollmentUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Cursada actualizada.",
            content: {
              "application/json": {
                schema: successEnvelope("enrollment", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      },
      delete: {
        operationId: "deleteEnrollment",
        summary: "Elimina una cursada.",
        parameters: [idParam],
        responses: {
          "200": {
            description: "Cursada eliminada.",
            content: {
              "application/json": {
                schema: successEnvelope("deleted", { type: "boolean", enum: [true] })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/events": {
      get: {
        operationId: "listEvents",
        summary: "Lista eventos, con filtro opcional por cuatrimestre o cursada.",
        parameters: [
          {
            name: "termId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "enrollmentId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "Eventos listados.",
            content: {
              "application/json": {
                schema: successEnvelope("events", {
                  type: "array",
                  items: { type: "object", additionalProperties: true }
                })
              }
            }
          }
        }
      },
      post: {
        operationId: "createEvent",
        summary: "Crea un evento académico.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventCreateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Evento creado.",
            content: {
              "application/json": {
                schema: successEnvelope("event", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      }
    },
    "/api/gpt-actions/events/{id}": {
      patch: {
        operationId: "updateEvent",
        summary: "Actualiza un evento académico.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EventUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Evento actualizado.",
            content: {
              "application/json": {
                schema: successEnvelope("event", {
                  type: "object",
                  additionalProperties: true
                })
              }
            }
          }
        }
      },
      delete: {
        operationId: "deleteEvent",
        summary: "Elimina un evento académico.",
        parameters: [idParam],
        responses: {
          "200": {
            description: "Evento eliminado.",
            content: {
              "application/json": {
                schema: successEnvelope("deleted", { type: "boolean", enum: [true] })
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Term: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: uuid,
          label: { type: "string" },
          start_date: nullableString,
          end_date: nullableString,
          is_current: { type: "boolean" }
        }
      },
      TermCreateInput: {
        type: "object",
        additionalProperties: false,
        required: ["label"],
        properties: {
          label: { type: "string", pattern: "^\\d{4}-(1|2)$" },
          start_date: nullableString,
          end_date: nullableString,
          is_current: { type: "boolean" }
        }
      },
      TermUpdateInput: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string", pattern: "^\\d{4}-(0|1|2)$" },
          start_date: nullableString,
          end_date: nullableString,
          is_current: { type: "boolean" }
        }
      },
      Subject: {
        type: "object",
        additionalProperties: true
      },
      SubjectCreateInput: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          code: nullableString,
          name: { type: "string" },
          credits: nullableInteger,
          weekly_hours: nullableInteger,
          total_hours: nullableInteger,
          term_suggested: nullableInteger,
          cycle: nullableString,
          type: nullableString,
          requirements: {
            anyOf: [
              { type: "array", items: { type: "string" } },
              { type: "null" }
            ]
          },
          template: {
            anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }]
          }
        }
      },
      SubjectUpdateInput: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: nullableString,
          name: { type: "string" },
          credits: nullableInteger,
          weekly_hours: nullableInteger,
          total_hours: nullableInteger,
          term_suggested: nullableInteger,
          cycle: nullableString,
          type: nullableString,
          requirements: {
            anyOf: [
              { type: "array", items: { type: "string" } },
              { type: "null" }
            ]
          },
          template: {
            anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }]
          }
        }
      },
      EnrollmentScheduleSlot: {
        type: "object",
        additionalProperties: false,
        required: ["day", "start_time", "end_time"],
        properties: {
          day: {
            type: "string",
            enum: ["lun", "mar", "mie", "jue", "vie", "sab"]
          },
          start_time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          end_time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          location: nullableString
        }
      },
      EnrollmentCreateInput: {
        type: "object",
        additionalProperties: false,
        required: ["term_id", "subject_id", "status"],
        properties: {
          term_id: uuid,
          subject_id: uuid,
          status: {
            type: "string",
            enum: ["cursando", "final_pendiente", "aprobado", "recursar"]
          },
          color: nullableString,
          notes: nullableString,
          schedule: {
            type: "array",
            items: { $ref: "#/components/schemas/EnrollmentScheduleSlot" }
          }
        }
      },
      EnrollmentUpdateInput: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["cursando", "final_pendiente", "aprobado", "recursar"]
          },
          color: nullableString,
          notes: nullableString,
          schedule: {
            type: "array",
            items: { $ref: "#/components/schemas/EnrollmentScheduleSlot" }
          }
        }
      },
      EventLink: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url"],
        properties: {
          label: { type: "string" },
          url: { type: "string", format: "uri" }
        }
      },
      EventCreateInput: {
        type: "object",
        additionalProperties: false,
        required: ["enrollment_id", "type", "starts_at"],
        properties: {
          enrollment_id: uuid,
          type: {
            type: "string",
            enum: ["parcial", "recuperatorio", "tp", "defensa", "final", "clase", "otro"]
          },
          title: nullableString,
          description: nullableString,
          starts_at: { type: "string" },
          ends_at: nullableString,
          status: nullableString,
          grade: nullableNumber,
          attempt: nullableInteger,
          links: {
            anyOf: [
              { type: "array", items: { $ref: "#/components/schemas/EventLink" } },
              { type: "null" }
            ]
          }
        }
      },
      EventUpdateInput: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["parcial", "recuperatorio", "tp", "defensa", "final", "clase", "otro"]
          },
          title: nullableString,
          description: nullableString,
          starts_at: { type: "string" },
          ends_at: nullableString,
          status: nullableString,
          grade: nullableNumber,
          attempt: nullableInteger,
          links: {
            anyOf: [
              { type: "array", items: { $ref: "#/components/schemas/EventLink" } },
              { type: "null" }
            ]
          }
        }
      }
    }
  }
});

export async function GET(request: Request) {
  return NextResponse.json(buildOpenApiSpec(new URL(request.url).origin));
}
