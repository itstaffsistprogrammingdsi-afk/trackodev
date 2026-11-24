import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AvatarStackUser = {
  id: string;
  name: string;
  avatar?: string | null;
};

interface AvatarStackProps {
  users: AvatarStackUser[];
  max?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AvatarBubble({
  children,
  title,
  size,
  image,
}: {
  children?: ReactNode;
  title?: string;
  size: "xs" | "sm" | "md";
  image?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;

  return (
    <span
      title={title}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full border border-surface bg-surface-muted font-semibold text-fg-muted ring-2 ring-surface",
        sizeClasses[size],
      )}
    >
      {showImage ? (
        <img
          src={image ?? ""}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        children
      )}
    </span>
  );
}

export default function AvatarStack({
  users,
  max = 4,
  size = "sm",
  className,
  label,
}: AvatarStackProps) {
  if (users.length === 0) return null;

  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={label ?? `${users.length} anggota`}
    >
      <div className="flex -space-x-2">
        {shown.map((user) => (
          <AvatarBubble
            key={`${user.id}-${user.avatar ?? "initial"}`}
            title={user.name}
            size={size}
            image={user.avatar}
          >
            {initials(user.name)}
          </AvatarBubble>
        ))}

        {extra > 0 ? (
          <span
            className={cn(
              "relative inline-flex items-center justify-center rounded-full border border-line bg-surface-muted font-semibold text-fg-subtle ring-2 ring-surface",
              sizeClasses[size],
            )}
            title={`${extra} anggota lainnya`}
          >
            +{extra}
          </span>
        ) : null}
      </div>
    </div>
  );
}
