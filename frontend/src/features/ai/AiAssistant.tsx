import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import { FlaskConical, Search, X } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import type { AssistantCard } from "./assistant";
import AssistantDrawer from "./AssistantDrawer";
import type { AssistantMessage, AssistantServiceState } from "./AssistantDrawer";
import JellyMascot from "./JellyMascot";

export default function AiAssistant() {
  const { user, can } = useAuth();
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
  const inFlight = useRef(false);
  const canReadCards = can("card.view") || can("task.view");

  function reset(nextCard: AssistantCard | null = card) {
    if (inFlight.current) return;
    setCard(nextCard);
    setMessages([]);
    setConversationId(undefined);
    setError("");
    setSuccess(false);
    setInput("");
  }

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
        .catch(() => { if (!controller.signal.aborted) setSearchError("Pencarian card gagal. Coba lagi."); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, canReadCards, card]);

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
      const { data } = await api.post("/ai/messages", { message: text, card_id: card?.id, conversation_id: conversationId }, { timeout: 75000 });
      setMessages((previous) => [...previous, { role: "user", content: text }, { role: "assistant", content: data.data.reply }]);
      setConversationId(data.data.conversation_id);
      setInput("");
      setSuccess(true);
    } catch (failure) {
      setError(isAxiosError(failure) ? failure.response?.data?.message ?? "Koneksi AI gagal. Silakan coba lagi." : "Koneksi AI gagal.");
      setServiceState("error");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const state = busy ? "thinking" : error ? "error" : success ? "success" : open ? "open" : "idle";
  if (!user) return null;

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} className="assistant-launcher" aria-label="Buka asisten AI Tracko" aria-haspopup="dialog" aria-expanded={false} title="Tanya asisten Tracko">
      <span className="assistant-launcher-label">{busy ? "Sedang berpikir…" : error ? "Periksa koneksi" : success ? "Jawaban siap" : "Tanya Tracko"}</span><JellyMascot state={state} />
    </button>}
    <AssistantDrawer open={open} onClose={() => setOpen(false)} state={state} serviceState={serviceState} messages={messages} input={input} onInputChange={setInput} onSubmit={send} busy={busy} canSend={available && serviceState !== "checking"} error={error} onReset={() => reset()}
      context={card ? <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900 dark:bg-indigo-950/40"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Konteks card</p><p className="mt-1 truncate text-xs font-medium">{card.title}</p></div><button type="button" aria-label="Lepas konteks card" disabled={busy} onClick={() => reset(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-400 hover:bg-indigo-100 disabled:opacity-40 dark:hover:bg-indigo-900"><X size={14} /></button></div> : canReadCards ? <details className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50"><summary className="cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">Tambahkan konteks card (opsional)</summary><div className="relative mt-3"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><label htmlFor="ai-card-search" className="sr-only">Cari judul card</label><input id="ai-card-search" value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul card…" maxLength={150} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950" /></div>{searchError && <p className="mt-2 text-xs text-rose-600">{searchError}</p>}<div className="mt-2 max-h-28 overflow-y-auto">{cards.map((item) => <button type="button" key={item.id} disabled={busy} onClick={() => reset(item)} className="block w-full rounded-lg p-2 text-left text-xs hover:bg-white disabled:opacity-40 dark:hover:bg-slate-800"><span className="block truncate font-medium">{item.title}</span><span className="text-[10px] text-slate-400">{item.campaign}</span></button>)}</div></details> : undefined}
      footer={<><p>Pesan dan konteks terpilih dikirim ke AI. Riwayat sementara, 30 menit.</p><Link onClick={() => setOpen(false)} to="/assistant/preview" className="mt-2 inline-flex min-h-8 items-center gap-1 text-indigo-500 underline underline-offset-2 dark:text-indigo-300"><FlaskConical size={11} /> Coba demo animasi</Link></>}
    />
  </>;
}
