import { Punishment } from "../program/system/moderation";

export default {
    security: {
        containsPassword: false,
        passwordHash: "",
    },
    modules: {
        antiSpeed: { state: true, punishment: "default" }, // Not suggesting to set this to false
        predictionModule: { state: false, punishment: "default" },
        antiFly: { state: true, punishment: "default" }, // Not suggesting to set this to false
        antiTimer: { state: false, punishment: "default" }, // Eliminated detection
        firewall: { state: false, punishment: "default" },
        antiNamespoof: { state: true, punishment: "default" },
        antiKillAura: { state: true, punishment: "default" },
        antiMobAura: { state: true, punishment: "default" },
        antiScaffold: { state: true, punishment: "default" },
        antiInsteaBreak: { state: false, punishment: "default" },
        antiReach: { state: true, punishment: "default" },
        antiPhase: { state: true, punishment: "default" },
        antiInvalidSprint: { state: true, punishment: "default" },
        itemCheck: { state: false, punishment: "default" },
        aimCheck: { state: false, punishment: "default" },
        welcomer: { state: true, punishment: "none" },
        worldBorder: { state: false, punishment: "none" },
        chatRank: { state: false, punishment: "none" },
        antiAfk: { state: false, punishment: "none" },
        antiCombatLog: { state: false, punishment: "none" },
        captcha: { state: false, punishment: "none" },
        antiEntityFly: { state: true, punishment: "default" },
        antiElytraFly: { state: true, punishment: "default" },
        antiAutoClicker: { state: true, punishment: "default" },
        antiAutoTool: { state: true, punishment: "default" },
        deviceBan: { state: false, punishment: "kick" },
    } as { [key: string]: { state: boolean; punishment: Punishment | "default" } },
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
        mute: true,
        crash: true,
        unmute: true,
        invsee: true,
        setpassword: true,
        clearpassword: true,
        configui: true,
        setrank: true,
        reset: true,
        unblink: true,
        log: true,
        logui: true,
        daylog: true,
    } as { [key: string]: boolean },
    extraBlockOnSpammer: true,
    customize: {
        dataValueToPrecision: 4,
        askWetherFalseFlag: true,
        banMinute: 10080,
        permanent: false,
    },
    logSettings: {
        logCommandUsage: true,
        logAutoMod: true,
        logPlayerJoinLeave: true,
    },
    sensitivity: {
        antiSpeed: {
            correctSpikeDelta: true,
            maxVelocityExaggeration: 0.5, // (antiSpeed) Higher the value will allow higher sensitivity for fighting against anti timer, should not be too high.
            type1MaxFlag: 12,
            type2MaxFlag: 2,
        },
        antiAutoClicker: {
            maxCps: 24,
            maxFlag: 3,
            minFlagIntervalMs: 10000,
        },
        deviceBan: {
            banDesktop: false,
            banMobile: false,
            banConsoleDevice: false,
        },
        elytraFly: {
            maxSpeedDeviation: 50,
        },
        antiFly: {
            type1MaxFlag: 2,
        },
        antiInvalidSprint: {
            maxFlag: 35,
        },
        antiReach: {
            maxReach: 4.5,
            reachBuffer: 2,
            maxFlag: 11,
        },
        antiScaffold: {
            scaffoldBlockLimit: 4,
        },
        antiPhase: {
            enhanceDetection: true,
            locationCorrectDelay: 10,
        },
    },
    flag: {
        banDuration: 604800,
        flagMode: "all", // "none", "all", "admin", "tag", "hidden"
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
    debug: {
        pauseAllPunishment: false, // Stop all punishment on util function.
    },
};
