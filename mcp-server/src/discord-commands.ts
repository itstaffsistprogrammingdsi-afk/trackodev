import { SlashCommandBuilder } from "discord.js";

export const tracoCommand = new SlashCommandBuilder()
  .setName("traco")
  .setDescription("Kolaborasi dengan Traco")
  .setDMPermission(false)
  .addSubcommand((command) => command
    .setName("link")
    .setDescription("Hubungkan akun Discord ke Traco")
    .addStringOption((option) => option
      .setName("kode")
      .setDescription("Kode sekali-pakai dari halaman Integrations Traco")
      .setMinLength(8)
      .setMaxLength(9)
      .setRequired(true)))
  .addSubcommand((command) => command
    .setName("whoami")
    .setDescription("Tampilkan identitas Traco yang terhubung"))
  .addSubcommand((command) => command
    .setName("projects")
    .setDescription("Tampilkan workspace, campaign, dan board yang dapat diakses"))
  .addSubcommand((command) => command
    .setName("cards")
    .setDescription("Cari card yang dapat diakses")
    .addStringOption((option) => option
      .setName("query")
      .setDescription("Kata kunci judul atau deskripsi")
      .setMaxLength(255))
    .addIntegerOption((option) => option
      .setName("limit")
      .setDescription("Jumlah hasil, maksimal 20")
      .setMinValue(1)
      .setMaxValue(20)))
  .addSubcommand((command) => command
    .setName("card")
    .setDescription("Tampilkan detail sebuah card")
    .addStringOption((option) => option
      .setName("card_id")
      .setDescription("UUID card Traco")
      .setRequired(true)))
  .addSubcommand((command) => command
    .setName("comment")
    .setDescription("Tambahkan komentar ke sebuah card")
    .addStringOption((option) => option
      .setName("card_id")
      .setDescription("UUID card Traco")
      .setRequired(true))
    .addStringOption((option) => option
      .setName("pesan")
      .setDescription("Isi komentar")
      .setMinLength(1)
      .setMaxLength(2000)
      .setRequired(true)));

export const discordCommands = [tracoCommand.toJSON()];
