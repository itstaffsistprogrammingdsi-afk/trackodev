import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg"; // 🔥 tambah variasi
  variant?: "primary" | "outline" | "ghost";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean; // 🔥 loading state
  fullWidth?: boolean; // 🔥 responsive full width
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  loading = false,
  fullWidth = false,
  className = "",
  disabled = false,
  type = "button",
  ...props
}) => {
  // 🔥 SIZE (responsive friendly)
  const sizeClasses = {
    xs: "px-3 py-1.5 text-xs",
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  // 🔥 VARIANT (LIGHT + DARK MODE)
  const variantClasses = {
    primary: `
      bg-brand-500 text-white
      hover:bg-brand-600
      dark:bg-brand-500 dark:hover:bg-brand-400
      disabled:bg-brand-300 dark:disabled:bg-brand-800
    `,
    outline: `
      bg-white text-gray-700 ring-1 ring-gray-300
      hover:bg-gray-50
      dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700
      dark:hover:bg-gray-700
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
      dark:text-gray-300 dark:hover:bg-gray-800
    `,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-brand-500/50
        ${fullWidth ? "w-full" : ""}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled || loading ? "cursor-not-allowed opacity-60" : ""}
        ${className}
      `}
      {...props}
    >
      {/* 🔥 LOADING */}
      {loading && (
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      )}

      {/* ICON START */}
      {!loading && startIcon && (
        <span className="flex items-center">{startIcon}</span>
      )}

      {/* TEXT */}
      <span className="truncate">{children}</span>

      {/* ICON END */}
      {!loading && endIcon && (
        <span className="flex items-center">{endIcon}</span>
      )}
    </button>
  );
};

export default Button;