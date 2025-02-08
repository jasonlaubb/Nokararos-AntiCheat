import { Vector2, Vector3, VectorXZ } from "@minecraft/server";
import { PredictionData } from "./detection/predictionModule";
export interface TickData {
    instant: {
        rotation: Vector2;
        velocity: Vector3;
        speedXZ: number;
    };
    global: {
        lastRotation: Vector2;
        lastLocation: Vector3;
        lastVelocity: Vector3;
        lastSpeedXZ: number;
    };
    aim: {
        buffer: number[];
        initialize: {
            i: number;
            state: boolean;
        };
        previousYaw: number[];
        previousPitch: number[];
        previousDeltaYaw: number[];
        previousDeltaPitch: number[];
        yawAccelData: number[];
        pitchAccelData: number[];
        lastFlagTimestamp: number;
    };
    autoClicker: {
        amount: number;
        lastFlagTimestamp: number;
    };
    autoTool: {
        startBreak: number;
        lastSelectedSlot: number;
        breakType: string;
    };
    elytaFly: {
        startGlideTime: number;
        startGlideSpeed: number;
        isSpeedDecreasing: boolean;
        highestGlidingSpeed: number;
        isLastTickGliding: boolean;
        usedRocket: boolean;
        lastSpeedDeviation: number;
        triggeredType2: boolean;
    };
    entityFly: {
        pastVelocityY: number[];
        lastNotRidingLocation: Vector3;
        prefectCombo: number;
        superCombo: number;
        illegalFactorAmount: number;
    };
    fly: {
        lastOnGroundLocation: Vector3;
        lastFlaggedLocation: Vector3;
        velocityYList: number[];
        flagAmount: number;
        lastFlagTimestamp: number;
        hasStarted: number;
    };
    invalidSprint: {
        flagCount: number;
        nonBlindnessSprintState: boolean;
    };
    killaura: {
        roundFlagAmount: number;
        lastAttackRot: Vector2;
        lastRoundTimestamp: number;
        lastIntegerTimestamp: number;
        integerFlagAmount: number;
    };
    phase: {
        lastLocationList: Vector3[];
        lastSpeedList: number[];
    };
    predictionModule: PredictionData;
    scaffold: {
        blockLogs: number[];
        lastPlaceTimeStamp: number;
        lastDiag: VectorXZ;
        lastExtender: number;
        potentialDiagFlags: number;
        potentialRotFlags: number;
        potentialLowExtenderFlags: number;
        godBridgeAmount: number;
        isVoidScaffold: boolean[];
        lastRotX: number;
        lastLocation: Vector3;
    };
    speed: {
        lastAttackTimestamp: number;
        lastRidingEndTimestamp: number;
        flagAmount: number;
        lastFlagTimestamp: number;
        lastStopLocation: Vector3;
        lastSleep: number;
        previousSpeed: number[];
        timerFlagAmount: number;
        lastTriggerLocation: Vector3;
        lastTimerFlagTimestamp: number;
        timerMainFlagAmount: number;
    };
}
export default [
    "./program/detection/firewall",
    "./program/detection/speed",
    "./program/detection/predictionModule",
    "./program/detection/phase",
    "./program/detection/fly",
    "./program/detection/killaura",
    "./program/detection/mobAura",
    "./program/detection/aim",
    "./program/detection/timer",
    "./program/detection/autoclicker",
    "./program/detection/namespoof",
    "./program/detection/scaffold",
    "./program/detection/insteabreak",
    "./program/detection/reach",
    "./program/detection/invalidSprint",
    "./program/detection/itemcheck",
    "./program/detection/captcha",
    "./program/detection/entityFly",
    "./program/detection/elytraFly",
    "./program/detection/autoTool",
    "./program/detection/deviceBanning",
    "./program/utility/welcomer",
    "./program/utility/worldBorder",
    "./program/utility/chatRankAndAntiSpam",
    "./program/utility/antiAfk",
    "./program/utility/antiCombatLog",
    "./program/command/about",
    "./program/command/help",
    "./program/command/op",
    "./program/command/deop",
    "./program/command/setadmin",
    "./program/command/setmodule",
    "./program/command/listmodule",
    "./program/command/set",
    "./program/command/matrixui",
    "./program/command/vanish",
    "./program/command/modCommand",
    "./program/command/invsee",
    "./program/command/setpassword",
    "./program/command/configui",
    "./program/command/echestwipe",
    "./program/command/rank",
    "./program/command/reset",
    "./program/command/log",
    "./program/command/reconnect",
];
