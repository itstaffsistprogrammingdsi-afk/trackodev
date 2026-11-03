import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  BriefcaseBusiness,
  Coffee,
  DoorOpen,
  MessageCircle,
  Monitor,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { getWorkspaceMembers } from "@/features/workspace/api/workspace.api";
import { getWorkspaces } from "@/features/workspace/api/workspace.api";
import { getCampaigns } from "@/features/campaign/api/campaign.api";
import { getBoards } from "@/features/board/api/board.api";
import type { Campaign } from "@/features/campaign/types";
import type { Board } from "@/features/board/types";
import type { Workspace } from "@/features/workspace/types";
import { resolveStorageUrl } from "@/lib/storageUrl";
import type { WorkspaceMember } from "@/features/workspace/types";

type OfficeZone = "lounge" | "focus" | "meeting" | "studio";

type DeskMember = {
  id: string;
  name: string;
  avatar?: string | null;
  initials: string;
  zone: OfficeZone;
  note: string;
  x: number;
  y: number;
  color: string;
  isCurrentUser?: boolean;
};

const zoneLabels: Record<OfficeZone, string> = {
  lounge: "Lounge",
  focus: "Focus desks",
  meeting: "Meeting room",
  studio: "Project studio",
};

const zoneDescriptions: Record<OfficeZone, string> = {
  lounge: "Tempat singgah untuk menyapa dan bertukar kabar.",
  focus: "Area tenang untuk menyelesaikan pekerjaan.",
  meeting: "Meja bersama untuk diskusi tim.",
  studio: "Akses cepat ke workspace dan campaign Traco.",
};

const avatarColors = ["#718a78", "#b78262", "#71899a", "#aa8a65", "#8b7996", "#668f91"];

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function OfficeAvatar({ member, index, onClick }: { member: DeskMember; index: number; onClick: () => void }) {
  const avatarUrl = resolveStorageUrl(member.avatar);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Lihat ${member.name} di ${zoneLabels[member.zone]}`}
      title={`${member.name} · avatar ilustratif`}
      className="office-avatar absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#516c58] focus-visible:ring-offset-2"
      style={{ left: `${member.x}%`, top: `${member.y}%`, animationDelay: `${index * -1.4}s` }}
    >
      <span className="relative block h-10 w-10 overflow-hidden rounded-[15px] border-[3px] border-white bg-[#718a78] shadow-[0_3px_0_rgba(50,59,49,.17)] sm:h-12 sm:w-12 sm:rounded-[17px]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white sm:text-sm" style={{ backgroundColor: member.color }}>{member.initials}</span>}
        <span className="absolute -bottom-0.5 left-1/2 h-2 w-3 -translate-x-1/2 rounded-full bg-black/10 blur-[2px]" aria-hidden="true" />
      </span>
      <span className="mt-1 max-w-[88px] truncate rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm sm:text-[11px]">{member.isCurrentUser ? "Kamu" : member.name.split(" ")[0]}</span>
    </button>
  );
}

function Desk({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <div className="absolute z-[1]" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
      <div className="relative h-12 w-[76px] rounded-md border border-[#b89c78] bg-[#d9c4a4] shadow-[0_3px_0_#bca482] sm:h-14 sm:w-[88px]">
        <div className="absolute left-1/2 top-1.5 h-7 w-10 -translate-x-1/2 rounded border-2 border-[#5b6866] bg-[#52615f] shadow-inner sm:h-8 sm:w-12" />
        <div className="absolute left-1/2 top-2 h-5 w-9 -translate-x-1/2 rounded-sm bg-[#d7dfd1] sm:h-6 sm:w-11" />
        <div className="absolute -bottom-2 left-2 h-2 w-1 rounded bg-[#aa9274]" />
        <div className="absolute -bottom-2 right-2 h-2 w-1 rounded bg-[#aa9274]" />
      </div>
      {label && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-[#777d70]">{label}</span>}
    </div>
  );
}

export default function VirtualOfficePage() {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.roles?.includes("super_admin") ?? false;
  const hasDashboard = isSuperAdmin || can("dashboard.view");
  const homePath = hasDashboard ? "/dashboard" : "/my-work";
  const { data: divisions = [], isLoading: divisionsLoading } = useDivisions(!isSuperAdmin, true);
  const [selectedZone, setSelectedZone] = useState<OfficeZone | null>(null);
  const [selectedMember, setSelectedMember] = useState<DeskMember | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const workspaceQueries = useQueries({
    queries: divisions.map((division) => ({
      queryKey: ["workspaces", division.id],
      queryFn: () => getWorkspaces(division.id),
      enabled: !!division.id,
    })),
  });
  const workspaces = workspaceQueries.flatMap((query) => (query.data as Workspace[] | undefined) ?? []);
  const campaignQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["campaigns", workspace.id],
      queryFn: () => getCampaigns(workspace.id),
      enabled: !!workspace.id,
    })),
  });
  const campaigns = campaignQueries.flatMap((query) => (query.data as Campaign[] | undefined) ?? []);
  const boardQueries = useQueries({
    queries: campaigns.map((campaign) => ({
      queryKey: ["boards", campaign.id],
      queryFn: () => getBoards(campaign.id),
      enabled: !!campaign.id,
    })),
  });
  const boards = boardQueries.flatMap((query) => (query.data as Board[] | undefined) ?? []);
  const firstDivision = divisions[0];
  const workspacesLoading = workspaceQueries.some((query) => query.isLoading)
    || campaignQueries.some((query) => query.isLoading)
    || boardQueries.some((query) => query.isLoading);
  const firstWorkspace = workspaces[0];
  const { data: workspaceMembers = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ["workspace-members", firstWorkspace?.id],
    queryFn: () => getWorkspaceMembers(firstWorkspace!.id),
    enabled: !!firstWorkspace?.id,
  });

  const members = useMemo<DeskMember[]>(() => {
    const palette = (index: number) => avatarColors[index % avatarColors.length];
    const realMembers = workspaceMembers.slice(0, 5).map((member, index) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      initials: initialsFor(member.name),
      zone: (["focus", "focus", "meeting", "studio", "lounge"] as OfficeZone[])[index],
      note: "Anggota workspace · posisi avatar hanya ilustrasi.",
      x: ([26, 73, 36, 73, 17] as number[])[index],
      y: ([29, 29, 70, 72, 72] as number[])[index],
      color: palette(index),
    }));
    const currentUser: DeskMember = {
      id: user?.id ?? "me",
      name: user?.name ?? "Kamu",
      avatar: user?.avatar,
      initials: initialsFor(user?.name ?? "Kamu"),
      zone: "focus",
      note: "Kamu · avatar ditampilkan dari profil Traco.",
      x: 53,
      y: 29,
      color: palette(realMembers.length),
      isCurrentUser: true,
    };
    return [currentUser, ...realMembers.filter((member) => member.id !== currentUser.id)];
  }, [user?.avatar, user?.id, user?.name, workspaceMembers]);

  const projectPath = firstWorkspace
    ? `/workspaces/${firstWorkspace.id}/campaigns`
    : firstDivision
      ? `/divisions/${firstDivision.id}`
      : "/divisions";

  const selectZone = (zone: OfficeZone) => {
    setSelectedZone(zone);
    setSelectedMember(null);
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
      <style>{`
        @keyframes officeIdle { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-3px); } }
        @keyframes officePlant { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes officePulse { 0%, 100% { opacity: .55; transform: scale(.96); } 50% { opacity: 1; transform: scale(1); } }
        .office-avatar { animation: officeIdle 3.8s ease-in-out infinite; }
        .office-plant { animation: officePlant 5s ease-in-out infinite; transform-origin: bottom center; }
        .office-light { animation: officePulse 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .office-avatar, .office-plant, .office-light { animation: none !important; } }
      `}</style>

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 hidden h-10 w-10 items-center justify-center rounded-xl bg-[#e9f1e8] text-[#496451] sm:flex"><BriefcaseBusiness size={19} aria-hidden="true" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ruang kolaborasi Traco</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Virtual Office</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Pilih ruang di lantai kantor untuk membuka percakapan, tim, dan pekerjaan.</p>
          </div>
        </div>
        <Link to={homePath} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"><ArrowLeft size={16} aria-hidden="true" />Kembali ke {hasDashboard ? "Dashboard" : "My Work"}</Link>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]" aria-label="Kantor virtual">
        <div className="overflow-hidden rounded-2xl border border-[#d8ded5] bg-[#f2f1e9] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dedfd5] px-4 py-3 dark:border-slate-800 sm:px-5">
            <div><h2 className="font-semibold text-slate-900 dark:text-white">Lantai tim</h2><p className="text-xs text-slate-500">Pilih area atau avatar untuk melihat detail</p></div>
            <span className="inline-flex items-center gap-2 rounded-md border border-[#d9dfd4] bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600"><span className="office-light h-2 w-2 rounded-full bg-[#78917a]" />Demo interaktif</span>
          </div>

          <div className="p-3 sm:p-5">
            <div className="office-floor relative mx-auto h-[520px] w-full max-w-[1040px] overflow-hidden rounded-lg border-[8px] border-[#c7c9bc] bg-[#e5e2d7] shadow-[inset_0_0_0_2px_rgba(255,255,255,.55)] sm:h-[570px] sm:border-[12px] lg:h-[610px]">
              <div className="absolute inset-[3%] rounded-md border border-[#d3cdbd] bg-[#f4f0e5] shadow-[inset_0_2px_8px_rgba(109,98,75,.09)]" />
              <div className="absolute left-[3%] top-[3%] h-[6%] w-[94%] border-b-[5px] border-[#bdc9c1] bg-[#dae6df] sm:border-b-[8px]">
                <div className="absolute inset-x-[3%] top-[18%] flex h-[64%] gap-2 sm:gap-4">{[0, 1, 2, 3, 4, 5].map((item) => <span key={item} className="flex-1 rounded-sm border border-[#bdcbc2] bg-[#dce9e2] shadow-inner" />)}</div>
              </div>

              <button type="button" onClick={() => selectZone("lounge")} aria-pressed={selectedZone === "lounge"} className={`absolute left-[5%] top-[13%] h-[33%] w-[24%] rounded-md border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536d59] ${selectedZone === "lounge" ? "border-[#607b65] bg-[#e8ede2]" : "border-[#d3d6c9] bg-[#eeeee5] hover:border-[#b7c2b2]"}`}>
                <span className="absolute left-2 top-2 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#647263] sm:left-3 sm:top-3 sm:text-xs"><Coffee size={13} />Lounge</span>
                <div className="absolute left-[13%] top-[36%] h-[43%] w-[34%] rounded-[14px] border-2 border-[#a8b4a4] bg-[#c5d0bd] shadow-[0_3px_0_#aab4a3]" />
                <div className="absolute left-[53%] top-[36%] h-[43%] w-[34%] rounded-[14px] border-2 border-[#a8b4a4] bg-[#c5d0bd] shadow-[0_3px_0_#aab4a3]" />
                <div className="absolute bottom-[10%] left-1/2 h-[18%] w-[22%] -translate-x-1/2 rounded-md border border-[#b89c78] bg-[#dac8aa]" />
              </button>

              <button type="button" onClick={() => selectZone("focus")} aria-pressed={selectedZone === "focus"} className={`absolute left-[32%] top-[13%] h-[33%] w-[63%] rounded-md border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536d59] ${selectedZone === "focus" ? "border-[#607b65] bg-[#eee8d8]" : "border-[#d7d1c1] bg-[#f1ecdf] hover:border-[#c0baa9]"}`}>
                <span className="absolute left-3 top-2 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#80765f] sm:top-3 sm:text-xs"><Monitor size={13} />Focus desks</span>
                <Desk x={8} y={40} label="01" /><Desk x={39} y={40} label="02" /><Desk x={70} y={40} label="03" />
              </button>

              <button type="button" onClick={() => selectZone("meeting")} aria-pressed={selectedZone === "meeting"} className={`absolute left-[5%] top-[51%] h-[43%] w-[40%] rounded-md border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536d59] ${selectedZone === "meeting" ? "border-[#607b65] bg-[#e6eceb]" : "border-[#cbd4d2] bg-[#e9eeeb] hover:border-[#aebfba]"}`}>
                <span className="absolute left-3 top-2 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#60736f] sm:top-3 sm:text-xs"><Users size={13} />Meeting room</span>
                <div className="absolute left-[17%] top-[36%] h-[37%] w-[65%] rounded-[50%] border-2 border-[#b5c3bf] bg-[#ced9d3] shadow-[0_3px_0_#b5c3bf]" />
                {[0, 1, 2, 3].map((item) => <span key={item} className={`absolute h-3 w-3 rounded-full border border-white bg-[#a2b3aa] shadow-sm sm:h-4 sm:w-4 ${item < 2 ? "top-[28%]" : "bottom-[18%]"}`} style={{ left: item % 2 === 0 ? "35%" : "64%" }} />)}
              </button>

              <button type="button" onClick={() => selectZone("studio")} aria-pressed={selectedZone === "studio"} className={`absolute left-[48%] top-[51%] h-[43%] w-[47%] rounded-md border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536d59] ${selectedZone === "studio" ? "border-[#607b65] bg-[#f0e7dc]" : "border-[#d9cdbf] bg-[#f2ebe2] hover:border-[#c6b7a4]"}`}>
                <span className="absolute left-3 top-2 z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#826e58] sm:top-3 sm:text-xs"><BriefcaseBusiness size={13} />Project studio</span>
                <Desk x={18} y={43} label="Planning" /><Desk x={65} y={43} label="Review" />
              </button>

              <div className="office-plant absolute bottom-[7%] left-[3.5%] z-[2] h-9 w-7 sm:h-12 sm:w-9" aria-hidden="true"><div className="absolute bottom-0 left-1/2 h-4 w-5 -translate-x-1/2 rounded-b-md border border-[#b4a58d] bg-[#d0c1a8]" /><span className="absolute bottom-3 left-1/2 h-7 w-2 -translate-x-1/2 rounded-full bg-[#78917a]" /><span className="absolute bottom-5 left-1 h-4 w-4 -rotate-45 rounded-full bg-[#8ca38b]" /><span className="absolute bottom-5 right-0 h-4 w-4 rotate-45 rounded-full bg-[#6f8b73]" /></div>
              <div className="office-plant absolute bottom-[7%] right-[3.5%] z-[2] h-9 w-7 [animation-delay:-2s] sm:h-12 sm:w-9" aria-hidden="true"><div className="absolute bottom-0 left-1/2 h-4 w-5 -translate-x-1/2 rounded-b-md border border-[#b4a58d] bg-[#d0c1a8]" /><span className="absolute bottom-3 left-1/2 h-7 w-2 -translate-x-1/2 rounded-full bg-[#78917a]" /><span className="absolute bottom-5 left-1 h-4 w-4 -rotate-45 rounded-full bg-[#8ca38b]" /><span className="absolute bottom-5 right-0 h-4 w-4 rotate-45 rounded-full bg-[#6f8b73]" /></div>
              <div className="absolute bottom-[2.5%] left-[28%] h-[3%] w-[44%] rounded-t-sm border border-[#c4b89f] bg-[#ded3bd]" aria-hidden="true" />

              {members.map((member, index) => <OfficeAvatar key={member.id} member={member} index={index} onClick={() => { setSelectedMember(member); setSelectedZone(member.zone); }} />)}
              <div className="pointer-events-none absolute left-[29.5%] top-[28%] z-[15] h-[7%] w-[5%] border-r-2 border-t-2 border-dashed border-[#9da393]" aria-hidden="true" />
              <div className="pointer-events-none absolute left-[44%] top-[46%] z-[15] h-[8%] w-[5%] border-r-2 border-t-2 border-dashed border-[#9da393]" aria-hidden="true" />
              <DoorOpen className="absolute left-[47%] top-[47%] z-[16] h-4 w-4 -rotate-90 text-[#827e6e]" aria-hidden="true" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{firstWorkspace ? `${firstWorkspace.name} · anggota workspace ditampilkan` : "Belum ada workspace untuk ditampilkan."}</span>
              <span className="inline-flex items-center gap-1.5"><Armchair size={13} />Pilih area untuk pintasan</span>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Detail ruang</p><h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{selectedMember?.name ?? (selectedZone ? zoneLabels[selectedZone] : "Selamat datang")}</h2></div>{(selectedZone || selectedMember) && <button type="button" onClick={() => { setSelectedZone(null); setSelectedMember(null); }} aria-label="Tutup detail" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X size={16} /></button>}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{selectedMember?.note ?? (selectedZone ? zoneDescriptions[selectedZone] : "Klik ruangan atau avatar di denah untuk melihat orang dan pintasan yang terkait.")}</p>
            {selectedZone && <p className="mt-3 text-xs text-slate-500">{members.filter((member) => member.zone === selectedZone).length} avatar · posisi hanya ilustrasi</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Pintasan kerja</h2>
            <div className="mt-3 space-y-2">
              {can("chat.view") && <Link to="/chats" className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><MessageCircle size={17} className="text-[#607c66]" />Buka Chat<ArrowUpRight size={15} className="ml-auto text-slate-400" /></Link>}
              {(can("workspace.view") || can("campaign.view")) && <Link to={projectPath} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#607c66] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><BriefcaseBusiness size={17} className="text-[#607c66]" />{firstWorkspace ? `Buka ${firstWorkspace.name}` : "Buka Workspace"}<ArrowUpRight size={15} className="ml-auto shrink-0 text-slate-400" /></Link>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2"><Users size={17} className="text-[#607c66]" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tim</h2></div>
            {divisionsLoading || workspacesLoading ? <p className="mt-3 text-sm text-slate-500">Memuat data Traco…</p> : divisions.length ? <div className="mt-3 space-y-3">
              {divisions.map((division) => {
                const divisionWorkspaces = workspaces.filter((workspace) => workspace.division_id === division.id);
                return <div key={division.id} className="border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                  <Link to={`/divisions/${division.id}`} className="text-sm font-medium text-slate-800 hover:text-[#536d59] dark:text-slate-200">{division.name}</Link>
                  <div className="mt-1 space-y-1 pl-3">
                    {divisionWorkspaces.map((workspace) => {
                      const workspaceCampaigns = campaigns.filter((campaign) => campaign.workspace_id === workspace.id);
                      return <div key={workspace.id}>
                        <Link to={`/divisions/${division.id}`} className="text-xs text-slate-600 hover:underline dark:text-slate-400">{workspace.name}</Link>
                        {workspaceCampaigns.map((campaign) => {
                          const campaignBoards = boards.filter((board) => board.campaign_id === campaign.id);
                          const cardCount = campaignBoards.reduce((total, board) => total + board.cards.length, 0);
                          const isExpanded = selectedCampaignId === campaign.id;
                          return <div key={campaign.id} className="ml-2 mt-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                            <button type="button" onClick={() => { setSelectedCampaignId(isExpanded ? null : campaign.id); setSelectedZone("studio"); }} aria-expanded={isExpanded} className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-slate-700 hover:text-[#536d59] dark:text-slate-300"><span className="truncate">{campaign.name}</span><span className="shrink-0 text-[10px] text-slate-400">{campaignBoards.length} board · {cardCount} card</span></button>
                            {isExpanded && <div className="mt-1 space-y-1 pb-1">{campaignBoards.length ? campaignBoards.map((board) => <Link key={board.id} to={`/workspaces/${workspace.id}/campaigns/${campaign.id}/boards`} className="block rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-[#536d59] dark:hover:bg-slate-800">{board.name} · {board.cards.length} card{board.cards.length === 1 ? "" : "s"}{board.cards.slice(0, 2).map((card) => <span key={card.id} className="ml-1 text-slate-400">· {card.title}</span>)}</Link>) : <span className="block px-2 py-1 text-[11px] text-slate-400">Belum ada board.</span>}</div>}
                          </div>;
                        })}
                      </div>;
                    })}
                    {!divisionWorkspaces.length && <span className="text-[11px] text-slate-400">Belum ada workspace.</span>}
                  </div>
                </div>;
              })}
            </div> : <p className="mt-3 text-sm leading-6 text-slate-500">Belum ada data division yang dapat diakses.</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
