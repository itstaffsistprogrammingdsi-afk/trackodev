interface Props {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export default function SidebarButton({ icon, label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full h-11 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center gap-3 px-4 text-sm font-medium text-gray-700"
    >
      {icon}
      {label}
    </button>
  );
}
