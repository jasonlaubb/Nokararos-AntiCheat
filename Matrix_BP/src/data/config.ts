import { Punishment } from "../program/system/moderation";

export default {
    disableConsoleOutput: false,
    security: {
        containsPassword: false,
        passwordHash: "",
    },
    modules: {
        antiSpeed: {state: true, punishment: "default"}, // Not suggesting to set this to false
        predictionModule: {state: false, punishment: "default"},
        antiFly: {state: true, punishment: "default"}, // Not suggesting to set this to false
        antiTimer: {state: false, punishment: "default"}, // Eliminated detection
        firewall: {state: false, punishment: "default"},
        antiNamespoof: {state: true, punishment: "default"},
        antiKillAura: {state: true, punishment: "default"},
        antiMobAura: {state: true, punishment: "default"},
        antiScaffold: {state: true, punishment: "default"},
        antiInsteaBreak: {state: false, punishment: "default"},
        antiReach: {state: true, punishment: "default"},
        antiPhase: {state: true, punishment: "default"},
        antiInvalidSprint: {state: true, punishment: "default"},
        itemCheck: {state: false, punishment: "default"},
        aimCheck: {state: false, punishment: "default"},
        welcomer: {state: true, punishment: "none"},
        worldBorder: {state: false, punishment: "none"},
        chatRank: {state: false, punishment: "none"},
        antiAfk: {state: false, punishment: "none"},
        antiCombatLog: {state: false, punishment: "none"},
        captcha: {state: false, punishment: "none"},
        antiEntityFly: {state: true, punishment: "default"},
        antiElytraFly: {state: true, punishment: "default"},
        antiAutoClicker: {state: true, punishment: "default"},
    } as { [key: string]: { state: boolean, punishment: Punishment | "default" } },
    command: {
        about: true,
        help: true,
        op: true,
        deop: true,
        setmodule: true,
        listmodule: true,
        set: true,
        matrixui: true,
        vanish: true,
        kick: true,
        ban: true,
        softban: true,
        mute: true,
        unmute: true,
        unfreeze: true,
        unsoftban: true,
        warn: true,
        clearwarn: true,
        invsee: true,
        setpassword: true,
        clearpassword: true,
        configui: true,
        setrank: true,
        reset: true,
        unblink: true,
    } as { [key: string]: boolean },
    customize: {
        dataValueToPrecision: 4,
        askWetherFalseFlag: true,
    },
    logSettings: {
        logCommandUsage: true,
        logAutoMod: true,
        logPlayerJoinLeave: true,
    },
    sensitivity: {
        antiBlink: false, // Stop blink movement (antiTimer), more lagback will be given.
        strengthenAntiSpeed: false, // Stronger anti speed, reverses the location instantly.
        maxVelocityExaggeration: 0.5, // Higher the value will allow higher sensitivity for fighting against anti timer, should not be too high.
    },
    flag: {
        banDuration: 604800,
    },
    antiAutoClicker: {
        maxCps: 24,
        maxFlag: 3,
        minFlagIntervalMs: 10000,
    },
    worldBorder: {
        borderLength: 1000,
        useWorldSpawn: true,
        centerLocation: {
            x: 0,
            y: 0,
            z: 0,
        },
    },
    chatRank: {
        pattern: "§7§l<§r§f%rank%§l§7> §e%name%: §r%message%",
        splitter: "§r§7,§f",
        defaultRank: "Member",
        topRankOnly: false,
    },
    antiXray: {
        debug: false,
    },
    userRecruitmentFunction: true,
};
