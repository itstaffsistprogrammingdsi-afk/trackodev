import React from "react";

const ChatPage: React.FC = () => {
  const chatUrl = "https://fluxer.dsicorp.id/";

  const handleOpenChat = () => {
    window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-[60dvh] w-full items-center justify-center rounded-2xl bg-gray-50 p-0 transition-colors duration-200 dark:bg-gray-900 sm:p-4">
      <div className="min-h-[55dvh] w-full max-w-[1200px] mx-auto bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_-4px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center p-5 text-center sm:p-8">
        
        {/* Icon Header */}
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 border border-indigo-100/50 dark:border-indigo-900/50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Buka Fluxer Secure Chat System
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
          Fluxer dibuka di tab baru tanpa mengirim token autentikasi melalui URL. Jika Fluxer
          meminta autentikasi, silakan login di sana.
        </p>

        {/* Tombol Buka Chat */}
        <button
          type="button"
          onClick={handleOpenChat}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/20 active:scale-98 transition-all duration-150 cursor-pointer"
        >
          <span>Mulai Percakapan</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>

        {/* Badge Status Keamanan */}
        <div className="mt-8 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Token tidak dibagikan melalui URL</span>
        </div>

      </div>
    </div>
  );
};

export default ChatPage;
