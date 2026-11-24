import { useState } from "react";

import { cn } from "@/lib/cn";
import { useLanguage } from "@/context/LanguageContext";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
  status?: "online" | "offline" | "busy" | "none";
  className?: string;
}

const sizeClasses = {
  xsmall: "h-6 w-6 text-[9px]",
  small: "h-8 w-8 text-[10px]",
  medium: "h-10 w-10 text-xs",
  large: "h-12 w-12 text-sm",
  xlarge: "h-14 w-14 text-base",
  xxlarge: "h-16 w-16 text-lg",
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5",
  small: "h-2 w-2",
  medium: "h-2.5 w-2.5",
  large: "h-3 w-3",
  xlarge: "h-3.5 w-3.5",
  xxlarge: "h-4 w-4",
};

const statusColorClasses = {
  online: "bg-success",
  offline: "bg-fg-subtle",
  busy: "bg-warning",
};

function initials(name?: string): string {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = "medium",
  status = "none",
  className,
}) => {
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-full",
        sizeClasses[size],
        className,
      )}
    >
      <span className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-line bg-surface-muted font-medium text-fg-muted">
        {showImage ? (
          <img
            src={src ?? ""}
            alt={alt ?? name ?? t("Foto profil", "Profile photo")}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{initials(name ?? alt)}</span>
        )}
      </span>

      {status !== "none" ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-surface",
            statusSizeClasses[size],
            statusColorClasses[status],
          )}
          aria-label={`Status ${status}`}
        />
      ) : null}
    </span>
  );
};

export default Avatar;
