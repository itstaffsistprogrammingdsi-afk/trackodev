import React from "react";

const ChatPage: React.FC = () => {
  return (
    <div className="w-full h-[calc(100vh-73px)] p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <iframe
          src="https://fluxer.dsicorp.id/"
          title="Fluxer Chat System"
          className="w-full h-full border-none bg-white dark:bg-gray-950"
          // Mengizinkan fitur mikrofon, kamera, dan aksi copy-paste (clipboard) di dalam chat
          allow="microphone; camera; clipboard-write; geolocation"
          allowFullScreen
          // Sandbox diatur agar script, form, dan session/cookies Fluxer tetap bekerja normal
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
};

export default ChatPage;