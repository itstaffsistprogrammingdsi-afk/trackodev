export const REALTIME_DATA_CHANGED_EVENT = "tracko:data-changed";

export interface ApplicationDataChanged {
  resource: string;
  action: "created" | "updated" | "deleted" | "restored";
  occurred_at: string;
}
