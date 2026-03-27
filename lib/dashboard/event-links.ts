import type { EventLink } from "@/lib/types";

export type EventLinkDraft = {
  label: string;
  url: string;
};

export const getPrimaryEventLinkDraft = (
  links: EventLink[] | null | undefined
): EventLinkDraft => {
  const primary = links?.[0];
  return {
    label: primary?.label ?? "",
    url: primary?.url ?? ""
  };
};

export const mergeEventLinks = ({
  existingLinks,
  label,
  url
}: {
  existingLinks?: EventLink[] | null;
  label: string;
  url: string;
}): EventLink[] | null => {
  const trimmedUrl = url.trim();
  const trimmedLabel = label.trim() || "Material";
  const preservedLinks = Array.isArray(existingLinks) ? existingLinks.slice(1) : [];

  if (!trimmedUrl) {
    return preservedLinks.length > 0 ? preservedLinks : null;
  }

  return [
    {
      label: trimmedLabel,
      url: trimmedUrl
    },
    ...preservedLinks
  ];
};
