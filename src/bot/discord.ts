import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Interaction } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = '1391491249365712979';
const guildId = '1391496058919452672';

if (!token) {
  console.error('❌ Missing DISCORD_BOT_TOKEN in .env');
  process.exit(1);
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('logmeal')
    .setDescription('Log a meal with SelfOS')
    .addStringOption(opt =>
      opt.setName('text')
         .setDescription('Meal description')
         .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands() {
  try {
    console.log('🚀 Registering slash commands...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

// Setup bot client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`🤖 SelfOS bot logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'logmeal') {
    const text = interaction.options.getString('text', true);
    // TODO: Firestore + GPT integration
    await interaction.reply(`Logging meal: **${text}** (not yet saved)`);
  }
});

// Start bot
(async () => {
  await registerCommands();
  await client.login(token);
})();