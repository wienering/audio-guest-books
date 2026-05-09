type JsonLdRecord = Record<string, unknown>;

function withSchemaContext(
  data: JsonLdRecord | JsonLdRecord[],
): JsonLdRecord {
  const context = "https://schema.org";
  if (Array.isArray(data)) {
    return { "@context": context, "@graph": data };
  }
  return { "@context": context, ...data };
}

type JsonLdProps = {
  data: JsonLdRecord | JsonLdRecord[];
};

/**
 * Renders JSON-LD for search and AI crawlers. Pass one node or multiple nodes
 * (merged into @graph with a shared @context).
 */
export function JsonLd({ data }: JsonLdProps) {
  const payload = withSchemaContext(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
