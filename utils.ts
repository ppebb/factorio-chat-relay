import { RconSend } from "./rcon.js";
import { config } from "./config.js";
import child_process from "child_process";

export function plural(count: number, text: string) {
    return count == 1 ? text : text + "s";
}

export async function getOnlinePlayers(): Promise<string[]> {
    const res = await RconSend("/p o");
    const split = res.split("\n").slice(1, -1);

    const ret: string[] = [];

    for (const player of split)
        ret.push(player.trim().split(" (online)")[0]);

    return ret;
}

interface GameVersionData {
    version: string,
    arch: number, // 64 or 32
    mapinput: string,
    mapoutput: string,
    raw: string,
}

export async function gameVersion(): Promise<GameVersionData> {
    return new Promise<GameVersionData>((resolve, reject) => {
        const proc = child_process.spawn(config.game.factorioPath, ["--version"], {
            cwd: process.cwd(),
            stdio: "pipe"
        });

        let stdoutAgg = "";
        proc.stdout.on("data", (chunk) => {
            stdoutAgg += chunk.toString();
        });

        let stderrAgg = "";
        proc.stderr.on("data", (chunk) => {
            stderrAgg += chunk.toString();
        });

        proc.on("close", async (code, _) => {
            if (code != 0)
                reject(`Failed to query version: ${stdoutAgg}, ${stderrAgg}`);

            const trimmed = stdoutAgg.trim();
            const split = trimmed.split("\n");
            resolve({
                version: split[0].slice(9, split[0].indexOf(" ", 10)),
                arch: Number.parseInt(split[1].slice(9, 11)),
                mapinput: split[2].slice(19, split[2].length),
                mapoutput: split[3].slice(20, split[3].length),
                raw: trimmed,
            });
        });
    });
}
