import { describe, expect, it } from "vitest";
import {
  JsonAnswerStreamDecoder,
  JsonStringFieldStreamDecoder,
  parseChatStreamBuffer
} from "@/lib/chat/streaming";

describe("chat streaming protocol", () => {
  it("extracts streamed JSON string fields without exposing JSON syntax", () => {
    const analysis = new JsonStringFieldStreamDecoder("analysis_summary");
    const answer = new JsonAnswerStreamDecoder();
    const chunks = [
      '{"analysis_summary":"Consulté ',
      'la agenda.","answer":"Tenés un ',
      'parcial el martes.\\nPrepará el tema 2.","warnings":[]}'
    ];

    expect(chunks.map((chunk) => analysis.push(chunk)).join("")).toBe("Consulté la agenda.");
    expect(chunks.map((chunk) => answer.push(chunk)).join("")).toBe(
      "Tenés un parcial el martes.\nPrepará el tema 2."
    );
  });

  it("keeps an incomplete NDJSON event as remainder", () => {
    const parsed = parseChatStreamBuffer(
      '{"type":"status","status":"pensando"}\n{"type":"answer_delta"'
    );
    expect(parsed.events).toEqual([{ type: "status", status: "pensando" }]);
    expect(parsed.remainder).toBe('{"type":"answer_delta"');
  });
});
