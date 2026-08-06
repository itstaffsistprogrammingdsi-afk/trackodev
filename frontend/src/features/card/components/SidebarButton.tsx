interface Props {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export default function SidebarButton({ icon, label, onClick, badge }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl px-3 py-2 hover:bg-gray-100 transition text-left"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>

      {badge && (
        <div className="mt-1 ml-7 text-[11px] text-gray-500">{badge}</div>
      )}
    </button>
  );
}
