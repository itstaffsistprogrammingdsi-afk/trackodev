import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { FlaskConical, Search, X } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type { AssistantCard } from "./assistant";
import AssistantDrawer from "./AssistantDrawer";
import type { AssistantMessage, AssistantProposal, AssistantServiceState } from "./AssistantDrawer";
import JellyMascot from "./JellyMascot";

export default function AiAssistant() {
  const { user, can } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [serviceState, setServiceState] = useState<AssistantServiceState>("checking");
  const [card, setCard] = useState<AssistantCard | null>(null);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<AssistantCard[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [proposalBusyId, setProposalBusyId] = useState<string>();
  const [proposalError, setProposalError] = useState("");
  const inFlight = useRef(false);
  const canReadCards = can("card.view") || can("task.view");

  const scope = useMemo<Record<string, string>>(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const next: Record<string, string> = {};
    if (parts[0] === "divisions" && parts[1]) {
      next.division_id = parts[1];
    } else if (parts[0] === "workspaces" && parts[1]) {
      next.workspace_id = parts[1];
      if (parts[2] === "campaigns" && parts[3]) next.campaign_id = parts[3];
    }
    return next;
  }, [location.pathname]);
  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);

  function reset(nextCard: AssistantCard | null = card) {
    if (inFlight.current) return;
    setCard(nextCard);
    setMessages([]);
    setConversationId(undefined);
    setError("");
    setSuccess(false);
    setInput("");
    setProposalBusyId(undefined);
    setProposalError("");
  }

  useEffect(() => {
    if (inFlight.current) return;
    setCard(null);
    setMessages([]);
    setConversationId(undefined);
    setError("");
    setSuccess(false);
    setProposalBusyId(undefined);
    setProposalError("");
  }, [scopeKey]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setServiceState("checking");
    api.get("/ai/status", { signal: controller.signal }).then(({ data }) => {
      setAvailable(data.data.available);
      setServiceState(!data.data.available ? "unavailable" : data.data.gateway_key_configured === false ? "needs_key" : "configured");
    }).catch(() => { if (!controller.signal.aborted) { setAvailable(false); setServiceState("unavailable"); } });
    return () => controller.abort();
  }, [user?.id, open]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!inFlight.current) {
        setCard((event as CustomEvent<AssistantCard>).detail);
        setMessages([]);
        setConversationId(undefined);
        setError("");
        setSuccess(false);
        setInput("");
      }
      setOpen(true);
    };
    window.addEventListener("tracko:open-assistant", handler);
    return () => window.removeEventListener("tracko:open-assistant", handler);
  }, []);

  useEffect(() => {
    if (!open || !canReadCards || card) return;
    const controller = new AbortController();
    setCards([]);
    setSearchError("");
    const timer = window.setTimeout(() => {
      api.get("/ai/cards", { params: { query }, signal: controller.signal })
        .then(({ data }) => { setCards(data.data); setSearchError(""); })
        .catch(() => { if (!controller.signal.aborted) setSearchError(t("Pencarian card gagal. Coba lagi.", "Card search failed. Try again.")); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, canReadCards, card, t]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(false), 2400);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || inFlight.current || !available) return;
    inFlight.current = true;
    setBusy(true);
    setSuccess(false);
    setError("");
    try {
      const { data } = await api.post(
        "/ai/messages",
        { message: text, card_id: card?.id, ...(card ? {} : scope), conversation_id: conversationId },
        { timeout: 75000 },
      );
      setMessages((previous) => [
        ...previous,
        { role: "user", content: text },
        { role: "assistant", content: data.data.reply, proposal: (data.data.proposal ?? undefined) as AssistantProposal | undefined },
      ]);
      setConversationId(data.data.conversation_id);
      setInput("");
      setSuccess(true);
    } catch (failure) {
      setError(isAxiosError(failure) ? failure.response?.data?.message ?? t("Koneksi AI gagal. Silakan coba lagi.", "AI connection failed. Please try again.") : t("Koneksi AI gagal.", "AI connection failed."));
      setServiceState("error");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function approveProposal(proposalId: string) {
    if (proposalBusyId) return;
    setProposalBusyId(proposalId);
    setProposalError("");
    try {
      const { data } = await api.post(`/ai/proposals/${proposalId}/approve`);
      setMessages((previous) => previous.map((message) => (
        message.proposal?.id === proposalId ? { ...message, proposal: data.data as AssistantProposal } : message
      )));
      setSuccess(true);
      await queryClient.invalidateQueries();
    } catch (failure) {
      setProposalError(isAxiosError(failure) ? failure.response?.data?.message ?? t("Proposal gagal dijalankan.", "Failed to execute proposal.") : t("Proposal gagal dijalankan.", "Failed to execute proposal."));
    } finally {
      setProposalBusyId(undefined);
    }
  }

  async function rejectProposal(proposalId: string) {
    if (proposalBusyId) return;
    setProposalBusyId(proposalId);
    setProposalError("");
    try {
      const { data } = await api.post(`/ai/proposals/${proposalId}/reject`);
      setMessages((previous) => previous.map((message) => (
        message.proposal?.id === proposalId ? { ...message, proposal: data.data as AssistantProposal } : message
      )));
    } catch (failure) {
      setProposalError(isAxiosError(failure) ? failure.response?.data?.message ?? t("Proposal gagal ditolak.", "Failed to reject proposal.") : t("Proposal gagal ditolak.", "Failed to reject proposal."));
    } finally {
      setProposalBusyId(undefined);
    }
  }

  const state = busy ? "thinking" : error ? "error" : success ? "success" : open ? "open" : "idle";
  if (!user) return null;

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} className="assistant-launcher" aria-label={t("Buka asisten AI Tracko", "Open the Tracko AI assistant")} aria-haspopup="dialog" aria-expanded={false} title={t("Tanya asisten Tracko", "Ask the Tracko assistant")}>
      <span className="assistant-launcher-label">{busy ? t("Sedang berpikir…", "Thinking…") : error ? t("Periksa koneksi", "Check connection") : success ? t("Jawaban siap", "Answer ready") : t("Tanya Tracko", "Ask Tracko")}</span><JellyMascot state={state} />
    </button>}
    <AssistantDrawer open={open} onClose={() => setOpen(false)} state={state} serviceState={serviceState} messages={messages} input={input} onInputChange={setInput} onSubmit={send} busy={busy} canSend={available && serviceState !== "checking"} error={error} onReset={() => reset()}
      context={card ? <div className="flex items-center gap-2 rounded-control border border-accent/15 bg-accent-soft/60 px-3 py-2.5 dark:border-accent/20 dark:bg-accent-soft/40"><div className="min-w-0 flex-1"><p className="text-2xs font-medium text-accent">{t("Konteks card", "Card context")}</p><p className="mt-1 truncate text-xs font-medium">{card.title}</p></div><button type="button" aria-label={t("Lepas konteks card", "Remove card context")} disabled={busy} onClick={() => reset(null)} className="flex h-9 w-9 items-center justify-center rounded-[7px] text-accent hover:bg-accent-soft disabled:opacity-40 dark:hover:bg-accent-soft"><X size={14} /></button></div> : canReadCards ? <details className="rounded-control border border-line bg-surface-muted/50 p-3 dark:border-line dark:bg-surface-muted/50"><summary className="cursor-pointer text-xs font-medium text-fg-muted">{t("Tambahkan konteks card (opsional)", "Add card context (optional)")}</summary><div className="relative mt-3"><Search size={14} className="absolute left-3 top-3 text-fg-subtle" /><label htmlFor="ai-card-search" className="sr-only">{t("Cari judul card", "Search card titles")}</label><input id="ai-card-search" value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder={t("Cari judul card…", "Search card titles…")} maxLength={150} className="w-full rounded-[7px] border border-line bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-accent dark:border-line-strong dark:bg-surface" /></div>{searchError && <p className="mt-2 text-xs text-danger">{searchError}</p>}<div className="mt-2 max-h-28 overflow-y-auto">{cards.map((item) => <button type="button" key={item.id} disabled={busy} onClick={() => reset(item)} className="block w-full rounded-[7px] p-2 text-left text-xs hover:bg-surface disabled:opacity-40 dark:hover:bg-surface-muted"><span className="block truncate font-medium">{item.title}</span><span className="text-2xs text-fg-subtle">{item.campaign}</span></button>)}</div></details> : undefined}
      footer={<><p>{t("Pesan dan konteks terpilih dikirim ke AI. Riwayat sementara, 30 menit.", "Messages and selected context are sent to the AI. Temporary history, 30 minutes.")}</p><Link onClick={() => setOpen(false)} to="/assistant/preview" className="mt-2 inline-flex min-h-8 items-center gap-1 text-accent underline underline-offset-2"><FlaskConical size={11} /> {t("Coba demo animasi", "Try the animation demo")}</Link></>}
      onApproveProposal={approveProposal}
      onRejectProposal={rejectProposal}
      proposalBusyId={proposalBusyId}
      proposalError={proposalError}
    />
  </>;
}
