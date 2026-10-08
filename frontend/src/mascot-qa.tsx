import { createRoot } from "react-dom/client";
import "./index.css";
import AssistantPreview from "./features/ai/AssistantPreview";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(<ThemeProvider><main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-10 lg:px-16 dark:bg-slate-950"><div className="mx-auto max-w-6xl"><AssistantPreview /></div></main></ThemeProvider>);
