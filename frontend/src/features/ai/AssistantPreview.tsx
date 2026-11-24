import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, ChevronRight, FlaskConical, Moon, Play, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import JellyMascot from "./JellyMascot";
import type { MascotState } from "./JellyMascot";
import AssistantDrawer from "./AssistantDrawer";
import type { AssistantMessage } from "./AssistantDrawer";

const states: { id: MascotState; title: string; titleEn: string; description: string; descriptionEn: string; detail: string; detailEn: string }[] = [
  { id: "idle", title: "Santai", titleEn: "Relaxed", description: "Melayang & berkedip", descriptionEn: "Floating & blinking", detail: "Selalu hadir, tanpa mengganggu. Gerakan lembut dan kedipan membuat Tracko terasa hidup.", detailEn: "Always present, never in the way. Gentle motion and blinking make Tracko feel alive." },
  { id: "greeting", title: "Menyapa", titleEn: "Greeting", description: "Lambaian kecil", descriptionEn: "A little wave", detail: "Sambutan ramah saat Anda mendekat. Coba arahkan kursor atau fokuskan tombol maskot dengan keyboard.", detailEn: "A friendly welcome when you come closer. Try hovering or focusing the mascot button with the keyboard." },
  { id: "open", title: "Siap membantu", titleEn: "Ready to help", description: "Wajah antusias", descriptionEn: "Enthusiastic face", detail: "Drawer terbuka, Tracko siap mendengarkan. Dua simpul di antenanya melambangkan kolaborasi.", detailEn: "Drawer open, Tracko is ready to listen. The two nodes on its antenna symbolize collaboration." },
  { id: "thinking", title: "Berpikir", titleEn: "Thinking", description: "Titik & antena berdenyut", descriptionEn: "Dots & pulsing antenna", detail: "Saat request berlangsung, titik di visor bergerak bergantian. Animasi tidak menghasilkan panggilan AI tambahan.", detailEn: "During a request, the dots on the visor alternate. The animation does not make extra AI calls." },
  { id: "success", title: "Jawaban siap", titleEn: "Answer ready", description: "Pantulan & senyum", descriptionEn: "Bounce & smile", detail: "Pantulan singkat ketika jawaban diterima. Ini berarti jawaban siap dibaca, bukan pekerjaan telah dijalankan.", detailEn: "A quick bounce when the answer arrives. It means the answer is ready to read, not that the work has been done." },
  { id: "error", title: "Ada kendala", titleEn: "Something's wrong", description: "Ekspresi & lampu amber", descriptionEn: "Expression & amber light", detail: "Ekspresi tenang saat koneksi gagal. Tidak ada gerakan error berulang atau tanda seolah pekerjaan berhasil.", detailEn: "A calm expression when the connection fails. No repeated error motion or signs implying the work succeeded." },
];

export default function AssistantPreview() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
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
      setMessages((previous) => [...previous, { role: "assistant", content: t("Ini respons demo visual, bukan hasil AI atau pembacaan data pekerjaan.\n\nContoh checklist untuk brief sintetis:\n1. Tentukan tujuan dan hasil yang diharapkan.\n2. Siapkan bahan dan referensi.\n3. Susun langkah kerja beserta deadline.\n4. Tinjau hasil sebelum digunakan.\n\nTidak ada data pekerjaan yang diubah.", "This is a visual demo response, not AI output or a reading of work data.\n\nSample checklist for a synthetic brief:\n1. Define the goal and expected outcome.\n2. Prepare materials and references.\n3. Outline the work steps and deadlines.\n4. Review the result before use.\n\nNo work data is changed.") }]);
      setBusy(false);
      inFlight.current = false;
      selectState("success");
      timer.current = setTimeout(() => selectState("open"), 2400);
    }, 1800);
  }

  return <div className="pb-24">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-fg-subtle"><span>{t("Asisten Tracko", "Tracko Assistant")}</span><ChevronRight size={12} /><span className="font-medium text-fg-muted">{t("Studio maskot", "Mascot studio")}</span></div>
      <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft px-3 py-1.5 text-2xs font-medium text-accent"><FlaskConical size={12} /> {t("Demo visual", "Visual demo")}</span><button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("Gunakan light mode", "Use light mode") : t("Gunakan dark mode", "Use dark mode")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-fg-muted hover:text-accent dark:border-line-strong dark:bg-surface text-fg-muted">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button></div>
    </div>
    <div className="mb-7 max-w-2xl"><p className="mb-3 text-2xs font-medium text-accent text-accent">{t("Sedikit jelly. Banyak ide.", "A little jelly. A lot of ideas.")}</p><h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl text-fg">{t("Kenalan dengan teman", "Meet your new")}<br className="hidden sm:block" /> {t("kerja baru Anda", "work companion")}<span className="text-accent">.</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted dark:text-fg-subtle">{t("Robot kecil dengan kepribadian besar. Coba ekspresinya, buka drawer, dan rasakan bagaimana Tracko menemani pekerjaan Anda.", "A little robot with a big personality. Try its expressions, open the drawer, and see how Tracko keeps your work company.")}</p></div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section aria-label={t("Panggung maskot", "Mascot stage")} className="assistant-stage relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-panel border border-accent/15 bg-surface px-6 py-9 sm:min-h-[440px] dark:border-accent/20 dark:bg-surface">
        <div className="absolute left-5 top-5 flex items-center gap-2 text-2xs font-medium text-fg-subtle"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Tracko / Jelly 01</div>
        <span className="absolute right-5 top-5 rounded-full bg-surface/80 px-2.5 py-1 text-2xs font-medium text-accent dark:bg-surface-muted text-accent">{t(current.title, current.titleEn)}</span>
        <button type="button" onClick={() => { selectState("open"); setOpen(true); }} aria-label={t("Buka drawer demo dari maskot", "Open the demo drawer from the mascot")} aria-haspopup="dialog" className="h-[220px] w-[220px] rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-400 sm:h-[270px] sm:w-[270px] motion-reduce:transition-none"><JellyMascot key={revision} state={state} /></button>
        <p className="mt-1 text-xs text-fg-subtle">{t("Klik maskot untuk membuka drawer", "Click the mascot to open the drawer")}</p>
        <div className="absolute inset-x-5 bottom-5 flex items-center justify-between text-2xs text-fg-subtle"><span>{t("SVG khusus · animasi lokal", "Custom SVG · local animation")}</span><span>Indigo + cyan</span></div>
      </section>
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6 dark:border-line dark:bg-surface">
        <div className="flex items-center justify-between"><div><p className="text-2xs font-medium text-fg-subtle">{t("Ekspresi & gerakan", "Expressions & motion")}</p><h2 className="mt-1 text-lg font-semibold text-fg">{t("Satu teman, enam keadaan.", "One companion, six states.")}</h2></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-2xs text-fg-subtle dark:bg-surface-muted">01—06</span></div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">{states.map((item, index) => <button key={item.id} type="button" aria-pressed={state === item.id} onClick={() => selectState(item.id)} className={`relative rounded-card border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${state === item.id ? "border-accent/30 bg-accent-soft dark:border-accent/30 dark:bg-accent-soft/60" : "border-line hover:border-accent/20 hover:bg-surface-muted dark:border-line dark:hover:bg-surface-muted"}`}><span className="text-2xs text-fg-subtle">0{index + 1}</span>{state === item.id && <Check size={12} className="absolute right-3 top-3 text-accent" />}<span className="mt-1.5 block text-xs font-semibold text-fg">{t(item.title, item.titleEn)}</span><span className="mt-1 block text-2xs leading-relaxed text-fg-subtle">{t(item.description, item.descriptionEn)}</span></button>)}</div>
        <div className="mt-4 rounded-card bg-surface-muted p-4 dark:bg-surface-muted/60"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-fg-muted text-fg">{t(current.title, current.titleEn)}</h3><button type="button" onClick={() => selectState(state)} aria-label={t("Putar ulang animasi", "Replay animation")} className="flex min-h-8 items-center gap-1 text-2xs font-medium text-accent text-accent"><Play size={11} /> {t("Putar ulang", "Replay")}</button></div><p className="mt-1.5 text-xs leading-relaxed text-fg-muted dark:text-fg-subtle">{t(current.detail, current.detailEn)}</p></div>
      </section>
    </div>
    <div className="mt-5 flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between dark:border-line dark:bg-surface"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-success-soft text-success"><ShieldCheck size={18} /></span><div><p className="text-sm font-medium text-fg">{t("Aman untuk dicoba.", "Safe to try.")}</p><p className="mt-1 max-w-xl text-xs leading-relaxed text-fg-muted dark:text-fg-subtle">{t("Demo memakai data sintetis. Tidak memanggil model, mengirim data pekerjaan, atau menyimpan perubahan. Animasi tetap mengikuti pengaturan reduced motion perangkat.", "The demo uses synthetic data. It does not call a model, send work data, or save changes. Animations still respect the device's reduced motion setting.")}</p></div></div><button type="button" onClick={() => { selectState("open"); setOpen(true); }} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-accent px-5 py-3 text-xs font-medium text-accent-fg hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{t("Coba drawer demo", "Try the demo drawer")} <ArrowRight size={15} /></button></div>
    {!open && <button type="button" onClick={() => { selectState("open"); setOpen(true); }} className="assistant-launcher" aria-label={t("Buka drawer demo dari launcher", "Open the demo drawer from the launcher")} aria-haspopup="dialog"><span className="assistant-launcher-label">{t("Demo Tracko", "Tracko demo")}</span><JellyMascot state={state} /></button>}
    <AssistantDrawer open={open} onClose={() => setOpen(false)} state={state} serviceState="demo" messages={messages} input={input} onInputChange={setInput} onSubmit={sendDemo} busy={busy} canSend demo onReset={reset} context={<div className="rounded-control border border-accent/15 bg-accent-soft/70 px-3 py-2.5 dark:border-accent/20 dark:bg-accent-soft/50"><p className="text-2xs font-medium text-accent text-accent">{t("Konteks sintetis", "Synthetic context")}</p><p className="mt-1 text-xs font-medium">{t("Brief contoh · Kampanye peluncuran produk", "Sample brief · Product launch campaign")}</p><p className="mt-1 text-2xs text-fg-subtle">{t("Bukan card asli dari sistem.", "Not a real card from the system.")}</p></div>} />
  </div>;
}
