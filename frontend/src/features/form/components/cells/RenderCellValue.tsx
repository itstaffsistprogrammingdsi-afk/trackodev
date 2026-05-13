export default function RenderCellValue({
  value,
  compact = false,
}: {
  value: unknown;
  compact?: boolean;
}) {
  if (!value) return <span className="text-xs text-gray-400">-</span>;

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((v, i) => (
          <RenderCellValue key={i} value={v} compact={compact} />
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <pre className="max-w-[240px] overflow-auto rounded-xl bg-gray-100 p-3 text-xs text-gray-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const str = String(value);

  const isUrl = str.startsWith("http");
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(str);
  const isVideo = /\.(mp4|webm|ogg)$/i.test(str);
  const isFile = /\.(pdf|doc|docx|xls|xlsx|zip)$/i.test(str);

  const fileUrl = isUrl
    ? str
    : `http://localhost:8000/storage/${str}`;

  if (isImage) {
    return (
      <img
        src={fileUrl}
        className={`rounded-xl border object-cover ${
          compact ? "h-14 w-14" : "h-24 w-24"
        }`}
      />
    );
  }

  if (isVideo) {
    return compact ? (
      <span className="text-xs">Video</span>
    ) : (
      <video controls className="max-h-48 rounded-xl border">
        <source src={fileUrl} />
      </video>
    );
  }

  if (isFile) {
    return <a href={fileUrl}>File</a>;
  }

  if (isUrl) {
    return <a href={fileUrl}>Open</a>;
  }

  return <div className="text-sm">{str}</div>;
}