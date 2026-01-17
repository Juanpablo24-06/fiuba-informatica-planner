import { Badge } from "@/components/ui/badge";

const STATUS = [
  { id: "cursando", label: "Cursando", className: "bg-accent/10 text-accent" },
  { id: "final_pendiente", label: "Final pendiente", className: "bg-warning/10 text-warning" },
  { id: "aprobado", label: "Aprobado", className: "bg-success/10 text-success" },
  { id: "recursar", label: "Recursar", className: "bg-danger/10 text-danger" }
];

export default function MapLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS.map((status) => (
        <Badge key={status.id} className={status.className}>
          {status.label}
        </Badge>
      ))}
    </div>
  );
}
