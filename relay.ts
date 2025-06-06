import { Events, Message, MessageType, OmitPartialGroupDMChannel } from "discord.js";
import { config } from "./config.js";
import { FactorioEvent, FactorioEventType } from "./events.js";
import * as fs from "fs";
import { client } from "./index.js";
import { sendDiscord, sendFactorio } from "./message.js";
import { plural } from "./utils.js";

export function startRelay() {
    fs.watch(config.logFile, { encoding: "utf8" }, handleGameLogWatchEvent);

    if (config.elFile)
        fs.watch(config.elFile, { encoding: "utf8" }, handleELWatchEvent);

    client.on(Events.MessageCreate, async (message: OmitPartialGroupDMChannel<Message<boolean>>) => {
        const zl = message.content.length == 0;
        const as = message.attachments.size;

        if (zl && as == 0)
            return;

        if (message.author.bot)
            return;

        if (message.channelId != config.chatChannel)
            return;

        const name = message.member?.nickname ?? message.author.username;

        let replySegment: string = "";
        if (message.type == MessageType.Reply) {
            const reply = await message.fetchReference();
            let replyName: string;

            // If the user replied to us, check the message to see if it
            // contains a Factorio username we can use.
            if (reply.member?.user.bot && reply.member.user.id == (client.user?.id ?? "")) {
                const colonIdx = reply.content.indexOf(":");
                // If it's a username, it should not start with a : like system
                // messages with an emoji, but it should contain a colon after
                if (colonIdx > 0)
                    replyName = reply.content.slice(0, colonIdx);
                else
                    replyName = client.user?.displayName ?? client.user?.username ?? "relay";

            } else
                replyName = reply.member?.nickname ?? reply.author.username;

            replySegment = ` (in reply to ${replyName})`;
        }

        // Only attachments
        if (zl) {
            const fwd = `[color=#7289DA][Discord] ${name}${replySegment}:[/color]\n[${as} ${plural(as, "attachment")}]`;

            await sendFactorio(fwd);
        }
        else {
            let fwd = `[color=#7289DA][Discord] ${name}${replySegment}: ${message.content}[/color]`;

            if (as != 0)
                fwd += `\n[${as} ${plural(as, "attachment")}]`;

            await sendFactorio(fwd);
        }
    });
}

async function handleGameLogWatchEvent(eventType: fs.WatchEventType, filename: string | null) {
    if (eventType != "change")
        return;

    const line = await lastLine(config.logFile);
    console.log(`Read event ${line} from ${filename}`);
    const [discordMessage, factorioMessage] = parseMessage(line);

    if (discordMessage)
        await sendDiscord(discordMessage);

    if (factorioMessage)
        await sendFactorio(factorioMessage);
}

async function lastLine(filename: string) {
    const data = fs.readFileSync(filename, { encoding: "utf8" });

    const lines = data.trim().split("\n");
    return lines[lines.length - 1];
}

// Returns the discord and the factorio message
function parseMessage(message: string): [string | null, string | null] {
    const braceIdx = message.indexOf("]");
    const semiIdx = message.indexOf(": ");
    const player = message.slice(braceIdx + 2, semiIdx);

    let contents: string;
    if (semiIdx < braceIdx)
        contents = message.slice(braceIdx + 2);
    else
        contents = message.slice(semiIdx + 2);

    if (!message.length || braceIdx <= 1)
        return [null, null];

    // If events-logger is enabled, get the more detailed leave/join from there
    if (message.includes("[LEAVE]")) {
        if (config.elFile)
            return [null, null];

        return [`:red_circle: | ${contents}`, `[color=red]${contents}[/color]`];
    }

    if (message.includes("[JOIN]")) {
        if (config.elFile)
            return [null, null];

        return [`:green_circle: | ${contents}`, `[color=green]${contents}[/color]`];
    }

    if (message.includes("[CHAT]") && !message.includes("[CHAT] <server>")) {
        // Don't log annoying pings and whatnot
        if (message.includes("[gps=") || message.includes("[train-stop=") || message.includes("[train="))
            return [null, null];

        return [`${player}: ${contents}`, null];
    }

    if (message.includes("[WARNING]"))
        return [`:yellow_circle: | ${contents}`, null];

    return [null, null];
}

async function handleELWatchEvent(eventType: fs.WatchEventType, filename: string | null) {
    if (eventType != "change")
        return;

    const line = await lastLine(config.elFile!);
    console.log(`Read event ${line} from ${filename}`);
    const [discordMessage, factorioMessage] = parseELMessage(line);

    if (discordMessage)
        await sendDiscord(discordMessage);

    if (factorioMessage)
        await sendFactorio(factorioMessage);
}

// Returns the discord and the factorio message
function parseELMessage(message: string): [string | null, string | null] {
    const e = JSON.parse(message);

    const fevent = new FactorioEvent(e).resolveEvent();

    if (!fevent)
        return [null, null];

    const formatted = fevent.format();

    switch (e.event) {
    case FactorioEventType.Join:
        return [`:green_circle: | ${formatted}`, `[color=green]${formatted}[/color]`];
    case FactorioEventType.Leave:
        return [`:red_circle: | ${formatted}`, `[color=red]${formatted}[/color]`];
    case FactorioEventType.Died:
        return [`:skull: | ${formatted}`, null];
    default:
        return [formatted, null];
    }
}
