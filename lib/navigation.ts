export const resolveMobileSectionHref = <
  THref extends string,
  TSubHref extends string
>({
  href,
  pathname,
  subItemHrefs
}: {
  href: THref;
  pathname?: string | null;
  subItemHrefs?: readonly TSubHref[];
}): THref | TSubHref => {
  if (!subItemHrefs?.length) return href;

  const activeSubItem = subItemHrefs.find((subHref) => pathname?.startsWith(subHref));
  return activeSubItem ?? subItemHrefs[0] ?? href;
};
