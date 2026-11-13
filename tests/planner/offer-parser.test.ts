import { describe, expect, it } from "vitest";
import { parseCommissionText } from "@/lib/planner/offer-parser";

const copiedOffer = `
Período lectivo: 2026 - 1er Cuatrimestre
Actividad: ÁLGEBRA LINEAL (CB002)
Comisión: CURSO: 01A
Cupo / insc.: 62 / 64
Instancias: Promoción
Ubicación: Sede Unica
Docentes: VARGAS GABRIELA (Profesor/a Adjunto/a), PALACIOS PATRICIA (Jefe/a Trabajos Practicos)
Tipo de clase\tDía\tHorario\tAula
Teórica\tLunes\t09:00 a 11:00\t403 - PC
Práctica\tLunes\t11:00 a 13:00\t403 - PC
Comisión: CURSO: 02A
Turno: Sin definir
Tipo de clase\tDía\tHorario\tAula
Teórica\tMartes\t14:00 a 16:00\t400-PC
Práctica\tJueves\t16:00 a 18:00\t400-PC
Teórico Práctica Obligatoria\tViernes\t18:30 a 22:30\t103-LH
`;

describe("parseCommissionText", () => {
  it("detecta actividad, comisiones y filas horarias del texto de FIUBA", () => {
    const preview = parseCommissionText(copiedOffer);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows[0]).toMatchObject({ activity: "ÁLGEBRA LINEAL", code: "CB002", commission: "CURSO: 01A" });
    expect(preview.rows[0].slots).toHaveLength(2);
    expect(preview.rows[1].slots[1]).toMatchObject({ day: "Jueves", startTime: "16:00", endTime: "18:00", room: "400-PC" });
    expect(preview.rows[1].slots[2]).toMatchObject({ classType: "Teórico Práctica Obligatoria", day: "Viernes", startTime: "18:30" });
  });
});
