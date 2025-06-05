import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as fs from "fs";
import { config } from "../config.js";

export default {
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("mods")
        .setDescription("Lists the mods on the server"),

    async exec(interaction: ChatInputCommandInteraction<CacheType>) {
        if (!fs.existsSync(config.factorioModsPath)) {
            await interaction.reply({ content: "There are no mods enabled." });
            return;
        }

        let files = fs.readdirSync(config.factorioModsPath, { encoding: "utf8" });

        files = files.filter(file => file.endsWith(".zip"));

        if (files.length == 0) {
            await interaction.reply({ content: "There are no mods enabled." });
            return;
        }

        interaction.reply({
            content: files.map((file) => {
                let ret = file.slice(0, -4);
                const uidx = ret.lastIndexOf("_");

                if (uidx > 0) {
                    const modName = ret.slice(0, uidx);
                    const version = ret.slice(uidx + 1, ret.length);

                    ret = `${modName} v${version}`;
                }

                return ret;
            }).join("\n"),
        });
    },
};
