import React from "react";

import { useLanguage } from "@/context/LanguageContext";

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const chatUrl = "https://fluxer.dsicorp.id/";

  const handleOpenChat = () => {
    window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-[60dvh] w-full items-center justify-center rounded-card bg-surface-muted/40 p-0 transition-colors duration-200 dark:bg-surface sm:p-4">
      <div className="mx-auto flex min-h-[55dvh] w-full max-w-[1200px] flex-col items-center justify-center rounded-panel border border-line bg-surface p-5 text-center shadow-e1 sm:p-8">
        
        {/* Icon Header */}
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-panel border border-accent/15 bg-accent-soft text-accent">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-fg dark:text-fg mb-2 tracking-tight">
          {t("Buka Fluxer Secure Chat System", "Open Fluxer Secure Chat System")}
        </h3>
        
        <p className="text-sm text-fg-muted dark:text-fg-subtle max-w-md mb-8 leading-relaxed">
          {t(
            "Fluxer dibuka di tab baru tanpa mengirim token autentikasi melalui URL. Jika Fluxer meminta autentikasi, silakan login di sana.",
            "Fluxer opens in a new tab without sending an authentication token through the URL. If Fluxer asks you to authenticate, sign in there.",
          )}
        </p>

        {/* Tombol Buka Chat */}
        <button
          type="button"
          onClick={handleOpenChat}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-strong text-white font-medium text-sm rounded-control shadow-lg shadow-indigo-600/20 active:scale-98 transition-all duration-150 cursor-pointer"
        >
          <span>{t("Mulai Percakapan", "Start conversation")}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>

        {/* Badge Status Keamanan */}
        <div className="mt-6 flex items-center gap-2 rounded-control border border-success/15 bg-success-soft px-3 py-1.5 font-mono text-2xs text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success-soft0" />
          <span>{t("Token tidak dibagikan melalui URL", "Token is not shared through the URL")}</span>
        </div>

      </div>
    </div>
  );
};

export default ChatPage;
