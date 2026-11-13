"use client";

import { useState } from "react";
import { ArchiveRestore, Inbox, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { CourseSubject } from "@/lib/courses/catalog";

export function CourseTrashDialog({
  open,
  onOpenChange,
  subjects,
  onRestore
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: CourseSubject[];
  onRestore: (subject: CourseSubject) => Promise<void>;
}) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = async (subject: CourseSubject) => {
    if (restoringId) return;
    setRestoringId(subject.id);
    setError(null);
    try {
      await onRestore(subject);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "No se pudo restaurar la materia.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82svh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/65 bg-surface-2 text-muted"><Trash2 className="h-4 w-4" /></div>
            <div>
              <DialogTitle>Papelera</DialogTitle>
              <DialogDescription className="mt-1">Las materias archivadas no aparecen en Cursos ni en Mapa. Sus datos y relaciones quedan guardados.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[52svh] overflow-y-auto px-5 py-4 sm:px-7">
          {subjects.length > 0 ? (
            <ul className="divide-y divide-border/45">
              {subjects.map((subject) => (
                <li key={subject.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-text">{subject.name}</p><p className="mt-1 text-xs text-muted">{subject.code ?? "Sin código"}{subject.term_suggested ? ` · Período ${subject.term_suggested}` : ""}</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => restore(subject)} disabled={Boolean(restoringId)}>{restoringId === subject.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />}Restaurar</Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid place-items-center gap-2 py-10 text-center"><Inbox className="h-7 w-7 text-muted/70" /><p className="text-sm text-muted">La papelera está vacía.</p></div>
          )}
          {error ? <p className="mt-4 text-xs text-rose-300" role="alert">{error}</p> : null}
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-4 sm:px-7"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
