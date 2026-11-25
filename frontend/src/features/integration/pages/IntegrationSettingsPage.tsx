import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, MessageCircle, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/lib/axios";
import { confirmDialog } from "@/lib/feedback";

type ExternalIdentity = {
  id: string;
  provider: Provider;
  external_user_id: string;
  display_name: string | null;
  verified_at: string;
};

type LinkCode = {
  provider: Provider;
  code: string;
  expires_at: string;
};

type Provider = "discord" | "google_chat";

const providerCopy: Record<
  Provider,
  {
    label: string;
    description: string;
    descriptionEn: string;
    command: string;
    commandEn: string;
  }
> = {
  discord: {
    label: "Discord",
    description: "Hubungkan identitas Discord agar AI agent dapat bekerja melalui server Discord.",
    descriptionEn: "Connect your Discord identity so the AI agent can work through your Discord server.",
    command: "Di Discord jalankan /traco link KODE.",
    commandEn: "In Discord, run /traco link CODE.",
  },
  google_chat: {
    label: "Google Chat",
    description: "Hubungkan identitas Google Chat agar AI agent dapat bekerja dari ruang Chat Anda.",
    descriptionEn: "Connect your Google Chat identity so the AI agent can work from your Chat spaces.",
    command: "Kirim kode ini ke agent Traco di Google Chat.",
    commandEn: "Send this code to the Traco agent in Google Chat.",
  },
};

export default function IntegrationSettingsPage() {
  const { t, locale, language } = useLanguage();
  const [identities, setIdentities] = useState<ExternalIdentity[]>([]);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("discord");

  const loadIdentities = useCallback(async () => {
    try {
      const response = await api.get<{ data: ExternalIdentity[] }>("/integrations/identities");
      setIdentities(response.data.data ?? []);
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(apiMessage ?? t("Status koneksi gagal dimuat.", "Failed to load connection status."));
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useEffect(() => {
    void loadIdentities();
  }, [loadIdentities]);

  const currentIdentity = identities.find((identity) => identity.provider === provider);
  const copy = providerCopy[provider];

  useEffect(() => {
    if (!linkCode || currentIdentity || linkCode.provider !== provider) return;
    const poll = window.setInterval(() => void loadIdentities(), 5000);
    return () => window.clearInterval(poll);
  }, [currentIdentity, linkCode, loadIdentities, provider]);

  const createCode = async () => {
    setWorking(true);
    setMessage(null);
    setCopied(false);
    try {
      const response = await api.post<{ data: LinkCode }>("/integrations/link-codes", {
        provider,
      });
      setLinkCode(response.data.data);
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(apiMessage ?? t("Kode koneksi gagal dibuat. Silakan coba lagi.", "Failed to create a connection code. Please try again."));
    } finally {
      setWorking(false);
    }
  };

  const copyCode = async () => {
    if (!linkCode) return;
    await navigator.clipboard.writeText(linkCode.code);
    setCopied(true);
  };

  const disconnect = async () => {
    if (
      !currentIdentity ||
      !(await confirmDialog({
        message: t("Putuskan akun {provider} dari Traco?", "Disconnect {provider} account from Traco?", {
          provider: copy.label,
        }),
        variant: "danger",
      }))
    )
      return;
    setWorking(true);
    setMessage(null);
    try {
      await api.delete(`/integrations/identities/${currentIdentity.id}`);
      setLinkCode(null);
      await loadIdentities();
      setMessage(
        t("Koneksi {provider} berhasil diputus.", "{provider} disconnected successfully.", {
          provider: copy.label,
        }),
      );
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(
        apiMessage ??
          t("Koneksi {provider} gagal diputus.", "Failed to disconnect {provider}.", {
            provider: copy.label,
          }),
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Integrations | Traco"
        description={t(
          "Hubungkan Traco dengan Discord, Google Chat, dan AI agent.",
          "Connect Traco with Discord, Google Chat, and AI agents.",
        )}
      />
      <PageBreadcrumb pageTitle="Integrations" />

      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-sm dark:border-line dark:bg-surface-muted/30">
          <div className="border-b border-line bg-surface-muted/40 p-6 dark:border-line ">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-accent text-accent-fg">
                <MessageCircle className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-fg dark:text-fg">Channel + Traco AI Agent</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-muted dark:text-fg-subtle">
                  {t(copy.description, copy.descriptionEn)}{" "}
                  {t(
                    "Data tetap mengikuti role, permission, dan akses project Traco Anda.",
                    "Your data still follows your Traco roles, permissions, and project access.",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 flex flex-wrap gap-2 rounded-card bg-surface-muted/40 p-2 dark:bg-surface-muted/40">
              {(["discord", "google_chat"] as Provider[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setProvider(option); setLinkCode(null); setMessage(null); setCopied(false); }}
                  className={`rounded-control px-4 py-2 text-sm font-semibold transition ${provider === option ? "bg-surface text-accent-strong shadow-sm dark:bg-surface-muted dark:text-accent" : "text-fg-muted hover:text-fg dark:text-fg-subtle dark:hover:text-white"}`}
                >
                  {providerCopy[option].label}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-fg-muted">
                <Loader2 className="size-5 animate-spin" /> {t("Memuat status koneksi...", "Loading connection status...")}
              </div>
            ) : currentIdentity ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-card border border-success/20 bg-success-soft p-5 dark:border-emerald-500/20 dark:bg-success-soft0/10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-success dark:text-success">
                          {t("{provider} terhubung", "{provider} connected", {
                            provider: copy.label,
                          })}
                        </p>
                        <p className="text-sm text-success dark:text-success">
                        {currentIdentity.display_name || `${copy.label} ID ${currentIdentity.external_user_id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void disconnect()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-danger/20 bg-surface px-4 text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-50 dark:border-danger/20 dark:bg-transparent dark:text-danger"
                  >
                    {working ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                    {t("Putuskan koneksi", "Disconnect")}
                  </button>
                </div>

                <div className="flex gap-3 rounded-card bg-surface-muted/40 p-4 text-sm text-fg-muted dark:bg-surface-muted/40 dark:text-fg-subtle">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
                  {t(
                    "AI agent selalu bertindak sebagai akun Anda. Agent tidak dapat membuka atau mengubah data yang tidak dapat Anda akses langsung di Traco.",
                    "The AI agent always acts as your account. The agent cannot open or change data you cannot access directly in Traco.",
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <ol className="grid gap-3 text-sm text-fg-muted dark:text-fg-muted sm:grid-cols-3">
                  {[
                    t(
                      "Buat kode sekali-pakai di halaman ini.",
                      "Create a one-time code on this page.",
                    ),
                    t(copy.command, copy.commandEn),
                    t(
                      "Agent mengonfirmasi akun Traco Anda.",
                      "The agent confirms your Traco account.",
                    ),
                  ].map((text, index) => (
                    <li key={text} className="rounded-card border border-line p-4 dark:border-line">
                      <span className="mb-3 flex size-7 items-center justify-center rounded-full bg-accent-soft text-2xs font-medium text-accent-strong">
                        {index + 1}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>

                {linkCode ? (
                  <div className="rounded-card border-2 border-dashed border-accent/20 bg-accent-soft/60 p-5 text-center dark:border-accent/20 dark:bg-accent-soft/40">
                    <p className="text-2xs font-medium text-accent dark:text-accent">
                      {t("Kode koneksi sekali-pakai", "One-time connection code")}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <code className="text-3xl font-bold tracking-[0.16em] text-fg dark:text-fg">{linkCode.code}</code>
                      <button type="button" onClick={() => void copyCode()} className="flex size-10 items-center justify-center rounded-control bg-surface text-accent shadow-sm hover:bg-accent-soft dark:bg-surface">
                        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-fg-muted">
                      {t(
                        "Berlaku sampai {date}. Jangan bagikan kode ini kepada orang lain.",
                        "Valid until {date}. Do not share this code with anyone else.",
                        { date: new Date(linkCode.expires_at).toLocaleString(locale) },
                      )}
                    </p>
                    <button type="button" disabled={working} onClick={() => void createCode()} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-strong disabled:opacity-50 dark:text-accent">
                      <RefreshCw className="size-4" /> {t("Buat kode baru", "Create new code")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void createCode()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-card bg-accent px-5 text-sm font-semibold text-white  transition hover:bg-accent-strong disabled:opacity-50"
                  >
                    {working ? <Loader2 className="size-5 animate-spin" /> : <Link2 className="size-5" />}
                    {t("Buat kode koneksi {provider}", "Create {provider} connection code", {
                      provider: copy.label,
                    })}
                  </button>
                )}
              </div>
            )}

            {message && <p className="mt-5 rounded-control bg-surface-muted px-4 py-3 text-sm text-fg-muted dark:bg-surface dark:text-fg-muted">{message}</p>}
          </div>
        </section>
      </div>
    </>
  );
}

function isApiError(error: unknown): error is { response?: { data?: { message?: string } } } {
  return typeof error === "object" && error !== null && "response" in error;
}
