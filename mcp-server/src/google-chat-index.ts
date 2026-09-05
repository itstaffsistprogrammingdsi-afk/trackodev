import { startGoogleChatBot } from "./google-chat-bot.js";

const server = await startGoogleChatBot();
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  server.close(() => process.exit(0));
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
