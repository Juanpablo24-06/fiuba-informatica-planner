import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  terms: {
    listTerms: vi.fn(),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
    deleteTerm: vi.fn()
  },
  subjects: {
    listSubjects: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    deleteSubject: vi.fn()
  },
  enrollments: {
    listEnrollments: vi.fn(),
    createEnrollment: vi.fn(),
    updateEnrollment: vi.fn(),
    deleteEnrollment: vi.fn()
  },
  events: {
    listEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn()
  },
  bootstrap: {
    getBootstrapStatus: vi.fn(),
    bootstrapCbc: vi.fn()
  }
}));

vi.mock("@/lib/admin/terms", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/terms")>(
    "@/lib/admin/terms"
  );
  return {
    ...actual,
    listTerms: mocks.terms.listTerms,
    createTerm: mocks.terms.createTerm,
    updateTerm: mocks.terms.updateTerm,
    deleteTerm: mocks.terms.deleteTerm
  };
});

vi.mock("@/lib/admin/subjects", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/subjects")>(
    "@/lib/admin/subjects"
  );
  return {
    ...actual,
    listSubjects: mocks.subjects.listSubjects,
    createSubject: mocks.subjects.createSubject,
    updateSubject: mocks.subjects.updateSubject,
    deleteSubject: mocks.subjects.deleteSubject
  };
});

vi.mock("@/lib/admin/enrollments", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/enrollments")>(
    "@/lib/admin/enrollments"
  );
  return {
    ...actual,
    listEnrollments: mocks.enrollments.listEnrollments,
    createEnrollment: mocks.enrollments.createEnrollment,
    updateEnrollment: mocks.enrollments.updateEnrollment,
    deleteEnrollment: mocks.enrollments.deleteEnrollment
  };
});

vi.mock("@/lib/admin/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/events")>(
    "@/lib/admin/events"
  );
  return {
    ...actual,
    listEvents: mocks.events.listEvents,
    createEvent: mocks.events.createEvent,
    updateEvent: mocks.events.updateEvent,
    deleteEvent: mocks.events.deleteEvent
  };
});

vi.mock("@/lib/admin/bootstrap-cbc", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/bootstrap-cbc")>(
    "@/lib/admin/bootstrap-cbc"
  );
  return {
    ...actual,
    getBootstrapStatus: mocks.bootstrap.getBootstrapStatus,
    bootstrapCbc: mocks.bootstrap.bootstrapCbc
  };
});

type RequestOptions = Omit<RequestInit, "signal"> & {
  query?: Record<string, string>;
  signal?: AbortSignal | undefined;
};

const request = (path: string, init?: RequestOptions) => {
  const url = new URL(path, "https://example.com");
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      url.searchParams.set(key, value);
    }
  }
  const { query: _query, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", "Bearer test-gpt-token");
  }
  return new NextRequest(url, { ...requestInit, headers });
};

const parseJson = async <T>(response: Response): Promise<T> => response.json() as Promise<T>;

const resetMocks = () => {
  for (const group of Object.values(mocks)) {
    for (const mockFn of Object.values(group)) {
      mockFn.mockReset();
    }
  }
};

describe("custom gpt actions routes", () => {
  afterEach(() => {
    resetMocks();
    vi.resetModules();
    delete process.env.GPT_ACTIONS_BEARER_TOKEN;
  });

  it("rejects requests without the configured bearer token", async () => {
    process.env.GPT_ACTIONS_BEARER_TOKEN = "test-gpt-token";
    const route = await import("@/app/api/gpt-actions/terms/route");

    const response = await route.GET(
      request("/api/gpt-actions/terms", {
        headers: { authorization: "Bearer wrong-token" }
      })
    );

    expect(response.status).toBe(401);
    expect(await parseJson(response)).toEqual({
      ok: false,
      error: "No autorizado."
    });
    expect(mocks.terms.listTerms).not.toHaveBeenCalled();
  });

  it("lists, creates, updates and deletes terms with bearer auth", async () => {
    process.env.GPT_ACTIONS_BEARER_TOKEN = "test-gpt-token";
    mocks.terms.listTerms.mockResolvedValue([{ id: "term-1", label: "2026-1" }]);
    mocks.terms.createTerm.mockResolvedValue({ id: "term-2", label: "2026-2" });
    mocks.terms.updateTerm.mockResolvedValue({ id: "term-2", label: "2026-2" });
    mocks.terms.deleteTerm.mockResolvedValue(undefined);

    const route = await import("@/app/api/gpt-actions/terms/route");
    const byIdRoute = await import("@/app/api/gpt-actions/terms/[id]/route");

    expect(await parseJson(await route.GET(request("/api/gpt-actions/terms")))).toEqual({
      ok: true,
      terms: [{ id: "term-1", label: "2026-1" }]
    });

    expect(
      await parseJson(
        await route.POST(
          request("/api/gpt-actions/terms", {
            method: "POST",
            body: JSON.stringify({
              label: "2026-2",
              start_date: "2026-08-01",
              end_date: "2026-12-20",
              is_current: true
            }),
            headers: { "content-type": "application/json" }
          })
        )
      )
    ).toEqual({
      ok: true,
      term: { id: "term-2", label: "2026-2" }
    });

    const invalid = await route.POST(
      request("/api/gpt-actions/terms", {
        method: "POST",
        body: JSON.stringify({ label: "2026-0" }),
        headers: { "content-type": "application/json" }
      })
    );
    expect(invalid.status).toBe(400);

    expect(
      await parseJson(
        await byIdRoute.PATCH(
          request("/api/gpt-actions/terms/term-2", {
            method: "PATCH",
            body: JSON.stringify({ label: "2026-2", is_current: true }),
            headers: { "content-type": "application/json" }
          }),
          { params: { id: "term-2" } }
        )
      )
    ).toEqual({
      ok: true,
      term: { id: "term-2", label: "2026-2" }
    });

    expect(
      await parseJson(
        await byIdRoute.DELETE(
          request("/api/gpt-actions/terms/term-2", { method: "DELETE" }),
          { params: { id: "term-2" } }
        )
      )
    ).toEqual({ ok: true, deleted: true });
  });

  it("handles subjects, enrollments and events through the same bearer-protected surface", async () => {
    process.env.GPT_ACTIONS_BEARER_TOKEN = "test-gpt-token";
    mocks.subjects.listSubjects.mockResolvedValue([{ id: "subject-1", name: "Algebra" }]);
    mocks.subjects.createSubject.mockResolvedValue({
      id: "subject-2",
      name: "Análisis Matemático"
    });
    mocks.subjects.updateSubject.mockResolvedValue({
      id: "subject-2",
      name: "Análisis Matemático"
    });
    mocks.subjects.deleteSubject.mockResolvedValue(undefined);

    mocks.enrollments.listEnrollments.mockResolvedValue([
      { id: "enrollment-1", status: "cursando" }
    ]);
    mocks.enrollments.createEnrollment.mockResolvedValue({
      id: "enrollment-2",
      status: "cursando"
    });
    mocks.enrollments.updateEnrollment.mockResolvedValue({
      id: "enrollment-2",
      status: "aprobado"
    });
    mocks.enrollments.deleteEnrollment.mockResolvedValue(undefined);

    mocks.events.listEvents.mockResolvedValue([{ id: "event-1", type: "parcial" }]);
    mocks.events.createEvent.mockResolvedValue({ id: "event-2", type: "final" });
    mocks.events.updateEvent.mockResolvedValue({ id: "event-2", type: "final" });
    mocks.events.deleteEvent.mockResolvedValue(undefined);

    const subjectsRoute = await import("@/app/api/gpt-actions/subjects/route");
    const subjectByIdRoute = await import("@/app/api/gpt-actions/subjects/[id]/route");
    const enrollmentsRoute = await import("@/app/api/gpt-actions/enrollments/route");
    const enrollmentByIdRoute = await import("@/app/api/gpt-actions/enrollments/[id]/route");
    const eventsRoute = await import("@/app/api/gpt-actions/events/route");
    const eventByIdRoute = await import("@/app/api/gpt-actions/events/[id]/route");

    expect(
      await parseJson(await subjectsRoute.GET(request("/api/gpt-actions/subjects")))
    ).toEqual({
      ok: true,
      subjects: [{ id: "subject-1", name: "Algebra" }]
    });
    expect(
      await parseJson(
        await subjectsRoute.POST(
          request("/api/gpt-actions/subjects", {
            method: "POST",
            body: JSON.stringify({ name: "Análisis Matemático" }),
            headers: { "content-type": "application/json" }
          })
        )
      )
    ).toEqual({
      ok: true,
      subject: { id: "subject-2", name: "Análisis Matemático" }
    });
    expect(
      await parseJson(
        await subjectByIdRoute.PATCH(
          request("/api/gpt-actions/subjects/subject-2", {
            method: "PATCH",
            body: JSON.stringify({ name: "Análisis Matemático" }),
            headers: { "content-type": "application/json" }
          }),
          { params: { id: "subject-2" } }
        )
      )
    ).toEqual({
      ok: true,
      subject: { id: "subject-2", name: "Análisis Matemático" }
    });
    expect(
      await parseJson(
        await subjectByIdRoute.DELETE(
          request("/api/gpt-actions/subjects/subject-2", { method: "DELETE" }),
          { params: { id: "subject-2" } }
        )
      )
    ).toEqual({ ok: true, deleted: true });

    expect(
      await parseJson(
        await enrollmentsRoute.GET(
          request("/api/gpt-actions/enrollments", { query: { termId: "term-1" } })
        )
      )
    ).toEqual({
      ok: true,
      termId: "term-1",
      enrollments: [{ id: "enrollment-1", status: "cursando" }]
    });
    expect(
      await parseJson(
        await enrollmentsRoute.POST(
          request("/api/gpt-actions/enrollments", {
            method: "POST",
            body: JSON.stringify({
              term_id: "11111111-1111-4111-8111-111111111111",
              subject_id: "22222222-2222-4222-8222-222222222222",
              status: "cursando"
            }),
            headers: { "content-type": "application/json" }
          })
        )
      )
    ).toEqual({
      ok: true,
      enrollment: { id: "enrollment-2", status: "cursando" }
    });
    expect(
      await parseJson(
        await enrollmentByIdRoute.PATCH(
          request("/api/gpt-actions/enrollments/enrollment-2", {
            method: "PATCH",
            body: JSON.stringify({ status: "aprobado" }),
            headers: { "content-type": "application/json" }
          }),
          { params: { id: "enrollment-2" } }
        )
      )
    ).toEqual({
      ok: true,
      enrollment: { id: "enrollment-2", status: "aprobado" }
    });
    expect(
      await parseJson(
        await enrollmentByIdRoute.DELETE(
          request("/api/gpt-actions/enrollments/enrollment-2", { method: "DELETE" }),
          { params: { id: "enrollment-2" } }
        )
      )
    ).toEqual({ ok: true, deleted: true });

    expect(
      await parseJson(
        await eventsRoute.GET(
          request("/api/gpt-actions/events", {
            query: { termId: "term-1", enrollmentId: "enrollment-1" }
          })
        )
      )
    ).toEqual({
      ok: true,
      termId: "term-1",
      enrollmentId: "enrollment-1",
      events: [{ id: "event-1", type: "parcial" }]
    });
    expect(
      await parseJson(
        await eventsRoute.POST(
          request("/api/gpt-actions/events", {
            method: "POST",
            body: JSON.stringify({
              enrollment_id: "11111111-1111-4111-8111-111111111111",
              type: "final",
              starts_at: "2026-12-01T10:00:00.000Z"
            }),
            headers: { "content-type": "application/json" }
          })
        )
      )
    ).toEqual({
      ok: true,
      event: { id: "event-2", type: "final" }
    });
    expect(
      await parseJson(
        await eventByIdRoute.PATCH(
          request("/api/gpt-actions/events/event-2", {
            method: "PATCH",
            body: JSON.stringify({ type: "final" }),
            headers: { "content-type": "application/json" }
          }),
          { params: { id: "event-2" } }
        )
      )
    ).toEqual({
      ok: true,
      event: { id: "event-2", type: "final" }
    });
    expect(
      await parseJson(
        await eventByIdRoute.DELETE(
          request("/api/gpt-actions/events/event-2", { method: "DELETE" }),
          { params: { id: "event-2" } }
        )
      )
    ).toEqual({ ok: true, deleted: true });
  });

  it("exposes a full admin snapshot and bootstrap controls with bearer auth", async () => {
    process.env.GPT_ACTIONS_BEARER_TOKEN = "test-gpt-token";
    mocks.terms.listTerms.mockResolvedValue([
      { id: "term-1", label: "2026-1", is_current: true }
    ]);
    mocks.subjects.listSubjects.mockResolvedValue([{ id: "subject-1", name: "Algebra" }]);
    mocks.enrollments.listEnrollments.mockResolvedValue([
      { id: "enrollment-1", status: "cursando" }
    ]);
    mocks.events.listEvents.mockResolvedValue([{ id: "event-1", type: "parcial" }]);
    mocks.bootstrap.getBootstrapStatus.mockResolvedValue({
      loaded: false,
      term: "2023-0",
      term_id: null,
      approved: 0,
      total: 1,
      missing: 1,
      subjects: [{ id: "subject-1", name: "Algebra", code: null, cycle: null, type: null }]
    });
    mocks.bootstrap.bootstrapCbc.mockResolvedValue({ ok: true, created: 1 });

    const snapshotRoute = await import("@/app/api/gpt-actions/admin/snapshot/route");
    const bootstrapRoute = await import("@/app/api/gpt-actions/admin/bootstrap-cbc/route");

    expect(await parseJson(await snapshotRoute.GET(request("/api/gpt-actions/admin/snapshot")))).toEqual({
      ok: true,
      snapshot: {
        current_term: { id: "term-1", label: "2026-1", is_current: true },
        counts: {
          terms: 1,
          subjects: 1,
          current_term_enrollments: 1,
          current_term_events: 1
        },
        terms: [{ id: "term-1", label: "2026-1", is_current: true }],
        subjects: [{ id: "subject-1", name: "Algebra" }],
        current_term_enrollments: [{ id: "enrollment-1", status: "cursando" }],
        current_term_events: [{ id: "event-1", type: "parcial" }],
        bootstrap_cbc: {
          loaded: false,
          approved: 0,
          total: 1,
          missing: 1,
          term: "2023-0"
        }
      }
    });
    expect(mocks.enrollments.listEnrollments).toHaveBeenCalledWith("term-1");
    expect(mocks.events.listEvents).toHaveBeenCalledWith({ termId: "term-1" });

    expect(
      await parseJson(
        await bootstrapRoute.GET(request("/api/gpt-actions/admin/bootstrap-cbc"))
      )
    ).toEqual({
      ok: true,
      status: {
        loaded: false,
        term: "2023-0",
        term_id: null,
        approved: 0,
        total: 1,
        missing: 1,
        subjects: [{ id: "subject-1", name: "Algebra", code: null, cycle: null, type: null }]
      }
    });
    expect(
      await parseJson(
        await bootstrapRoute.POST(
          request("/api/gpt-actions/admin/bootstrap-cbc", { method: "POST" })
        )
      )
    ).toEqual({
      ok: true,
      result: { ok: true, created: 1 }
    });
  });
});
