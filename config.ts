import { FACTORIOUPDATER, MODUPDATER } from "./checkupdates.js";
import { existsSync, readFileSync } from "fs";
import { LogLevel } from "./logger.js";
import { exit } from "process";

export let config: Config;

export function initConfig(path: string) {
    if (!existsSync(path))
        e(`Config path '${path}' was specified, but the file does not exist!`);

    const buf = readFileSync(path, { encoding: "utf8" });

    try {
        config = JSON.parse(buf);
    }
    catch (err) {
        e(`Failed to parse your config! Please ensure your config is properly formatted! ${err}`);
    }

    // Verify config

    if (!config.logFile)
        e("logFile was not specified in your config!");

    if (!existsSync(config.logFile))
        e(`logFile '${config.logFile} does not exist! Did you set the correct path?`);

    if (config.eventsLogger.enable) {
        if (!config.eventsLogger.elFile)
            e("eventsLogger.enable was set, but eventsLogger.elFile was not specified in your config!");

        if (!existsSync(config.eventsLogger.elFile!))
            e(`eventsLogger.elFile '${config.eventsLogger.elFile} does not exist! Did you set the correct path?`);
    }

    if (config.logLevel != LogLevel.Debug && config.logLevel != LogLevel.Info && config.logLevel != LogLevel.Error && config.logLevel != null)
        e(`config.logLevel was set to an invalid value of '${config.logLevel}'! Pick one of 'debug', 'info', or 'error', or remove the option entirely.`);

    if (!config.logLevel)
        config.logLevel = LogLevel.Error;

    if (!config.game.factorioPath)
        e("game.factorioPath was not specified in your config!");

    if (config.game.checkUpdates) {
        if (!existsSync(FACTORIOUPDATER))
            e(`game.checkUpdates was set, but ${FACTORIOUPDATER} could not be found!`);

        if (!config.game.factorioSettingsPath)
            e("game.checkUpdates was set, but game.factorioSettingsPath was not specified in your config!");

        if (!existsSync(config.game.factorioSettingsPath!))
            e(`game.factorioSettingsPath '${config.game.factorioPath} does not exist! Did you set the correct path?`);
    }

    if (config.game.checkModUpdates) {
        if (!config.game.factorioPath)
            e("game.enableGameChecks was set, but updates.factorioPath was not specified in your config!");

        if (!existsSync(config.game.factorioPath!))
            e(`game.factorioPath '${config.game.factorioPath} does not exist! Did you set the correct path?`);

        if (!config.game.factorioModsPath)
            e("game.enableGameChecks was set, but updates.factorioModsPath was not specified in your config!");

        if (!existsSync(config.game.factorioModsPath!))
            e(`game.factorioModsPath '${config.game.factorioModsPath} does not exist! Did you set the correct path?`);

        if (!existsSync(MODUPDATER))
            e(`game.enablegameChecks was set, but ${MODUPDATER} could not be found!`);
    }

    if (config.game.checkUpdates || config.game.checkModUpdates) {
        if (!existsSync(config.game.factorioPath!))
            e(`game.factorioPath '${config.game.factorioPath} does not exist! Did you set the correct path?`);

        if (!config.game.checkTime)
            e("One of game.enableGameChecks or updates.enableModChecks was set, but updates.checkTime was not specified in your config!");

        if (!config.game.userToNotify)
            e("One of game.enableGameChecks or updates.enableModChecks was set, but updates.userToNotify was not specified in your config!");
    }

    if (config.startupMessage.enabled && !config.startupMessage.message)
        config.startupMessage.message = "Factorio Chat Relay is now Online!";

    if (!config.rcon.ip)
        e("rcon.ip was not specified in your config!");

    if (!config.rcon.port)
        e("rcon.port was not specified in your config!");

    if (!config.rcon.password)
        e("rcon.password was not specified in your config!");

    if (!config.bot.chatChannel)
        e("bot.chatChannel was not specified in your config!");

    if (!config.bot.token)
        e("bot.token was not specified in your config!");

    if (!config.bot.applicationID)
        e("bot.applicationID was not specified in your config!");
}

function e(message: string) {
    // loging may not have been set, so just call error directly.
    console.error(message);
    exit(1);
}

export interface Config {
    logFile: string; // Factorio's log file

    eventsLogger: {
        enable: boolean; // Whether or not to enable events-logger integration.
        elFile: string; // Path to events-logger file
        events: {
            ACHIEVEMENT_GAINED: boolean | null,
            DIED: boolean | null,
            EVOLUTION: boolean | null, // Is not printed, but is made available through a bot command
            JOIN: boolean | null,
            LEAVE: boolean | null,
            RESEARCH_STARTED: boolean | null,
            RESEARCH_FINISHED: boolean | null,
            RESEARCH_CANCELLED: boolean | null,
        }
    };

    cleanMessages: boolean | null; // Should '<server>' be removed from messages. Will disable achievements
    adminsCanRunCommands: boolean | null; // Allow admins to run commands in game (unimplemented)

    logLevel: LogLevel; // Log level (debug, info, error);

    startupMessage: {
        enabled: boolean | null; // Should a startup message be printed
        message: string | null; // The message to print, optional
    };

    game: {
        factorioPath: string; // Path to factortio binary

        checkUpdates: boolean | null; // Should the game be checked for game
        factorioSettingsPath: string | null;

        checkModUpdates: boolean | null; // Should mods be checked for game
        factorioModsPath: string | null;

        checkTime: number | null; // Interval between checks, in milliseconds
        userToNotify: string | null; // User to notify for game
    };

    rcon: {
        ip: string; // IP Factorio is listening for Rcon connections on.
        port: number; // Port factorio is listening on
        password: string; // rcon password
        timeout: number | null; // connection timeout in milliseconds
    };

    bot: {
        chatChannel: string; // Discord channel to log messages to
        applicationID: string; // Application ID for slash commands
        token: string;
    };
}
