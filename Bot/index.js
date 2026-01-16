// This code is very very rushed as the old bot was broken so-
// this is my half-assed attempt to get a new one up-and-running as quickly as i could.
// Sorry if this code upsets you.

const DISCORD_TOKEN =
  "";
const PREFIX = "!";
const API_PORT = 38130;


const fs = require("fs");
const path = require("path");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

const ROOT = __dirname;
const LIST_PATH = path.join(ROOT, "list.json");

let cache = null;

function loadList() {
  if (!cache) cache = JSON.parse(fs.readFileSync(LIST_PATH, "utf8"));
  return cache;
}

function saveList() {
  fs.writeFileSync(LIST_PATH, JSON.stringify(cache, null, 2));
}

fs.watchFile(LIST_PATH, () => {
  cache = null;
  console.log("[JSON] Reloaded");
});

const VALID_LISTS = ["priList", "modList", "skipAgeLimit", "banList"];

function modifyList(list, userId, add) {
  const data = loadList();
  if (!VALID_LISTS.includes(list)) return false;

  if (list === "banList") {
    add ? (data.banList[userId] = true) : delete data.banList[userId];
  } else {
    const id = (userId);
    if (add && !data[list].includes(id)) data[list].push(id);
    if (!add) data[list] = data[list].filter((v) => v !== id);
  }

  saveList();
  return true;
}

function isModerator(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("add")
      .setDescription("Add a user to a list")
      .addStringOption((o) =>
        o.setName("list").setDescription("Target list name").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("userid").setDescription("User ID to add").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("remove")
      .setDescription("Remove a user from a list")
      .addStringOption((o) =>
        o.setName("list").setDescription("Target list name").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("userid")
          .setDescription("User ID to remove")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("get")
      .setDescription("Show the current JSON list"),
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands,
  });
});

client.on("messageCreate", (msg) => {
  if (!msg.content.startsWith(PREFIX) || msg.author.bot) return;
  if (!isModerator(msg.member))
    return msg.reply("API Returned with status code 403.");

  const [cmd, userId, list] = msg.content.slice(1).split(/\s+/);
  if (cmd === "add") {
    if ((msg.member.id) != 1112708936332759170n) {
      return msg.reply("API Returned with status code 403.");
    }
    modifyList(list, userId, true);
  }
  if (cmd === "remove") {
    if ((msg.member.id) != 1112708936332759170n) {
      return msg.reply("API Returned with status code 403.");
    }
    modifyList(list, userId, false);
  }
  if (cmd === "get")
    return msg.reply(
      "```json\n" + JSON.stringify(loadList(), null, 2) + "\n```"
    );

  msg.reply("API Returned with status code 200.");
});

client.on("interactionCreate", (i) => {
  if (!i.isChatInputCommand()) return;
  if (!isModerator(i.member))
    return i.reply({
      content: "API Returned with status code 403.",
      ephemeral: true,
    });
  if ((i.member.id) != 1112708936332759170n) {
    return i.reply({
      content: "API Returned with status code 403.",
      ephemeral: true,
    });
  }
  if (i.commandName === "get") {
    return i.reply({
      content: "```json\n" + JSON.stringify(loadList(), null, 2) + "\n```",
      ephemeral: true,
    });
  }


  modifyList(
    i.options.getString("list"),
    i.options.getString("userid"),
    i.commandName === "add"
  );

  i.reply({ content: "API Returned with status code 200.", ephemeral: true });
});

client.login(DISCORD_TOKEN);

const app = express();

app.get("/raw", (req, res) => {
  res.setHeader("Content-Type", "application/json");

  res.sendFile(LIST_PATH, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to read file." });
    }
  });
});

app.listen(API_PORT, () => console.log(`[API] http://localhost:${API_PORT}`));

module.exports = { modifyList, loadList };
