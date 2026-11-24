import { useLanguage } from "@/context/LanguageContext";

export default function RecentActivity() {
  const { t } = useLanguage();

  return (
    <div className="bg-surface border rounded-control p-5 shadow-e1">
      <h2 className="font-semibold text-lg mb-5">
        {t("Aktivitas terbaru", "Recent activity")}
      </h2>

      <div className="space-y-5">
        <ActivityItem
          action={t("Memindahkan card", "Moved card")}
          target="Landing Page Design"
          time={t("10 menit lalu", "10 minutes ago")}
        />

        <ActivityItem
          action={t("Mengunggah file", "Uploaded file")}
          target="company-profile-v2.pdf"
          time={t("35 menit lalu", "35 minutes ago")}
        />

        <ActivityItem
          action={t("Mengomentari", "Commented on")}
          target="Homepage Revision"
          time={t("1 jam lalu", "1 hour ago")}
        />

        <ActivityItem
          action={t("Menyelesaikan task", "Completed task")}
          target="Wireframe Mobile"
          time={t("3 jam lalu", "3 hours ago")}
        />

        <ActivityItem
          action={t("Menugaskan anggota", "Assigned member")}
          target="Product Banner"
          time={t("5 jam lalu", "5 hours ago")}
        />
      </div>
    </div>
  );
}

function ActivityItem({
  action,
  target,
  time,
}: {
  action: string;
  target: string;
  time: string;
}) {
  return (
<div className="flex gap-3 items-start">      <div className="w-2 h-2 rounded-full bg-accent-soft0 mt-2 shrink-0" />

      <div>
        <p className="text-sm">
          <span className="font-medium">
            {action}
          </span>{" "}
          {target}
        </p>

        <p className="text-xs text-fg-muted mt-1">
          {time}
        </p>
      </div>
    </div>
  );
}