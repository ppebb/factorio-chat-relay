// This file kind of sucks. I needed a good way to define each type and
// convert from the base into the derived based on the FactorioEventType.
// Simply assigning every field from the json object is Good Enough for me, and
// this is cleaner (imo, even tho it still kinda sucks) than alternatives where
// I just throw everything a big switch case and format based on the
// FactorioEventType.

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

    resolveEvent(): FactorioEvent {
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
            return this;
        }
    }
}

export class AchievementGainedEvent extends FactorioEvent {
    player: string = "";
    achievement_name: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
    }

    override format(): string {
        return `Achievement ${this.achievement_name} accomplished by ${this.player}!`;
    }
}

export class DiedEvent extends FactorioEvent {
    reason: string = "";
    cause: string | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
    }

    override format(): string {
        if (this.cause == "no-cause")
            return `Player ${this.name} died to ${this.reason}`;

        if (this.reason == "PVP")
            return `Player ${this.name} died in combat with ${this.cause}`;

        if (!this.cause)
            return `Player ${this.name} died to ${this.reason}`;

        return `Player ${this.name} died to ${this.cause}`;
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
    }

    override format(): string {
        return `${this.name} left the game: ${this.reason}`;
    }
}

export class ResearchStartedEvent extends FactorioEvent {
    level: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
    }

    override format(): string {
        if (this.level == "no-level")
            return `Research ${this.name} started!`;

        return `Research ${this.name} Level ${this.level} started!`;
    }
}

export class ResearchFinishedEvent extends FactorioEvent {
    level: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
    }

    override format(): string {
        if (this.level == "no-level")
            return `Research ${this.name} finished!`;

        return `Research ${this.name} Level ${this.level} finished!`;
    }
}

export class ResearchCancelledEvent extends FactorioEvent {
    level: string = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(jsonObject: any) {
        super(jsonObject);
    }

    override format(): string {
        if (this.level == "no-level")
            return `Research ${this.name} cancelled!`;

        return `Research ${this.name} Level ${this.level} cancelled!`;
    }
}
