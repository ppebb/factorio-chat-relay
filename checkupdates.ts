import { config } from "./config.js";
import { log, LogLevel } from "./logger.js";
import { sendDiscord } from "./message.js";
import * as fsp from "fs/promises";
import * as path from "path";
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

const defaultMods = ["base", "elevated-rails", "quality", "space-age"];
const modFileRegexp = /^(.*)_(\d+[.]\d+[.]\d+)[.]zip$/;

interface FactorioMod {
    name: string,
    enabled: boolean,
    path: string,
    version: string,
    latest: string | null,
}

// Adapted from https://github.com/pdemonaco/factorio-mod-updater
export async function checkMods() {
    const mods = await collectMods();
    const factorioVersion = (await gameVersion()).version;

    for (const mod of mods) {
        const res = await fetch(`https://mods.factorio.com/api/mods/${mod.name}/full`);

        if (!res.ok) {
            log(LogLevel.Error, "Failed to query info for mod " + mod.name);
            continue;
        }

        const json = await res.json();

        const validReleases = [];

        for (const relInfo of json.releases) {
            if (relInfo.info_json.factorio_version != factorioVersion)
                continue;

            validReleases.push(relInfo);
        }

        if (validReleases.length != 0)
            mod.latest = validReleases[validReleases.length - 1].version;
    }

    const modsToUpdate = mods.filter((mod) => mod.latest && mod.latest != mod.version);

    if (modsToUpdate.length == 0) {
        log(LogLevel.Info, "No mod updates found.");
        return;
    }

    const joined = modsToUpdate.map((mod) => `${mod.name} has updates available! ${mod.version} -> ${mod.latest}`)
        .join("\n");

    await sendDiscord(`<@${config.game.userToNotify}> Factorio mod updates were found.\n${joined}`);
    log(LogLevel.Info, "Mod updates found.");
    log(LogLevel.Info, joined);
}

async function collectMods() {
    const mods: FactorioMod[] = [];
    const modListPath = path.join(config.game.factorioModsPath!, "mod-list.json");
    const json = JSON.parse(await fsp.readFile(modListPath, { encoding: "utf8" }));

    if (!json.mods) {
        log(LogLevel.Info, "mod-list.json is either malformed or no mods have been enabled!");
        return mods;
    }

    if (json.mods.length == 0) {
        log(LogLevel.Info, "no mods are enabled, no updates are available");
        return mods;
    }

    const modFiles = (await Array.fromAsync(fsp.glob(config.game.factorioModsPath + "/*.zip")))
        .map((modPath) => path.basename(modPath));

    for (const mod of json.mods) {
        if (defaultMods.includes(mod.name))
            continue;

        if (!mod.enabled)
            continue;

        const modPath = modFiles.find((path) => {
            const match = modFileRegexp.exec(path);

            if (!match)
                return false;

            if (match[1] == mod.name)
                return true;
        });

        if (!modPath) {
            log(LogLevel.Info, `Skipping mod ${mod.name}, which appears not to be installed!`);
            continue;
        }

        const match = modFileRegexp.exec(modPath);
        if (!match) {
            log(LogLevel.Info, `Skipping mod ${mod.name}:${modPath}, which appears not have a version!`);
            continue;
        }

        mods.push({
            name: mod.name,
            enabled: mod.enabled,
            path: modPath,
            version: match[2],
            latest: null,
        });
    }

    return mods;
}
