# factorio-chat-relay

Simple relay between Factorio and a Discord Channel using Factorio's log files
and an Rcon socket.

Note that this does not disable achievements by default.

## Configuration

See `config.example.json`, most options should be self explanatory, but they are detailed here.

| Field                      | Description                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| logFile                    | The factorio log file, specified by `--console-log` in the Factorio binary                                                         |
| eventsLogger.enabled       | Should events-logger's log file be used?*                                                                                          |
| eventsLogger.elFile        | events-logger's log file. Should be located in `script-output/game-events.json`                                                    |
| eventsLogger.events        | Map of the different event types. Set any of them to false to disable their output. See the (Events)[#events] section.             |
| cleanMessages              | Removes `<server>` before every message. This invokes a Lua command and WILL DISABLE ACHIEVEMENTS.                                 |
| adminsCanRunCommands       | Allows users with Discord administrator permissions to invoke Lua commands.                                                        |
| logLevel                   | One of "debug", "info", or "error". Optional and defaults to "error".                                                              |
| startupMessage.enabled     | Should the bot send a message when connecting to the Factorio server?                                                              |
| startupMessage.message     | The message to send when the bot connects to the Factorio server. Optional.                                                        |
| game.factorioPath          | The path to your factorio binary                                                                                                   |
| game.checkUpdates          | Should Factorio updates be checked automatically?                                                                                  |
| game.factorioSettingsPath  | Path to server-settings.json. Required only if game.checkUpdates is set.                                                           |
| game.checkModUpdates       | Should mod updates be checked automatically?                                                                                       |
| game.factorioModsPath      | Path to your mods folder. Required to use the `/mods` command and if game.checkModUpdates is set.                                  |
| game.userToNotify          | User ID to ping when any mods or the factorio binary is out of date. Required if game.checkUpdates or game.checkModUpdates is set. |
| game.checkTime             | How frequently to check for updates (in milliseconds). Required if game.checkUpdates or game.checkModUpdates is set.               |
| rcon.ip                    | Factorio Rcon socket address                                                                                                       |
| rcon.port                  | Factorio Rcon socket port                                                                                                          |
| rcon.password              | Factorio Rcon socket password                                                                                                      |
| rcon.timeout               | Rcon connection timeout (in milliseconds). Optional and defaults to 200.                                                           |
| bot.chatChannel            | Discord channel to log to                                                                                                          |
| bot.token                  | Your Discord bot token (from the developer portal)                                                                                 |
| bot.applicationID          | Your Discord application ID (from the developer portal)                                                                            |

*Requires the [events-logger](https://github.com/Ralnoc/events-logger) mod with the mod's JSON logs option enabled.  
**Requires [factorio-updater](https://github.com/narc0tiq/factorio-updater)'s `update_factorio.py` to be copied to the root of the repository.  
***Requires [factorio-mod-updater](https://github.com/ppebb/factorio-mod-updater)'s `mod_updater.py` to be copied to the root of the repository.  

## Usage

1. Install dependencies with `npm i`
2. Compile the program with `npm run build`
3. Run the program with `npm run start -- --config config.json --refresh-commands`

Note: --refresh-commands only needs to be provided once until new slash commands are added.

## Events
The following events from
[events-logger](https://github.com/Ralnoc/events-logger) are supported:
 - ACHIEVEMENT_GAINED: Send a message on achievement completion.
 - DIED: Send a message on player death.
 - EVOLUTION: Does not send any messages, but enables the /evolution command, which shows the factor for each surface.
 - JOIN: Send a message on player join.
 - LEAVE: Send a message on player disconnect.
 - RESEARCH_STARTED: Send a message when research is started.
 - RESEARCH_FINISHED: Send a message when research is completed.
 - RESEARCH_CANCELLED: Send a message when research is stopped.

Additional events from [events-logger](https://github.com/Ralnoc/events-logger)
may be supported in the future.

## Credit

This project is a full rewrite of
[FactorioChatBot](https://github.com/AGuyNamedJens/FactorioChatBot/), based on
commits from [mikhailmikhalchuk's
fork](https://github.com/mikhailmikhalchuk/FactorioChatBot) and [my own
fork](https://github.com/ppebb/FactorioChatBot).

## License

While the original project is MIT, this project is licened under the AGPLv3
license. See `LICENSE` for more detail.
