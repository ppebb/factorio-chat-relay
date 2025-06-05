import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getOnlinePlayers } from "../utils.js";

export default {
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("online")
        .setDescription("Lists online players"),

    async exec(interaction: ChatInputCommandInteraction<CacheType>) {
        let players = await getOnlinePlayers();

        players = players.map(player => `\`${player}\``);

        await interaction.reply({
            content: `Players Online: ${players.length}\n- ${players.join("\n- ")}`,
        });
    },
};
