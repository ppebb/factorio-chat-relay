import { TextChannel } from "discord.js";
import { config } from "./config.js";
import { client } from "./index.js";
import { log, LogLevel } from "./logger.js";
import { RconSend } from "./rcon.js";

export async function sendFactorio(message: string) {
    if (config.cleanMessages)
        await RconSend(`/silent-command game.print([==[${message}]==])`);
    else
        await RconSend(message);
};

export async function sendDiscord(message: string) {
    log(LogLevel.Debug, `Sending message to Discord: '${message}'`);
    return (client.channels.cache.get(config.bot.chatChannel) as TextChannel).send(message);
}
