export const SYSTEM_DEFAULT_RETAIL_INVITATION = {
  subjectTemplate: "{{company_name}} has uploaded your audio guest book files",
  bodyTemplate: `Hi {{client_first_name}},

Great news — {{company_name}} has created your audio guest book gallery from your {{event_type}}.

{{retail_url}}

On this page you'll be able to listen to and download the memories to your device. If you have any questions, feel free to reply to this email or contact {{company_name}} directly.`,
} as const;

/** Merge fields supported in templates; unknown {{keys}} are left unchanged. */
export const KNOWN_MERGE_FIELD_KEYS = [
  "client_first_name",
  "client_full_name",
  "company_name",
  "event_name",
  "event_type",
  "event_date",
  "retail_url",
] as const;

export type KnownMergeFieldKey = (typeof KNOWN_MERGE_FIELD_KEYS)[number];

export type RetailInvitationMergeValues = Record<string, string>;

export function clientFirstNameFromFullName(full: string): string {
  const t = full.trim();
  if (!t) return "";
  const [first] = t.split(/\s+/);
  return first ?? t;
}

export function eventTypeMergeLabel(
  eventType: string,
  eventTypeOther: string | null
): string {
  if (eventType === "other" && eventTypeOther?.trim()) {
    return eventTypeOther.trim().toLowerCase();
  }
  switch (eventType) {
    case "wedding":
      return "wedding";
    case "birthday":
      return "birthday party";
    case "corporate":
      return "corporate event";
    case "anniversary":
      return "anniversary";
    default:
      return eventType === "other" ? "event" : eventType;
  }
}

export function formatEventDateForMerge(eventDate: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(eventDate);
}

export function buildRetailInvitationMergeValues(input: {
  companyName: string;
  retailClientName: string;
  eventName: string;
  eventType: string;
  eventTypeOther: string | null;
  eventDate: Date;
  /** Precomputed on the server with `buildRetailEventPublicUrl`. */
  retailUrl: string;
}): RetailInvitationMergeValues {
  return {
    client_first_name: clientFirstNameFromFullName(input.retailClientName),
    client_full_name: input.retailClientName.trim(),
    company_name: input.companyName,
    event_name: input.eventName,
    event_type: eventTypeMergeLabel(input.eventType, input.eventTypeOther),
    event_date: formatEventDateForMerge(input.eventDate),
    retail_url: input.retailUrl,
  };
}

export function substituteMergeFields(
  template: string,
  values: RetailInvitationMergeValues
): string {
  return template.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (full, key: string) => {
      const v = values[key];
      return v !== undefined ? v : full;
    }
  );
}

export function mergeFieldSampleValues(): RetailInvitationMergeValues {
  return {
    client_first_name: "Sarah",
    client_full_name: "Sarah Smith",
    company_name: "Photobooth Guys",
    event_name: "Smith Wedding 2026",
    event_type: "wedding",
    event_date: "April 28, 2026",
    retail_url: "https://photoboothguys.audioguestbooks.ca/sarah-smith",
  };
}

export const MERGE_FIELDS_UI: {
  key: KnownMergeFieldKey;
  label: string;
  sample: string;
}[] = [
  { key: "client_first_name", label: "Client first name", sample: "Sarah" },
  {
    key: "client_full_name",
    label: "Client full name",
    sample: "Sarah Smith",
  },
  {
    key: "company_name",
    label: "Company name",
    sample: "Photobooth Guys",
  },
  { key: "event_name", label: "Event name", sample: "Smith Wedding 2026" },
  { key: "event_type", label: "Event type", sample: "wedding" },
  { key: "event_date", label: "Event date", sample: "April 28, 2026" },
  {
    key: "retail_url",
    label: "Retail URL",
    sample: "https://photoboothguys.audioguestbooks.ca/sarah-smith",
  },
];
