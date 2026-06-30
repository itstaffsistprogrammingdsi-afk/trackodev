import React from "react";

const ChatPage: React.FC = () => {
  return (
    /* PERBAIKAN KUNCI: 
      1. Menghapus 'select-none' karena properti ini terbukti memblokir fokus klik mouse ke dalam iframe pada beberapa browser.
      2. Mengganti 'fixed' menjadi 'absolute' untuk menghindari konflik stack konteks (z-index) dengan sidebar/navbar Trackodev.
    */
    <div className="absolute top-[73px] bottom-0 left-0 right-0 p-0 md:p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex justify-center items-center">
      
      {/* Container Utama dengan Z-Index Stabil */}
      <div className="w-full h-full max-w-[1600px] mx-auto bg-white dark:bg-gray-950 rounded-none md:rounded-2xl border-0 md:border border-gray-200/70 dark:border-gray-800/70 shadow-none md:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] overflow-hidden relative z-10">
        
        <iframe
          src="https://fluxer.dsicorp.id/"
          title="Fluxer Chat System"
          /* PERBAIKAN KUNCI:
            - Menambahkan 'pointer-events-auto' dan 'z-30' secara eksplisit pada iframe 
              untuk memaksanya berada di lapisan terdepan yang siap menerima klik.
          */
          className="absolute inset-0 w-full h-full border-none bg-white dark:bg-gray-950 z-30 pointer-events-auto"
          allow="microphone; camera; clipboard-write; geolocation; display-capture"
          allowFullScreen
        />

      </div>
    </div>
  );
};

export default ChatPage;