import { CacheType, ChatInputCommandInteraction, Client, Events, GuildMember, IntentsBitField, MessageFlags, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPutAPIApplicationCommandsResult, Routes, SlashCommandOptionsOnlyBuilder, TextChannel } from "discord.js";
import { config, initConfig } from "./config.js";
import * as fs from "fs";
import * as path from "path";
import { startRelay } from "./relay.js";
import { checkFactorio, checkMods } from "./checkupdates.js";
import { rconConnect } from "./rcon.js";
import { clearLogFile } from "./utils.js";

export const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages] });
let refresh = false;

for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    switch (arg) {
    case "--refresh-commands":
        refresh = true;
        break;
    case "--config":
        if (process.argv.length > i + 1) {
            let configPath = process.argv[i + 1];

            if (configPath.charAt(0) != "/")
                configPath = path.join(process.cwd(), configPath);

            console.log("Config retrieved from " + configPath);
            i++;

            initConfig(configPath);
        }

        break;
    default:
        console.error("Unknown argument: " + arg);
    }
}

client.once(Events.ClientReady, async function(readyClient) {
    console.log(`Logged in as ${readyClient.user.tag}`);

    const channel = await client.channels.fetch(config.chatChannel);

    if (!channel) {
        console.error("Invalid chatChannel set!");
        process.exit(1);
    }
    else
        console.log(`Using chat channel ${(channel as TextChannel).name}`);

    clearLogFile();

    rconConnect();

    startRelay();

    if (config.autoCheckUpdates) {
        checkFactorio();
        if (config.checkTime > 0) {
            setInterval(checkFactorio, config.checkTime);
        }
    }

    if (config.autoCheckModUpdates) {
        checkMods();
        if (config.checkTime > 0) {
            setInterval(checkMods, config.checkTime);
        }
    }
});

client.login(config.token);

function isAllowedInteraction(interaction: ChatInputCommandInteraction<CacheType>, adminOnly: boolean) {
    if (!adminOnly)
        return true;

    return (interaction.member as GuildMember)?.permissions.has("Administrator");
}

interface Command {
    adminOnly: boolean,
    data: SlashCommandOptionsOnlyBuilder,
    init?: () => Promise<void>,
    exec: (_: ChatInputCommandInteraction<CacheType>) => Promise<void>,
}

export interface Dictionary<T> { [key: string]: T }
async function resolveCommands(root: string, files: string[], callback: (_: Dictionary<Command>) => void) {
    const ret: Dictionary<Command> = {};

    for (const file of files) {
        let spec = await import(path.join(root, file));
        spec = spec.default;

        if (spec == undefined || spec == null)
            continue;

        if ("init" in spec)
            await spec.init();

        if ("data" in spec && "exec" in spec) {
            const name = path.basename(file, ".js");
            console.log(`Registered command ${name} from file ${file}`);
            ret[name] = spec;
        }
        else
            console.error(`The command at ${file} is missing a required data or exec property`);
    }

    callback(ret);
}

async function handleCommand(interaction: ChatInputCommandInteraction<CacheType>, commands: Dictionary<Command>) {
    if (!interaction.isChatInputCommand())
        return;

    try {
        for (const cname in commands) {
            if (cname != interaction.commandName)
                continue;

            const command = commands[cname];
            const allowed = isAllowedInteraction(interaction, command.adminOnly);
            if (!allowed) {
                await interaction.reply({ content: `Command ${cname} is not allowed!` });
                return;
            }

            await command.exec(interaction);
            return;
        }

        await interaction.reply({ content: `No command exists by the name of ${interaction.commandName}` });
        return;
    }
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred)
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        else
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
    }
}

async function refreshCommands(commands: Dictionary<Command>) {
    const commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

    for (const cname in commands)
        commandsJson.push(commands[cname].data.toJSON());

    console.log("Refreshing global slash commands");

    const rest = new REST().setToken(config.token);

    const data = await rest.put(
        Routes.applicationCommands(config.applicationID),
        { body: commandsJson }
    ) as RESTPutAPIApplicationCommandsResult;

    console.log(`Successfully reloaded ${data.length} global application (/) commands`);
}

const commandsRoot = path.join(import.meta.dirname ?? __dirname, "commands");
const commandFiles = fs.readdirSync(commandsRoot).filter(file => file.endsWith(".js"));

resolveCommands(commandsRoot, commandFiles, (commands) => {
    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isChatInputCommand())
            handleCommand(interaction as ChatInputCommandInteraction<CacheType>, commands);
    });

    if (refresh)
        refreshCommands(commands);
});
