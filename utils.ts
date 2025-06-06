import { RconSend } from "./rcon.js";

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
