import {
  FileText,
  Link2,
  FolderOpen,
  HardDrive,
} from "lucide-react";

import type { DailyTodoResponse } from "../types";

type Props = {
  data: DailyTodoResponse;
};

export default function DailyTodoPanel({
  data,
}: Props) {
  const summary = data.summary;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Work Output Report
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Summary of uploaded files, links and storage usage
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        <ReportCard
          title="Uploaded Files"
          value={summary.uploaded_files}
          icon={<FileText size={20} />}
          color="blue"
        />

        <ReportCard
          title="Uploaded Links"
          value={summary.uploaded_links}
          icon={<Link2 size={20} />}
          color="green"
        />

        <ReportCard
          title="Total Attachments"
          value={summary.total_attachments}
          icon={<FolderOpen size={20} />}
          color="orange"
        />

        <StorageCard
          value={summary.total_storage_used_mb}
        />
      </div>

      {data.recent_attachments?.length > 0 && (
        <div className="border-t border-gray-100 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Recent Attachments
          </h3>

          <div className="space-y-3">
            {data.recent_attachments.map(
              (attachment) => (
                <a
                  key={attachment.id}
                  href={
                    attachment.file_url ||
                    attachment.link_url ||
                    "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="
                    flex items-center justify-between
                    rounded-xl border border-gray-100
                    p-4
                    transition-all
                    hover:bg-gray-50
                  "
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {attachment.file_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {attachment.card_title}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {attachment.file_size_kb} KB
                    </p>

                    <p className="text-xs text-gray-500">
                      {attachment.attachment_type}
                    </p>
                  </div>
                </a>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "orange";
}) {
  const colors = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
    },

    green: {
      bg: "bg-green-50",
      text: "text-green-600",
    },

    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
    },
  };

  return (
    <div
      className="
        flex items-center justify-between
        rounded-2xl border border-gray-100
        p-5
        transition-all
        hover:shadow-md
      "
    >
      <div className="flex items-center gap-4">
        <div
          className={`
            flex h-12 w-12 items-center justify-center
            rounded-2xl
            ${colors[color].bg}
            ${colors[color].text}
          `}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StorageCard({
  value,
}: {
  value: number;
}) {
  return (
    <div
      className="
        flex items-center justify-between
        rounded-2xl border border-gray-100
        p-5
        transition-all
        hover:shadow-md
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="
            flex h-12 w-12 items-center justify-center
            rounded-2xl
            bg-purple-50
            text-purple-600
          "
        >
          <HardDrive size={20} />
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Storage Used
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value} MB
          </p>
        </div>
      </div>
    </div>
  );
}

