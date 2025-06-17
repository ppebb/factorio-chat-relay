import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { gameVersion } from "../utils.js";

export default {
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("version")
        .setDescription("Prints the current server version"),

    async exec(interaction: ChatInputCommandInteraction<CacheType>) {
        await interaction.reply({
            content: (await gameVersion()).raw,
        });
    }
};
