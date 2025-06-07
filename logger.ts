import { config } from "./config.js";

export enum LogLevel {
    Debug = "debug",
    Info = "info",
    Error = "error",
}

export function log(level: LogLevel, fmt: string | unknown, ...args: unknown[]) {
    if (level == LogLevel.Debug && config.logLevel != LogLevel.Debug)
        return;

    if (level == LogLevel.Info && config.logLevel != LogLevel.Debug && config.logLevel != LogLevel.Info)
        return;

    if (level == LogLevel.Error)
        console.error(fmt, ...args);
    else
        console.log(fmt, ...args);
}
