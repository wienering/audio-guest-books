export type RetailBulkZip =
  | { mode: "sync"; zipUrl: string }
  | {
      mode: "async";
      zipRequestUrl: string;
      zipStatusUrl: string;
    };
