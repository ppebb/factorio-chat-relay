import { config } from "./config.js";
import { client } from "./index.js";
import { sendDiscord, sendFactorio } from "./message.js";
import { Rcon } from "rcon-client";
import { getOnlinePlayers, plural } from "./utils.js";

let rcon: Rcon;
let tries = 0;

export function rconConnect() {
    rcon = new Rcon({
        host: config.RconIP,
        port: config.RconPort,
        password: config.RconPassword,
        timeout: config.RconTimeout > 0 ? config.RconTimeout : 200
    });

    rcon.connect().catch(error => {
        console.error(error);

        if (tries < 10) {
            console.log(`Attempting to reconnect... (${tries}/10)`);
            setTimeout(function() {
                rconConnect();
                tries++;
            }, 5000);
        }
    });

    rcon.on("connect", () => {
        console.log("Connected to the Factorio server!");
    });

    rcon.on("authenticated", async () => {
        console.log("Authenticated!");

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
        console.error(`Error: ${err}`);
        await rcon.end();
    });

    rcon.on("end", async () => {
        console.log("Socket connection ended!");
    });
}

export async function RconSend(message: string) {
    if (!rcon.authenticated)
        throw "Rcon socket has not authenticated";

    console.log(`Writing message to rcon: '${message}'`);

    return rcon.send(message);
}
