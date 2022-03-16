import dotenv from 'dotenv';
dotenv.config()

import './i18n.js'

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdirSync } from 'node:fs';
import { isProd } from './util.js';
const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env as Record<string, string>;

const commands = [];
const commandFiles = readdirSync('./dist/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

console.log(JSON.stringify(commands, null, 4))

const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

console.log('Started refreshing application (/) commands.');

if (isProd()) {
    await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body: commands },
    );
} else {
    await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commands },
    );
}

console.log('Successfully reloaded application (/) commands.');
