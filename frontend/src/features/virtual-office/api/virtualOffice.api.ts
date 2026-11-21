import api from "@/lib/axios";
import type { VirtualOfficeSnapshot } from "../types";

export const getVirtualOffice = async (): Promise<VirtualOfficeSnapshot> => {
  const res = await api.get("/virtual-office");
  return res.data.data;
};

export const sendPresenceHeartbeat = async (): Promise<void> => {
  await api.post("/presence/heartbeat", undefined, {
    skipErrorToast: true,
    timeout: 10_000,
  });
};
