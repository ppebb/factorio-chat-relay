import { Events, GuildChannel, GuildMember, Message, MessageType, OmitPartialGroupDMChannel } from "discord.js";
import { config } from "./config.js";
import { EvolutionEvent, FactorioEvent, FactorioEventType } from "./events.js";
import { FileWrapper } from "./filewrapper.js";
import { client, Dictionary } from "./index.js";
import { log, LogLevel } from "./logger.js";
import { sendDiscord, sendFactorio } from "./message.js";
import { plural } from "./utils.js";

const pingRegex = /<@([0-9]+)>/;

const evolutionData: Dictionary<number> = {};

export function getEvolutionData() {
    return evolutionData;
}

export function startRelay() {
    new FileWrapper(config.logFile, true, handleGameLogWatchEvent);

    if (config.eventsLogger.enable)
        new FileWrapper(config.eventsLogger.elFile, true, handleELWatchEvent);

    client.on(Events.MessageCreate, async (message: OmitPartialGroupDMChannel<Message<boolean>>) => {
        const zl = message.content.length == 0;
        const as = message.attachments.size;

        if (zl && as == 0)
            return;

        if (message.author.bot)
            return;

        if (message.channelId != config.bot.chatChannel)
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

            replySegment = ` [color=#57aef2](in reply to ${replyName})[/color]`;
        }

        const matches = pingRegex.exec(message.content);

        if (matches) {
            for (const match of matches) {
                const member = message.guild?.members.cache.get(match);

                if (!member)
                    continue;

                const memberName = member.nickname ?? member.displayName;
                message.content = message.content.replaceAll(`<@${match}>`, `[color=#cc7f21]@${memberName}[/color]`);
            }
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

async function handleGameLogWatchEvent(data: Buffer, filename: string | null) {
    const lines = data.toString("utf8");

    for (const line of lines.trim().split("\n")) {
        log(LogLevel.Debug, `Read event ${line} from ${filename}`);
        const [discordMessage, factorioMessage] = await parseMessage(line);

        if (discordMessage)
            await sendDiscord(discordMessage);

        if (factorioMessage)
            await sendFactorio(factorioMessage);
    }
}

// Returns the discord and the factorio message
async function parseMessage(message: string): Promise<[string | null, string | null]> {
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
        if (config.eventsLogger.enable)
            return [null, null];

        return [`:red_circle: | ${contents}`, `[color=red]${contents}[/color]`];
    }

    if (message.includes("[JOIN]")) {
        if (config.eventsLogger.enable)
            return [null, null];

        return [`:green_circle: | ${contents}`, `[color=green]${contents}[/color]`];
    }

    if (message.includes("[CHAT]") && !message.includes("[CHAT] <server>")) {
        // Don't log annoying pings and whatnot
        if (message.includes("[gps=") || message.includes("[train-stop=") || message.includes("[train="))
            return [null, null];

        const usersPinged: GuildMember[] = [];

        const contentsCopy = new String(contents).toString();
        let atIdx = contentsCopy.indexOf("@");

        while (atIdx != -1) {
            let nextSpace = contentsCopy.indexOf(" ", atIdx);

            // Just go to the end of the string then...
            if (nextSpace == -1)
                nextSpace = contentsCopy.length;

            const uname = contentsCopy.slice(atIdx + 1, nextSpace);
            const unameLower = uname.toLowerCase();
            const members = (client.channels.cache.get(config.bot.chatChannel) as GuildChannel).guild.members;

            for (const [snowflake, member] of await members.fetch()) {
                if (member.nickname?.toLowerCase() == unameLower
                    || member.displayName.toLowerCase() == unameLower
                    || member.user.globalName?.toLowerCase() == unameLower
                    || member.user.username.toLowerCase() == unameLower) {
                    contents = contents.replaceAll(`@${uname}`, `<@${snowflake}>`);
                    usersPinged.push(member);
                    break;
                }
            }

            atIdx = contentsCopy.indexOf("@", nextSpace);
        }

        // Inform the factorio user the pings actually went through
        if (usersPinged.length != 0)
            sendFactorio(`Pinged [color=#cc7f21]${usersPinged.map(m => "@" + (m.nickname ?? m.user.username)).join(", ")}[/color]`);

        return [`${player}: ${contents}`, null];
    }

    if (message.includes("[WARNING]"))
        return [`:yellow_circle: | ${contents}`, null];

    return [null, null];
}

async function handleELWatchEvent(data: Buffer, filename: string | null) {
    const lines = data.toString("utf8");

    for (const line of lines.trim().split("\n")) {
        log(LogLevel.Debug, `Read event ${line} from ${filename}`);
        const [discordMessage, factorioMessage] = parseELMessage(line);

        if (discordMessage)
            await sendDiscord(discordMessage);

        if (factorioMessage)
            await sendFactorio(factorioMessage);
    }
}

// Returns the discord and the factorio message
function parseELMessage(message: string): [string | null, string | null] {
    const e = JSON.parse(message);

    const fevent = new FactorioEvent(e).resolveEvent();

    if (!fevent)
        return [null, null];

    const formatted = fevent.format();

    if (!(config.eventsLogger.events as Dictionary<boolean>)[fevent.event]) {
        log(LogLevel.Debug, `Skipping disabled event ${fevent.event}`);
        return [null, null];
    }

    switch (e.event) {
    case FactorioEventType.AchievementGained:
        return [`:trophy: | ${formatted}`, null];
    case FactorioEventType.Join:
        return [`:green_circle: | ${formatted}`, `[color=green]${formatted}[/color]`];
    case FactorioEventType.Leave:
        return [`:red_circle: | ${formatted}`, `[color=red]${formatted}[/color]`];
    case FactorioEventType.Died:
        return [`:skull: | ${formatted}`, null];
    case FactorioEventType.Evolution: {
        const stats = (e as EvolutionEvent).stats;
        // Don't report evolution on platforms or in personal sandboxes
        if (stats.surface.includes("platform") || stats.surface.includes("bpsb-lab"))
            return [null, null];

        evolutionData[stats.surface] = stats.factor;
        return [null, null];
    }
    case FactorioEventType.ResearchStarted:
    case FactorioEventType.ResearchFinished:
    case FactorioEventType.ResearchCancelled:
        return [`:alembic: | ${formatted}`, null];
    default:
        return [formatted, null];
    }
}
