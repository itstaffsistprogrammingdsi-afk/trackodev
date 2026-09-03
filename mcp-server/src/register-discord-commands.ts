import { REST, Routes } from "discord.js";
import { discordCommands } from "./discord-commands.js";
import { loadDiscordConfig } from "./discord-config.js";

async function main(): Promise<void> {
  const config = loadDiscordConfig();
  const rest = new REST({ version: "10" }).setToken(config.botToken);

  await rest.put(
    Routes.applicationGuildCommands(config.applicationId, config.guildId),
    { body: discordCommands },
  );

  console.log(`Slash command /traco terdaftar untuk guild ${config.guildId}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
