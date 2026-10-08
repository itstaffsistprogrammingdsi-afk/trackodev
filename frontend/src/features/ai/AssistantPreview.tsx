import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, ChevronRight, FlaskConical, Moon, Play, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import JellyMascot from "./JellyMascot";
import type { MascotState } from "./JellyMascot";
import AssistantDrawer from "./AssistantDrawer";
import type { AssistantMessage } from "./AssistantDrawer";

const states: { id: MascotState; title: string; description: string; detail: string }[] = [
  { id: "idle", title: "Santai", description: "Melayang & berkedip", detail: "Selalu hadir, tanpa mengganggu. Gerakan lembut dan kedipan membuat Tracko terasa hidup." },
  { id: "greeting", title: "Menyapa", description: "Lambaian kecil", detail: "Sambutan ramah saat Anda mendekat. Coba arahkan kursor atau fokuskan tombol maskot dengan keyboard." },
  { id: "open", title: "Siap membantu", description: "Wajah antusias", detail: "Drawer terbuka, Tracko siap mendengarkan. Dua simpul di antenanya melambangkan kolaborasi." },
  { id: "thinking", title: "Berpikir", description: "Titik & antena berdenyut", detail: "Saat request berlangsung, titik di visor bergerak bergantian. Animasi tidak menghasilkan panggilan AI tambahan." },
  { id: "success", title: "Jawaban siap", description: "Pantulan & senyum", detail: "Pantulan singkat ketika jawaban diterima. Ini berarti jawaban siap dibaca, bukan pekerjaan telah dijalankan." },
  { id: "error", title: "Ada kendala", description: "Ekspresi & lampu amber", detail: "Ekspresi tenang saat koneksi gagal. Tidak ada gerakan error berulang atau tanda seolah pekerjaan berhasil." },
];

export default function AssistantPreview() {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<MascotState>("idle");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const current = states.find((item) => item.id === state)!;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function selectState(next: MascotState) {
    setState(next);
    setRevision((value) => value + 1);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    inFlight.current = false;
    setBusy(false);
    setInput("");
    setMessages([]);
    selectState("open");
  }

  function sendDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true;
    setMessages((previous) => [...previous, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    selectState("thinking");
    timer.current = setTimeout(() => {
      setMessages((previous) => [...previous, { role: "assistant", content: "Ini respons demo visual, bukan hasil AI atau pembacaan data pekerjaan.\n\nContoh checklist untuk brief sintetis:\n1. Tentukan tujuan dan hasil yang diharapkan.\n2. Siapkan bahan dan referensi.\n3. Susun langkah kerja beserta deadline.\n4. Tinjau hasil sebelum digunakan.\n\nTidak ada data pekerjaan yang diubah." }]);
      setBusy(false);
      inFlight.current = false;
      selectState("success");
      timer.current = setTimeout(() => selectState("open"), 2400);
    }, 1800);
  }

  return <div className="pb-24">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-slate-400"><span>Asisten Tracko</span><ChevronRight size={12} /><span className="font-medium text-slate-600 dark:text-slate-300">Studio maskot</span></div>
      <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"><FlaskConical size={12} /> Demo visual</span><button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Gunakan light mode" : "Gunakan dark mode"} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button></div>
    </div>
    <div className="mb-7 max-w-2xl"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[.24em] text-indigo-500 dark:text-indigo-300">Sedikit jelly. Banyak ide.</p><h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Kenalan dengan teman<br className="hidden sm:block" /> kerja baru Anda<span className="text-indigo-500">.</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">Robot kecil dengan kepribadian besar. Coba ekspresinya, buka drawer, dan rasakan bagaimana Tracko menemani pekerjaan Anda.</p></div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section aria-label="Panggung maskot" className="assistant-stage relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-indigo-100/70 bg-white px-6 py-9 sm:min-h-[440px] dark:border-indigo-900/40 dark:bg-slate-900">
        <div className="absolute left-5 top-5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.18em] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Tracko / Jelly 01</div>
        <span className="absolute right-5 top-5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium text-indigo-500 dark:bg-slate-800 dark:text-indigo-300">{current.title}</span>
        <button type="button" onClick={() => { selectState("open"); setOpen(true); }} aria-label="Buka drawer demo dari maskot" aria-haspopup="dialog" className="h-[220px] w-[220px] rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-400 sm:h-[270px] sm:w-[270px] motion-reduce:transition-none"><JellyMascot key={revision} state={state} /></button>
        <p className="mt-1 text-xs text-slate-400">Klik maskot untuk membuka drawer</p>
        <div className="absolute inset-x-5 bottom-5 flex items-center justify-between text-[10px] text-slate-400"><span>SVG khusus · animasi lokal</span><span>Indigo + cyan</span></div>
      </section>
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Ekspresi & gerakan</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Satu teman, enam keadaan.</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-400 dark:bg-slate-800">01—06</span></div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">{states.map((item, index) => <button key={item.id} type="button" aria-pressed={state === item.id} onClick={() => selectState(item.id)} className={`relative rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${state === item.id ? "border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/60" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"}`}><span className="text-[10px] text-slate-400">0{index + 1}</span>{state === item.id && <Check size={12} className="absolute right-3 top-3 text-indigo-500" />}<span className="mt-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-100">{item.title}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{item.description}</span></button>)}</div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">{current.title}</h3><button type="button" onClick={() => selectState(state)} aria-label="Putar ulang animasi" className="flex min-h-8 items-center gap-1 text-[10px] font-medium text-indigo-500 dark:text-indigo-300"><Play size={11} /> Putar ulang</button></div><p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{current.detail}</p></div>
      </section>
    </div>
    <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300"><ShieldCheck size={18} /></span><div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">Aman untuk dicoba.</p><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">Demo memakai data sintetis. Tidak memanggil model, mengirim data pekerjaan, atau menyimpan perubahan. Animasi tetap mengikuti pengaturan reduced motion perangkat.</p></div></div><button type="button" onClick={() => { selectState("open"); setOpen(true); }} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Coba drawer demo <ArrowRight size={15} /></button></div>
    {!open && <button type="button" onClick={() => { selectState("open"); setOpen(true); }} className="assistant-launcher" aria-label="Buka drawer demo dari launcher" aria-haspopup="dialog"><span className="assistant-launcher-label">Demo Tracko</span><JellyMascot state={state} /></button>}
    <AssistantDrawer open={open} onClose={() => setOpen(false)} state={state} serviceState="demo" messages={messages} input={input} onInputChange={setInput} onSubmit={sendDemo} busy={busy} canSend demo onReset={reset} context={<div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 dark:border-indigo-900 dark:bg-indigo-950/50"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Konteks sintetis</p><p className="mt-1 text-xs font-medium">Brief contoh · Kampanye peluncuran produk</p><p className="mt-1 text-[10px] text-slate-400">Bukan card asli dari sistem.</p></div>} />
  </div>;
}
