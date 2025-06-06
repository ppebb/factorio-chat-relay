import { existsSync, readFileSync } from "fs";
import { exit } from "process";

export let config: Config;

export function initConfig(path: string) {
    if (!existsSync(path)) {
        console.error(`Config path '${path}' was specified, but the file does not exist!`);
        exit(1);
    }

    const buf = readFileSync(path, { encoding: "utf8" });
    config = JSON.parse(buf);
}

export interface Config {
    logFile: string;
    elFile: string | null;

    chatChannel: string;
    cleanMessages: boolean;
    adminsCanRunCommands: boolean;
    sendServerMessages: boolean;
    sendGPSMessages: boolean;

    logLines: boolean;

    startupMessage: {
        enabled: boolean;
        message: string;
    }

    factorioPath: string;
    autoCheckUpdates: boolean;
    userToNotify: string;
    checkTime: number;
    silentCheck: boolean;

    RconIP: string;
    RconPort: number;
    RconPassword: string;
    RconTimeout: number;

    applicationID: string;
    token: string;

    autoCheckModUpdates: boolean;
    factorioSettingsPath: string;
    factorioModsPath: string;
}
