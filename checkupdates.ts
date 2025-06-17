import * as fs from "fs";
import { config } from "./config.js";
import { log, LogLevel } from "./logger.js";
import { sendDiscord } from "./message.js";
import { PythonShell, PythonShellErrorWithLogs } from "python-shell";
import { gameVersion } from "./utils.js";

export const MODUPDATER = "mod_updater.py";

export function startUpdateChecks() {
    if (config.game.checkUpdates) {
        checkFactorio();
        if (config.game.checkTime! > 0)
            setInterval(checkFactorio, config.game.checkTime!);
    }

    if (config.game.checkModUpdates) {
        checkMods();
        if (config.game.checkTime! > 0)
            setInterval(checkMods, config.game.checkTime!);
    }
}

// Adapted from https://github.com/narc0tiq/factorio-updater
export async function checkFactorio() {
    const res = await fetch("https://updater.factorio.com/get-available-versions");

    if (!res.ok) {
        log(LogLevel.Error, "Error while fetching Factorio update data: %d, %s", res.status, res.statusText);
        return;
    }

    const json = await res.json();
    const clh64 = json["core-linux_headless64"];
    if (!clh64 || !Array.isArray(clh64)) {
        log(LogLevel.Error, "Factorio update response is missing or contains an invalid core-linux_headless64!");
        return;
    }

    const lastEntry = clh64[clh64.length - 1];

    if (!lastEntry.stable) {
        log(LogLevel.Error, "Factorio update response's core-linux_headless64 is missing a stable entry!");
        return;
    }

    const gameVersionData = await gameVersion();
    if (lastEntry.stable != gameVersionData.version) {
        const message = `Newer Factorio packages were found.\nCurrent version: \`${gameVersionData.version}\`\nLatest version: \`${lastEntry.stable}\``;
        await sendDiscord(`<@${config.game.userToNotify}> ${message}`);
        log(LogLevel.Info, message);
    } else {
        log(LogLevel.Info, `No updates found for provided Factorio binary (version ${gameVersionData.version}).`);
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
