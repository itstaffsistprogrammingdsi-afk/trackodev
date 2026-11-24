import { useEffect } from "react";
import api from "../lib/axios";
import { useLanguage } from "@/context/LanguageContext";

export default function TestConnection() {
  const { t } = useLanguage();

  useEffect(() => {
    api.get("/api/ping")
      .then(res => console.log("PING SUCCESS:", res.data))
      .catch(err => console.error("PING ERROR:", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>{t("Test Connection Page", "Test connection page")}</h1>
      <p>{t("Cek console (F12) untuk hasil", "Check the console (F12) for the result")}</p>
    </div>
  );
}