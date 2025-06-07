import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";
import { getEvolutionData } from "../relay.js";

export default {
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("evolution")
        .setDescription("List evolution factors for each surface"),

    shouldEnable() {
        return config.eventsLogger.events.EVOLUTION;
    },

    async exec(interaction: ChatInputCommandInteraction<CacheType>) {
        let content = "";

        const data = getEvolutionData();
        const keys = Object.keys(data);

        if (keys.length == 0)
            content = "No evolution data stored. Try again in a few minutes.";
        else {
            for (const surface of Object.keys(data))
                content += `${surface.slice(0, 1).toUpperCase()}${surface.slice(1)}: ${(data[surface] * 100).toFixed(2)}%\n`;
        }

        await interaction.reply({
            content: content,
        });
    },
};
