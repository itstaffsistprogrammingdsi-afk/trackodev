import { useEffect, useMemo, useState } from "react";

import {
  REALTIME_DATA_CHANGED_EVENT,
  type ApplicationDataChanged,
} from "@/lib/realtimeEvents";

export function useRealtimeRevision(resources?: readonly string[]): number {
  const [revision, setRevision] = useState(0);
  const resourceKey = useMemo(
    () => [...(resources ?? [])].sort().join("|"),
    [resources],
  );

  useEffect(() => {
    const acceptedResources = resourceKey
      ? new Set(resourceKey.split("|"))
      : null;
    let refreshTimer: number | undefined;

    const handleChange = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<ApplicationDataChanged>;

      if (
        acceptedResources &&
        !acceptedResources.has(event.detail.resource)
      ) {
        return;
      }

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        setRevision((current) => current + 1);
      }, 350);
    };

    window.addEventListener(REALTIME_DATA_CHANGED_EVENT, handleChange);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener(REALTIME_DATA_CHANGED_EVENT, handleChange);
    };
  }, [resourceKey]);

  return revision;
}
