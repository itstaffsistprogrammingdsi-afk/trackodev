import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, MessageCircle, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import api from "@/lib/axios";

type ExternalIdentity = {
  id: string;
  provider: "discord";
  external_user_id: string;
  display_name: string | null;
  verified_at: string;
};

type LinkCode = {
  provider: "discord";
  code: string;
  expires_at: string;
};

export default function IntegrationSettingsPage() {
  const [identities, setIdentities] = useState<ExternalIdentity[]>([]);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadIdentities = useCallback(async () => {
    try {
      const response = await api.get<{ data: ExternalIdentity[] }>("/integrations/identities");
      setIdentities(response.data.data ?? []);
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(apiMessage ?? "Status koneksi gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIdentities();
  }, [loadIdentities]);

  const discordIdentity = identities.find((identity) => identity.provider === "discord");

  useEffect(() => {
    if (!linkCode || discordIdentity) return;
    const poll = window.setInterval(() => void loadIdentities(), 5000);
    return () => window.clearInterval(poll);
  }, [discordIdentity, linkCode, loadIdentities]);

  const createCode = async () => {
    setWorking(true);
    setMessage(null);
    setCopied(false);
    try {
      const response = await api.post<{ data: LinkCode }>("/integrations/link-codes", {
        provider: "discord",
      });
      setLinkCode(response.data.data);
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(apiMessage ?? "Kode koneksi gagal dibuat. Silakan coba lagi.");
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
    if (!discordIdentity || !window.confirm("Putuskan akun Discord dari Traco?")) return;
    setWorking(true);
    setMessage(null);
    try {
      await api.delete(`/integrations/identities/${discordIdentity.id}`);
      setLinkCode(null);
      await loadIdentities();
      setMessage("Koneksi Discord berhasil diputus.");
    } catch (error: unknown) {
      const apiMessage = isApiError(error) ? error.response?.data?.message : null;
      setMessage(apiMessage ?? "Koneksi Discord gagal diputus.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <PageMeta title="Integrations | Traco" description="Hubungkan Traco dengan Discord dan AI agent." />
      <PageBreadcrumb pageTitle="Integrations" />

      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 dark:border-gray-800 dark:from-indigo-500/10 dark:to-blue-500/5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <MessageCircle className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Discord + Traco AI Agent</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Hubungkan identitas Discord Anda agar AI agent dapat membaca dan memperbarui pekerjaan sesuai role, permission, dan akses project Traco Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-gray-500">
                <Loader2 className="size-5 animate-spin" /> Memuat status koneksi...
              </div>
            ) : discordIdentity ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">Discord terhubung</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        {discordIdentity.display_name || `Discord ID ${discordIdentity.external_user_id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void disconnect()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
                  >
                    {working ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                    Putuskan koneksi
                  </button>
                </div>

                <div className="flex gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/60 dark:text-gray-400">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-600" />
                  AI agent selalu bertindak sebagai akun Anda. Agent tidak dapat membuka atau mengubah data yang tidak dapat Anda akses langsung di Traco.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <ol className="grid gap-3 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-3">
                  {[
                    "Buat kode sekali-pakai di halaman ini.",
                    "Di Discord jalankan /traco link KODE.",
                    "Agent mengonfirmasi akun Traco Anda.",
                  ].map((text, index) => (
                    <li key={text} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                      <span className="mb-3 flex size-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {index + 1}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>

                {linkCode ? (
                  <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-5 text-center dark:border-indigo-500/30 dark:bg-indigo-500/5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Kode koneksi sekali-pakai</p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <code className="text-3xl font-bold tracking-[0.16em] text-gray-900 dark:text-white">{linkCode.code}</code>
                      <button type="button" onClick={() => void copyCode()} className="flex size-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm hover:bg-indigo-100 dark:bg-gray-900">
                        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      Berlaku sampai {new Date(linkCode.expires_at).toLocaleString("id-ID")}. Jangan bagikan kode ini kepada orang lain.
                    </p>
                    <button type="button" disabled={working} onClick={() => void createCode()} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 dark:text-indigo-300">
                      <RefreshCw className="size-4" /> Buat kode baru
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void createCode()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {working ? <Loader2 className="size-5 animate-spin" /> : <Link2 className="size-5" />}
                    Buat kode koneksi Discord
                  </button>
                )}
              </div>
            )}

            {message && <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">{message}</p>}
          </div>
        </section>
      </div>
    </>
  );
}

function isApiError(error: unknown): error is { response?: { data?: { message?: string } } } {
  return typeof error === "object" && error !== null && "response" in error;
}
