import { config } from "./config.js";
import { client } from "./index.js";
import { log, LogLevel } from "./logger.js";
import { sendDiscord, sendFactorio } from "./message.js";
import { Rcon } from "rcon-client";
import { getOnlinePlayers, plural } from "./utils.js";

let rcon: Rcon;
let tries = 0;

export function rconConnect() {
    rcon = new Rcon({
        host: config.rcon.ip,
        port: config.rcon.port,
        password: config.rcon.password,
        timeout: config.rcon.timeout && config.rcon.timeout > 0 ? config.rcon.timeout : 200
    });

    rcon.connect().catch(error => {
        log(LogLevel.Error, error);

        if (tries < 10) {
            log(LogLevel.Info, `Attempting to reconnect... (${tries}/10)`);
            setTimeout(function() {
                rconConnect();
                tries++;
            }, 5000);
        }
    });

    rcon.on("connect", () => {
        log(LogLevel.Info, "Connected to the Factorio server!");
    });

    rcon.on("authenticated", async () => {
        log(LogLevel.Info, "Authenticated!");

        if (!config.startupMessage.enabled)
            return;

        await sendFactorio("[Chat System]: " + config.startupMessage.message);
        await sendDiscord("[Chat System]: " + config.startupMessage.message);

        async function updateStatus() {
            const players = await getOnlinePlayers();

            client.user?.setPresence({
                status: "online",
                activities: [{
                    name: "Stats",
                    type: 4,
                    state: `${players.length} ${plural(players.length, "player")} online!`,
                }]
            });
        }

        updateStatus();
        setInterval(updateStatus, 60000);
    });

    rcon.on("error", async (err) => {
        log(LogLevel.Error, `Error: ${err}`);
        await rcon.end();
    });

    rcon.on("end", async () => {
        log(LogLevel.Info, "Socket connection ended!");
    });
}

export async function RconSend(message: string) {
    if (!rcon.authenticated)
        throw "Rcon socket has not authenticated";

    log(LogLevel.Debug, `Writing message to rcon: '${message}'`);

    return rcon.send(message);
}
