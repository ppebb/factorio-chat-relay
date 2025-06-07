import * as fs from "fs";
import { config } from "./config.js";
import { log, LogLevel } from "./logger.js";
import { sendDiscord } from "./message.js";
import { PythonShell, PythonShellErrorWithLogs } from "python-shell";

export const FACTORIOUPDATER = "update_factorio.py";
export const MODUPDATER = "mod_updater.py";

export function startUpdateChecks() {
    if (config.game.checkUpdates) {
        checkFactorio();
        if (config.game.checkTime! > 0) {
            setInterval(checkFactorio, config.game.checkTime!);
        }
    }

    if (config.game.checkModUpdates) {
        checkMods();
        if (config.game.checkTime! > 0) {
            setInterval(checkMods, config.game.checkTime!);
        }
    }
}

export async function checkFactorio() {
    try {
        fs.accessSync(FACTORIOUPDATER);
    }
    catch {
        log(LogLevel.Error, "Auto-retrieval of Factorio updates has been set to true, but update_factorio.py was not found.");
        return;
    }

    let res;
    try {
        res = await PythonShell.run(FACTORIOUPDATER, {
            args: [
                "-d",
                "-a",
                config.game.factorioPath
            ]
        });
    }
    catch (err) {
        res = (err as PythonShellErrorWithLogs).logs;
    }

    if (!Array.isArray(res) || res == null || res.length == 0) {
        log(LogLevel.Error, "Error while checking for updates for the Factorio binary. Ensure the provided path in the config file is set correctly. %j", res);
        return;
    }

    res = res as string[];

    // Horrible evil parsing
    if (res[1].includes("No updates available")) {
        log(LogLevel.Info, `No updates found for provided Factorio binary (version ${res[0].slice(res[0].indexOf("version as") + 11, res[0].indexOf("from") - 1)}).`);
    }
    else if (res[1].includes("Dry run:")) {
        const lastResult = res[res.length - 1];
        const message = `Newer Factorio packages were found.\nCurrent version: \`${res[0].slice(res[0].indexOf("version as") + 11, res[0].indexOf("from") - 1)}\`\nLatest version: \`${lastResult.slice(lastResult.indexOf("to ") + 3, lastResult.length - 1)}\``;
        await sendDiscord(`<@${config.game.userToNotify}> ${message}`);
        log(LogLevel.Info, message);
    }
}

export async function checkMods() {
    try {
        fs.accessSync(MODUPDATER);
    }
    catch {
        log(LogLevel.Error, "Auto-retrieval of Factorio mod updates has been set to true, but mod_updater.py was not found.");
        return;
    }

    let res;
    try {
        res = await PythonShell.run(MODUPDATER, {
            args: [
                "-s", config.game.factorioSettingsPath!,
                "-m", config.game.factorioModsPath!,
                "--fact-path", config.game.factorioPath,
                "--list",
            ]
        });
    }
    catch (err) {
        res = (err as PythonShellErrorWithLogs).logs;
    }

    if (!Array.isArray(res) || res == null || res.length == 0) {
        log(LogLevel.Error, `Failed to run ${MODUPDATER}: %j`, res);
        return;
    }

    res = res as string[];

    if (res[res.length - 1].includes("No updates found"))
        log(LogLevel.Info, "No mod updates found.");
    else if (res[res.length - 1].includes("has updates available")) {
        await sendDiscord(`<@${config.game.userToNotify}> Factorio mod updates were found.\n${res.slice(2, res.length).join("\n")}`);
        log(LogLevel.Info, "Mod updates found.");
        log(LogLevel.Info, res.slice(2, res.length));
    }
}
