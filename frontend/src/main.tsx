import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "flatpickr/dist/flatpickr.css";

import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import { QueryClientProvider } from "@tanstack/react-query";
import MobileLiveUpdate from "./components/common/MobileLiveUpdate";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <AppWrapper>
                <MobileLiveUpdate />
                <App />
              </AppWrapper>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>
);
