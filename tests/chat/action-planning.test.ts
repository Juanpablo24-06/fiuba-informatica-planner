import { describe, expect, it } from "vitest";
import { buildRequestedActions } from "@/lib/chat/action-planning";
import { inferEnrollmentActionsFromMessages, inferTermActionFromMessages, parseActionsFromRaw } from "@/lib/chat/action-inference";

describe("chat action planning", () => {
  it("maps raw action aliases into valid schema actions", () => {
    expect(
      parseActionsFromRaw([
        {
          action: "crear_cuatrimestre",
          term_label: "2026 2",
          start_date: "2026-08-01",
          end_date: "2026-12-20"
        }
      ])
    ).toEqual([
      {
        type: "create_term",
        term_label: "2026-2",
        start_date: "2026-08-01",
        end_date: "2026-12-20"
      }
    ]);
  });

  it("infers a term action from user messages", () => {
    expect(
      inferTermActionFromMessages([
        { role: "user", content: "Quiero crear el 2026-2 desde marzo de 2026 hasta julio de 2026" }
      ])
    ).toEqual([
      {
        type: "create_term",
        term_label: "2026-2",
        start_date: "2026-03-01",
        end_date: "2026-07-31",
        is_current: undefined
      }
    ]);
  });

  it("infers enrollment actions from a subject mention", () => {
    expect(
      inferEnrollmentActionsFromMessages({
        messages: [
          { role: "user", content: "Agregame Algebra A en 2026-2" }
        ],
        subjects: [
          { code: "61.01", name: "Algebra A" },
          { code: "61.02", name: "Algoritmos y Programacion I" }
        ]
      })
    ).toEqual([
      {
        type: "add_enrollment",
        term_label: "2026-2",
        subject_query: "Algebra A",
        status: "cursando"
      }
    ]);
  });

  it("does not infer actions when the model failed", () => {
    expect(
      buildRequestedActions({
        allowActions: true,
        modelSucceeded: false,
        responseActions: [],
        recentMessages: [
          { role: "user", content: "Agregame Algebra A en 2026-2" }
        ],
        subjects: [
          { code: "61.01", name: "Algebra A" }
        ]
      })
    ).toEqual([]);
  });

  it("falls back to inferred actions when the model succeeded but returned no actions", () => {
    expect(
      buildRequestedActions({
        allowActions: true,
        modelSucceeded: true,
        responseActions: [],
        recentMessages: [
          { role: "user", content: "Agregame Algebra A en 2026-2" }
        ],
        subjects: [
          { code: "61.01", name: "Algebra A" }
        ]
      })
    ).toEqual([
      {
        type: "add_enrollment",
        term_label: "2026-2",
        subject_query: "Algebra A",
        status: "cursando"
      }
    ]);
  });
});
