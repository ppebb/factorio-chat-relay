// This file kind of sucks. I needed a good way to define each type and
// convert from the base into the derived based on the FactorioEventType.
// Simply assigning every field from the json object is Good Enough for me, and
// this is cleaner (imo, even tho it still kinda sucks) than alternatives where
// I just throw everything a big switch case and format based on the
// FactorioEventType.

import { log, LogLevel } from "./logger.js";

export enum FactorioEventType {
    AchievementGained = "ACHIEVEMENT_GAINED",
    Died = "DIED",
    Evolution = "EVOLUTION",
    Join = "JOIN",
    Leave = "LEAVE",
    ResearchStarted = "RESEARCH_STARTED",
    ResearchFinished = "RESEARCH_FINISHED",
    ResearchCancelled = "RESEARCH_CANCELLED",

    // Unhandled...
    Banned = "BANNED", // Included unban event
    CorpseExpired = "CORPSE_EXPIRED",
    ItemPickedUp = "ITEM_PICKED_UP",
    EntityRepaired = "ENTITY_REPAIRED",
    BuiltEntity = "BUILT_ENTITY",
    Destroyed = "DESTROYED",
    PostDestroyed = "POST_DESTROYED",
    Chat = "CHAT",
    Stats = "STATS",
    Tick = "TICK",
    CargoPodFinishedAscending = "CARGO_POD_FINISHED_ASCENDING",
    RocketLaunchOrdered = "ROCKET_LAUNCH_ORDERED",
    RocketLaunched = "ROCKET_LAUNCHED",
    Artillery = "ARTILLERY",
    Unknown = "UNKNOWN"
}

// These classes are intended to be created via json deserialization
export class FactorioEvent {
    name: string = "";
    event: FactorioEventType = FactorioEventType.Unknown;
    tick: number = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        Object.assign(this, jsonObject);
    }

    format(): string {
        return `Event ${this.event}. Name ${this.name}`;
    }

    resolveEvent(): FactorioEvent | null {
        switch (this.event) {
        case FactorioEventType.AchievementGained:
            return new AchievementGainedEvent(this);
        case FactorioEventType.Died:
            return new DiedEvent(this);
        case FactorioEventType.Evolution:
            return new EvolutionEvent(this);
        case FactorioEventType.Join:
            return new JoinEvent(this);
        case FactorioEventType.Leave:
            return new LeaveEvent(this);
        case FactorioEventType.ResearchStarted:
            return new ResearchStartedEvent(this);
        case FactorioEventType.ResearchFinished:
            return new ResearchFinishedEvent(this);
        case FactorioEventType.ResearchCancelled:
            return new ResearchCancelledEvent(this);
        default:
            // Unimplemented events should not be logged.
            log(LogLevel.Debug, `Skipping Unimplemented event ${this.event}`);
            return null;
        }
    }
}

export class AchievementGainedEvent extends FactorioEvent {
    player: string = "";
    achievement_name: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        return `Achievement ${toPascalCase(this.achievement_name)} accomplished by ${this.player}!`;
    }
}

export class DiedEvent extends FactorioEvent {
    reason: string = "";
    cause: string | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        if (this.cause == "no-cause")
            return `Player ${this.name} died to ${toPascalCase(this.reason)}`;

        if (this.reason == "PVP")
            return `Player ${this.name} died in combat with ${toPascalCase(this.cause ?? "unknown")}`;

        if (!this.cause)
            return `Player ${this.name} died to ${toPascalCase(this.reason)}`;

        return `Player ${this.name} died to ${toPascalCase(this.cause)}`;
    }
}

export class EvolutionEvent extends FactorioEvent {
    stats: {
        factor: number,
        surface: string,
    } = {
            factor: 0,
            surface: "",
        };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        const factorFormatted = (this.stats.factor * 100).toFixed();
        return `Evolution has reached ${factorFormatted}% on surface ${this.stats.surface}`;
    }
}

export class JoinEvent extends FactorioEvent {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        return `${this.name} joined the game`;
    }
}

export class LeaveEvent extends FactorioEvent {
    reason: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        return `Player ${this.name} left the game: ${toPascalCase(this.reason)}`;
    }
}

abstract class ResearchEvent extends FactorioEvent {
    level: string = "";
    abstract verb: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);
    }

    override format(): string {
        const name = toPascalCase(this.name);

        if (this.level == "no-level")
            return `Research ${name} ${this.verb}!`;

        return `Research ${name} Level ${this.level} ${this.verb}!`;
    }
}

export class ResearchStartedEvent extends ResearchEvent {
    override verb = "started";
}

export class ResearchFinishedEvent extends ResearchEvent {
    override verb = "finished";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
        Object.assign(this, jsonObject);

        // It appears the finish event number is 1 high...
        const levelInt = Number.parseInt(this.level);

        if (!levelInt || isNaN(levelInt))
            return;

        if (Number.parseInt(this.level) > 0)
            this.level = (levelInt - 1).toString();
    }
}

export class ResearchCancelledEvent extends ResearchEvent {
    override verb = "cancelled";
}

function toPascalCase(str: string) {
    const splits = str.split("-");

    for (let i = 0; i < splits.length; i++) {
        const split = splits[i];

        splits[i] = split.slice(0, 1).toUpperCase() + split.slice(1);
    }

    return splits.join(" ");
}
