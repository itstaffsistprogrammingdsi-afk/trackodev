export interface NotificationData {
  card_id?: string;
  board_id?: string;
  campaign_id?: string;
  workspace_id?: string;
  assigned_by?: string;
  submission_id?: string;
  source_division_ids?: string[];
  cross_division?: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: NotificationData | null;
  action_url?: string | null;
  action_label?: string | null;
  is_read: boolean;
  created_at: string;
}

export function getNotificationTargetPath(notification: AppNotification): string | null {
  if (
    typeof notification.action_url === "string" &&
    notification.action_url.startsWith("/") &&
    !notification.action_url.startsWith("//")
  ) {
    return notification.action_url;
  }

  const { workspace_id: workspaceId, campaign_id: campaignId, card_id: cardId } =
    notification.data ?? {};

  if (!workspaceId || !campaignId) return null;

  const campaignPath = `/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(
    campaignId,
  )}`;

  if (!cardId) return campaignPath;

  return `${campaignPath}/boards?card=${encodeURIComponent(cardId)}`;
}
