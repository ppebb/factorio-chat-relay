import * as fs from "fs";
import { config } from "./config.js";
import { sendDiscord } from "./message.js";
import { PythonShell } from "python-shell";

const FACTORIOUPDATER = "update_factorio.py";
const MODUPDATER = "mod_updater.py";

export async function checkFactorio() {
    try {
        fs.accessSync(FACTORIOUPDATER);
    }
    catch {
        console.error("Auto-retrieval of Factorio updates has been set to true, but update_factorio.py was not found.");
        return;
    }

    let res = await PythonShell.run(FACTORIOUPDATER, {
        args: [
            "-d",
            "-a",
            config.factorioPath
        ]
    });

    if (!Array.isArray(res) || res == null || res.length == 0) {
        console.log("Error while checking for updates for the Factorio binary. Ensure the provided path in the config file is set correctly. %j", res);
        return;
    }

    res = res as string[];

    // Horrible evil parsing
    if (res[1].includes("No updates available") && !config.silentCheck) {
        console.log(`No updates found for provided Factorio binary (version ${res[0].slice(res[0].indexOf("version as") + 11, res[0].indexOf("from") - 1)}).`);
    }
    else if (res[1].includes("Dry run:")) {
        const lastResult = res[res.length - 1];
        const message = `Newer Factorio packages were found.\nCurrent version: \`${res[0].slice(res[0].indexOf("version as") + 11, res[0].indexOf("from") - 1)}\`\nLatest version: \`${lastResult.slice(lastResult.indexOf("to ") + 3, lastResult.length - 1)}\``;
        await sendDiscord(`<@${config.userToNotify}> ${message}`);
        console.log(message);
    }
}

export async function checkMods() {
    try {
        fs.accessSync(MODUPDATER);
    }
    catch {
        console.error("Auto-retrieval of Factorio mod updates has been set to true, but mod_updater.py was not found.");
        return;
    }

    let res = await PythonShell.run(MODUPDATER, {
        args: [
            "-s", config.factorioSettingsPath,
            "-m", config.factorioModsPath,
            "--fact-path", config.factorioPath,
            "--list",
        ]
    });

    if (!Array.isArray(res) || res == null) {
        console.error(`Failed to run ${MODUPDATER}: %j`, res);
        return;
    }

    res = res as string[];

    if (res[res.length - 1].includes("No updates found"))
        console.log("No mod updates found.");
    else if (res[res.length - 1].includes("has updates available")) {
        await sendDiscord(`<@${config.userToNotify}> Factorio mod updates were found.\n${res.slice(2, res.length).join("\n")}`);
        console.log("Mod updates found.");
        console.log(res.slice(2, res.length));
    }
}
