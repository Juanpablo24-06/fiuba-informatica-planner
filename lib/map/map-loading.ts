export const MAP_LOADING_FLOW_NODES = [
  { id: "n1", x: 72, y: 112, width: 140, height: 74, delay: "0s" },
  { id: "n2", x: 286, y: 72, width: 164, height: 82, delay: "0.08s" },
  { id: "n3", x: 548, y: 54, width: 154, height: 78, delay: "0.16s" },
  { id: "n4", x: 800, y: 94, width: 132, height: 70, delay: "0.24s" },
  { id: "n5", x: 266, y: 236, width: 152, height: 76, delay: "0.12s" },
  { id: "n6", x: 520, y: 234, width: 164, height: 80, delay: "0.2s" },
  { id: "n7", x: 774, y: 220, width: 148, height: 78, delay: "0.28s" }
] as const;

export const MAP_LOADING_FLOW_PATHS = [
  "M 212 148 C 248 148, 252 124, 286 114",
  "M 450 114 C 492 114, 500 104, 548 94",
  "M 702 94 C 740 94, 756 112, 800 128",
  "M 376 154 C 376 188, 336 198, 332 236",
  "M 624 132 C 624 176, 604 194, 602 234",
  "M 418 274 C 468 274, 482 274, 520 274",
  "M 684 274 C 724 274, 742 268, 774 258",
  "M 376 274 C 462 332, 612 332, 774 258"
] as const;

export const getMapLoadingNodeTint = (index: number) => {
  if (index % 3 === 0) return "rgb(var(--color-accent))";
  if (index % 3 === 1) return "rgb(var(--color-accent-2))";
  return "rgb(var(--color-accent-3))";
};
