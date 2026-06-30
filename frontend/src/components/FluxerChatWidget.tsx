import React, { useState, useEffect, useRef } from "react";

const FluxerChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    // Sapaan otomatis menghilang dalam 8 detik agar tetap bersih
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const openChatPopup = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    const chatUrl = "https://fluxer.dsicorp.id/";
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      window.open(chatUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsOpen(true);
    setShowTooltip(false);

    const width = 440;
    const height = 700;
    
    // Posisi mengambang sempurna di kanan bawah layar desktop
    const left = window.screen.availWidth - width - 24;
    const top = window.screen.availHeight - height - 64;

    const popup = window.open(
      chatUrl,
      "FluxerChat",
      `width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no`
    );

    if (popup) {
      intervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsOpen(false);
        }
      }, 1000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans antialiased selection:bg-transparent">
      
      {/* SaaS Premium Welcome Bubble */}
      {showTooltip && !isOpen && (
        <div className="relative mb-4 w-[300px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800/80 transition-all duration-500 ease-out transform translate-y-0 opacity-100">
          
          {/* Close Button Bubble */}
          <button 
            type="button"
            onClick={() => setShowTooltip(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close tooltip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex gap-3 items-start">
            {/* Avatar Stack & Status Indicator */}
            <div className="relative shrink-0 pt-0.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                FX
              </div>
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
            </div>

            {/* Teks Konten */}
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Fluxer Support Team
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed pr-2">
                Ada yang bisa kami bantu? Klik di bawah untuk mulai berdiskusi secara instan.
              </p>
            </div>
          </div>

          {/* Ekor Balon Chat */}
          <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white/95 dark:bg-gray-900/95 border-r border-b border-gray-100 dark:border-gray-800/80 transform rotate-45"></div>
        </div>
      )}

      {/* Floating Action Button Core */}
      <div className="relative group">
        
        {/* Aura Ring Dinamis saat Standby */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-indigo-500/30 dark:bg-indigo-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 opacity-25 animate-ping" />
        )}

        <button
          type="button"
          onClick={openChatPopup}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_24px_rgba(79,70,229,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 transform active:scale-95
            ${isOpen
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950 scale-105" 
                : "bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 text-white hover:scale-110 hover:shadow-[0_12px_32px_rgba(79,70,229,0.45)]"
            }
          `}
          aria-label="Toggle Fluxer Chat"
        >
          {isOpen ? (
            /* Icon Radar Pulsa saat Jendela Aktif Terbuka di Luar */
            <div className="relative flex items-center justify-center w-6 h-6">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
          ) : (
            /* Premium Minimalist Chat Bubble Icon */
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-6 h-6 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105"
            >
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.237.18 2.165 1.211 2.165 2.464v7.716c0 1.253-.928 2.285-2.165 2.464a48.636 48.636 0 01-3.414.265 9.456 9.456 0 00-4.054 1.805l-3.411 2.558A.75.75 0 017 19.528v-2.31c-1.922-.19-3.412-.916-4.317-2.126C2.16 14.364 2 13.434 2 12.4V5.235c0-1.253.928-2.285 2.165-2.464z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default FluxerChatWidget;