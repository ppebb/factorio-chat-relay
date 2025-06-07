import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";
import child_process from "child_process";

export default {
    adminOnly: false,

    data: new SlashCommandBuilder()
        .setName("version")
        .setDescription("Prints the current server version"),

    async exec(interaction: ChatInputCommandInteraction<CacheType>) {
        const proc = child_process.spawn(config.game.factorioPath, ["--version"], {
            cwd: process.cwd(),
            stdio: "pipe"
        });

        let stdoutAgg = "";
        proc.stdout.on("data", (chunk) => {
            stdoutAgg += chunk.toString();
        });

        let stderrAgg = "";
        proc.stderr.on("data", (chunk) => {
            stderrAgg += chunk.toString();
        });

        proc.on("close", async (code, _) => {
            if (code != 0) {
                await interaction.reply({
                    content: `Failed to query version: ${stdoutAgg}, ${stderrAgg}`,
                });

                return;
            }

            await interaction.reply({
                content: stdoutAgg,
            });
        });
    },
};
