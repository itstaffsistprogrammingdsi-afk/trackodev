import { FC } from "react";

interface FileInputProps {
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileInput: FC<FileInputProps> = ({ className, onChange }) => {
  return (
    <input
      type="file"
      className={`h-10 w-full cursor-pointer overflow-hidden rounded-control border border-line-strong bg-surface text-sm text-fg-muted transition-colors file:mr-4 file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-line file:bg-surface-muted/60 file:px-3 file:py-2.5 file:text-xs file:font-medium file:text-fg-muted hover:file:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${className ?? ""}`}
      onChange={onChange}
    />
  );
};

export default FileInput;
