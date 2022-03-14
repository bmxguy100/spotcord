import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, Message, MessageActionRow, MessageSelectMenu, SelectMenuInteraction, Util } from 'discord.js';
import { formatDurationMs, formatPlural, truncateEllipses } from '../util.js';
import { decode as decodeEntity } from 'html-entities';
import { Track } from '../music/track.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getSubscription } from '../music/subscription.js';
import * as spotify from '../spotify-api.js';

const customIdSelectSearchResultTrack = "select_search_result_track";
const customIdSelectSearchResultAlbum = "select_search_result_album";
const customIdSelectSearchResultPlaylist = "select_search_result_playlist";
const EMOJI_TRACk = "%F0%9F%8E%B5"; // :musical_note:
const EMOJI_ALBUM = "%F0%9F%92%BD"; // :minidisk:
const EMOJI_PLAYLIST = "%F0%9F%93%9C"; // :scroll:
const TRUNCATE_LENGTH = 50
const TRUNCATE_LENGTH_LONG = 100

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from spotify')
    .addStringOption(option => option.setName('query')
        .setDescription('Song to play')
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    let query = interaction.options.getString("query") as string
    let results = await spotify.search(query, ['track'], 1)

    if (results.tracks?.items.length != 1) {
        interaction.reply({
            content: `No results found for query \`${query}\``,
            ephemeral: true
        })
    } else {
        const track = await Track.from(results.tracks!.items[0].id, interaction.user);

        interaction.reply(`\`${Util.escapeMarkdown(track.info.name)}\` added to queue`)
    }
}

export async function interact(interaction: SelectMenuInteraction) {
    if (!interaction.guildId) return;
    if (!(interaction.member instanceof GuildMember)) return

    const updateAndClear = (content: string) => interaction.update({
        content: content,
        components: []
    })

    let subscription = getSubscription(interaction.guildId, true, interaction.member.voice.channel, interaction.channel)

    if (!subscription) {
        await interaction.update('Join a voice channel and then try that again!');
        return;
    }

    switch (interaction.customId) {
        case customIdSelectSearchResultTrack:
            // Extract the track id from the command
            const trackId = interaction.values[0];

            // Make sure the connection is ready before processing the user's request
            try {
                await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
            } catch (error) {
                console.warn(error);
                await interaction.update('Failed to join voice channel within 20 seconds, please try again later!');
                return;
            }

            try {
                let nowPlayingMessage: Message | undefined = undefined
                // Attempt to create a Track from the user's video URL
                const track = await Track.from(trackId, interaction.user);
                // Enqueue the track and reply a success message to the user
                subscription.enqueue(track);
                updateAndClear(`\`${Util.escapeMarkdown(track.info.name)}\` added to queue`)
            } catch (error) {
                console.warn(error);
                await interaction.followUp('Failed to play track, please try again later!');
            }
            break;
        case customIdSelectSearchResultAlbum:
        case customIdSelectSearchResultPlaylist:
            await updateAndClear("Albums and playlists aren't supported yet, please wait")
            break;
        default:
            throw new Error(`Unknown interaction ID ${interaction.customId}`)
    }
}
