import { useEffect } from "react";
import api from "../lib/axios";

export default function TestConnection() {

  useEffect(() => {
    api.get("/api/ping")
      .then(res => console.log("PING SUCCESS:", res.data))
      .catch(err => console.error("PING ERROR:", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Test Connection Page</h1>
      <p>Cek console (F12) untuk hasil</p>
    </div>
  );
}