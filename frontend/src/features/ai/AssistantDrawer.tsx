import { useEffect, useId, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowUpRight, Check, FileText, ListChecks, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import JellyMascot from "./JellyMascot";
import type { MascotState } from "./JellyMascot";
import { normalizeAssistantText } from "./assistant";

export type AssistantProposal = {
  id: string;
  operation: string;
  status: "pending" | "executing" | "approved" | "rejected" | "failed" | "stale" | "expired";
  target: { type?: string; id?: string; title?: string };
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  expires_at: string;
};
export type AssistantMessage = { role: "user" | "assistant"; content: string; proposal?: AssistantProposal };
export type AssistantServiceState = "checking" | "configured" | "needs_key" | "unavailable" | "error" | "demo";

const suggestions = [
  { title: "Rapikan brief", titleEn: "Tidy up the brief", description: "Tujuan, hasil, dan langkah yang jelas", descriptionEn: "Clear goals, outcomes, and steps", prompt: "Bantu susun brief pekerjaan yang jelas.", promptEn: "Help me draft a clear work brief.", icon: FileText },
  { title: "Susun checklist", titleEn: "Build a checklist", description: "Pecah pekerjaan menjadi langkah kecil", descriptionEn: "Break work into small steps", prompt: "Buat usulan checklist langkah kerja.", promptEn: "Create a proposed checklist of work steps.", icon: ListChecks },
  { title: "Lihat risiko deadline", titleEn: "Review deadline risks", description: "Ringkas status dari card yang dipilih", descriptionEn: "Summarize the status of the selected card", prompt: "Ringkas status card dan risiko deadline berdasarkan data yang tersedia.", promptEn: "Summarize the card status and deadline risks based on the available data.", icon: Sparkles },
];

const serviceLabels: Record<AssistantServiceState, string> = {
  checking: "Memeriksa konfigurasi", configured: "Gateway dikonfigurasi", needs_key: "Key gateway belum diisi", unavailable: "AI belum tersedia", error: "Koneksi perlu diperiksa", demo: "Demo visual · tanpa layanan AI",
};

const serviceLabelsEn: Record<AssistantServiceState, string> = {
  checking: "Checking configuration", configured: "Gateway configured", needs_key: "Gateway key not set", unavailable: "AI not available yet", error: "Connection needs checking", demo: "Visual demo · no AI service",
};

type Props = {
  open: boolean;
  onClose: () => void;
  state: MascotState;
  serviceState: AssistantServiceState;
  messages: AssistantMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean;
  canSend?: boolean;
  error?: string;
  context?: ReactNode;
  onReset: () => void;
  demo?: boolean;
  footer?: ReactNode;
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
  proposalBusyId?: string;
  proposalError?: string;
};

export default function AssistantDrawer({ open, onClose, state, serviceState, messages, input, onInputChange, onSubmit, busy = false, canSend = false, error, context, onReset, demo = false, footer, onApproveProposal, onRejectProposal, proposalBusyId, proposalError }: Props) {
  const { t } = useLanguage();
  const headingId = useId();
  const inputId = useId();
  const panel = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const previousInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (root) root.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector<HTMLButtonElement>(".assistant-launcher")?.focus();
    };
  }, [open]);

  useEffect(() => {
    const area = scroll.current;
    if (area) area.scrollTo({ top: messages.length || busy ? area.scrollHeight : 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100001] flex justify-end">
      <div aria-hidden="true" className="assistant-backdrop absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headingId} className="assistant-drawer relative flex h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden border-l border-line bg-surface text-fg shadow-e3 outline-none ">
        <header className="shrink-0 border-b border-line bg-surface px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-line ">
          <div className="flex items-start gap-3">
            <div className="-ml-2 -mt-2 h-[72px] w-[68px] shrink-0"><JellyMascot state={state} /></div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-2xs font-medium text-accent dark:text-accent">{demo ? t("Demo visual", "Visual demo") : t("Teman kerja Anda", "Your work companion")}</p>
              <h2 id={headingId} className="mt-1 text-base font-semibold tracking-heading">{t("Asisten Tracko", "Tracko Assistant")}<span className="ml-1 text-accent">.</span></h2>
              <p className="mt-1 flex items-center gap-1.5 text-2xs text-fg-muted dark:text-fg-subtle"><span className={`h-1.5 w-1.5 rounded-full ${serviceState === "configured" || demo ? "bg-success" : "bg-warning"}`} />{t(serviceLabels[serviceState], serviceLabelsEn[serviceState])}</p>
            </div>
            <button type="button" aria-label={t("Tutup asisten", "Close assistant")} onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-accent dark:hover:bg-surface-muted"><X size={19} /></button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-2xs text-fg-muted dark:text-fg-subtle"><ShieldCheck size={13} />{demo ? t("Data contoh, tidak disimpan", "Sample data, not saved") : t("Konteks mengikuti akses Anda", "Context follows your access")}</span>
            <button type="button" onClick={onReset} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-2xs font-medium text-accent hover:bg-accent-soft disabled:opacity-40 dark:text-accent dark:hover:bg-accent-soft"><RotateCcw size={12} /> {t("Percakapan baru", "New conversation")}</button>
          </div>
        </header>
        <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {context && <div className="mb-5">{context}</div>}
          {!demo && (serviceState === "needs_key" || serviceState === "unavailable" || serviceState === "error") && <p role="status" className="mb-5 rounded-control border border-warning/20 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning dark:border-warning/20 dark:bg-warning-soft text-warning">{serviceState === "needs_key" ? t("Key gateway belum diisi. Jika 9router mewajibkan key, administrator perlu mengisinya sebelum chat dapat digunakan.", "The gateway key is not set. If 9router requires a key, an administrator must add it before chat can be used.") : serviceState === "error" ? t("Koneksi sebelumnya gagal. Periksa gateway atau coba kembali.", "The previous connection failed. Check the gateway or try again.") : t("Asisten belum tersedia. Administrator perlu mengaktifkan konfigurasi gateway.", "The assistant is not available yet. An administrator must enable the gateway configuration.")}</p>}
          {!messages.length && <div>
            <div className="mx-auto mb-2 h-32 w-32"><JellyMascot state={state} /></div>
            <p className="text-center text-lg font-semibold tracking-heading">{t("Halo, mulai dari mana?", "Hi, where should we start?")}</p>
            <p className="mx-auto mt-2 max-w-72 text-center text-sm leading-relaxed text-fg-muted dark:text-fg-subtle">{t("Bawa ide atau pekerjaan Anda. Kita susun langkah berikutnya bersama.", "Bring your idea or task. We'll map out the next steps together.")}</p>
            <div className="mt-6 space-y-2.5">{suggestions.map(({ title, titleEn, description, descriptionEn, prompt, promptEn, icon: Icon }) => <button key={title} type="button" disabled={busy || !canSend} onClick={() => onInputChange(t(prompt, promptEn))} className="group flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3.5 text-left transition-colors hover:border-accent/30 hover:bg-accent-soft/40 disabled:opacity-50 dark:border-line dark:bg-surface-muted/60 dark:hover:border-accent/30 dark:hover:bg-accent-soft/40">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent dark:bg-accent-soft dark:text-accent"><Icon size={18} strokeWidth={1.7} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{t(title, titleEn)}</span><span className="mt-0.5 block text-2xs leading-relaxed text-fg-muted dark:text-fg-subtle">{t(description, descriptionEn)}</span></span><ArrowUpRight size={15} className="shrink-0 text-fg-subtle group-hover:text-accent" />
            </button>)}</div>
          </div>}
          <div role="log" aria-live="polite" aria-label={demo ? t("Contoh percakapan", "Sample conversation") : t("Percakapan dengan asisten", "Conversation with the assistant")} className="space-y-5">{messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-8" : "mr-3"}>
            <p className={`mb-1.5 text-2xs font-medium ${message.role === "user" ? "text-right text-fg-subtle" : "text-accent dark:text-accent"}`}>{message.role === "user" ? t("Anda", "You") : t("Asisten Tracko", "Tracko Assistant")}</p>
            <div className={`whitespace-pre-wrap break-words rounded-card p-4 text-sm leading-relaxed ${message.role === "user" ? "rounded-tr-[4px] bg-accent text-accent-fg" : "rounded-tl-[4px] border border-line bg-surface-muted dark:border-line dark:bg-surface"}`}>{message.role === "assistant" ? normalizeAssistantText(message.content) : message.content}</div>
            {message.proposal && <div className="mt-3 rounded-card border border-accent/20 bg-accent-soft/80 p-4 dark:border-accent/20 dark:bg-accent-soft/40">
              <div className="flex items-start justify-between gap-3"><div><p className="text-2xs font-medium text-accent">{t("Proposal perubahan", "Change proposal")}</p><p className="mt-1 text-xs font-semibold">{message.proposal.target.title ?? t("Target Tracko", "Tracko target")}</p></div><span className="rounded-full bg-surface/80 px-2 py-1 text-2xs font-medium text-accent dark:bg-surface dark:text-accent">{message.proposal.status === "pending" ? t("Menunggu persetujuan", "Awaiting approval") : message.proposal.status === "approved" ? t("Disetujui · dijalankan", "Approved · executed") : message.proposal.status === "rejected" ? t("Ditolak", "Rejected") : message.proposal.status === "stale" ? t("Data berubah", "Data changed") : message.proposal.status === "expired" ? t("Kedaluwarsa", "Expired") : message.proposal.status === "failed" ? t("Gagal", "Failed") : t("Diproses", "Processing")}</span></div>
              <div className="mt-3 space-y-2">{message.proposal.changes.map((change, changeIndex) => <div key={`${change.field}-${changeIndex}`} className="rounded-control border border-accent/15 bg-surface/80 px-3 py-2 dark:border-accent/20 dark:bg-surface-muted/60"><p className="text-2xs font-medium text-fg-muted dark:text-fg-subtle">{change.field}</p><p className="mt-1 break-words text-xs text-fg-muted dark:text-fg-muted">{change.before == null ? <span className="text-fg-subtle">—</span> : String(change.before)}<span className="mx-2 text-accent">→</span><span className="font-semibold">{change.after == null ? t("(kosong)", "(empty)") : String(change.after)}</span></p></div>)}</div>
              {message.proposal.status === "pending" && <div className="mt-3 flex gap-2"><button type="button" disabled={proposalBusyId === message.proposal.id || Boolean(proposalBusyId)} onClick={() => onApproveProposal?.(message.proposal!.id)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-strong disabled:opacity-50"><Check size={14} />{proposalBusyId === message.proposal.id ? t("Menjalankan…", "Running…") : t("Setujui & jalankan", "Approve & run")}</button><button type="button" disabled={Boolean(proposalBusyId)} onClick={() => onRejectProposal?.(message.proposal!.id)} className="h-9 rounded-control border border-line px-3 text-xs font-medium text-fg-muted hover:bg-surface disabled:opacity-50 dark:border-line-strong dark:text-fg-subtle dark:hover:bg-surface">{t("Tolak", "Reject")}</button></div>}
              {proposalError && proposalBusyId === message.proposal.id && <p role="alert" className="mt-2 text-2xs text-danger">{proposalError}</p>}
            </div>}
          </div>)}</div>
          {busy && <div role="status" className="mt-4 flex items-center gap-2 text-xs text-accent dark:text-accent"><span className="assistant-mini-dot h-1.5 w-1.5 rounded-full bg-success" /> {t("Sedang menyusun jawaban…", "Composing an answer…")}</div>}
          {error && <div role="alert" className="mt-4 rounded-control border border-danger/20 bg-danger-soft p-3 text-xs leading-relaxed text-danger dark:border-danger/20 dark:bg-danger-soft text-danger">{error}</div>}
        </div>
        <form onSubmit={onSubmit} className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-line dark:bg-surface">
          <div className="rounded-card border border-line bg-surface-muted/50 p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 dark:border-line-strong dark:bg-surface">
            <label htmlFor={inputId} className="sr-only">{t("Pesan untuk asisten", "Message for the assistant")}</label>
            <textarea id={inputId} value={input} onChange={(event) => onInputChange(event.target.value)} rows={2} maxLength={4000} disabled={busy || !canSend} placeholder={demo ? t("Coba pesan demo…", "Try a demo message…") : t("Tulis pertanyaan atau brief…", "Write a question or brief…")} className="block max-h-32 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-fg-subtle disabled:opacity-50 text-fg" />
            <div className="flex items-center justify-between px-1"><span className="text-2xs text-fg-subtle">{demo ? t("Respons sintetis · tanpa panggilan AI", "Synthetic response · no AI calls") : t("Saran AI perlu ditinjau", "AI suggestions need review")}</span><button type="submit" disabled={busy || !canSend || !input.trim()} aria-label={demo ? t("Kirim pesan demo", "Send demo message") : t("Kirim pesan", "Send message")} className="flex h-10 w-10 items-center justify-center rounded-control bg-accent text-accent-fg hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"><ArrowUp size={18} /></button></div>
          </div>
          <div className="mt-2.5 text-center text-2xs leading-relaxed text-fg-subtle">{footer ?? (demo ? t("Tidak ada data pekerjaan yang diubah.", "No work data is changed.") : t("Riwayat sementara · 30 menit sejak respons terakhir.", "Temporary history · 30 minutes since the last response."))}</div>
        </form>
      </section>
    </div>, document.body,
  );
}
