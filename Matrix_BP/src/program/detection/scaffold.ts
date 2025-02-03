import { Dimension, GameMode, Player, PlayerPlaceBlockAfterEvent, Vector3, VectorXZ, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { calculateAngleFromView, calculateDistance, fastAbs, fastHypot } from "../../util/fastmath";
import { floorLocation, getAngleLimit, getBlockCenterLocation } from "../../util/util";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
const ABSOLUTE_DISTANCE = 1.75;
const HIGH_DISTANCE_THRESHOLD = 3.5;
const FLAT_ROTATION_THRESHOLD = 69.5;
const HIGH_ROTATION_THRESHOLD = 79;
const NO_EXTENDER_ROTATION_THRESHOLD = 20;
const COMMON_ROTATION_THRESHOLD = 30;
const LOG_CLEAR_TIME = 750;
const MAX_ROTATION_X_DIFFERENCE = 10;
const MAX_LOW_EXTENDER_ROTATION_X = 50;
const LOW_EXTENDER_THRESHOLD = 1;
interface ScaffoldDataMap {
    blockLogs: number[];
    lastPlaceTimeStamp: number;
    lastLocation: Vector3;
    lastDiag: VectorXZ;
    lastExtender: number;
    lastRotX: number;
    potentialDiagFlags: number;
    potentialRotFlags: number;
    potentialLowExtenderFlags: number;
    godBridgeAmount: number;
    isVoidScaffold: boolean[];
}
const scaffoldDataMap = new Map<string, ScaffoldDataMap>();
const scaffold = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.scaffold.name"))
    .setDescription(rawtextTranslate("module.scaffold.description"))
    .setToggleId("antiScaffold")
    .setPunishment("crash")
    .initPlayer((playerId) => {
        scaffoldDataMap.set(playerId, {
            blockLogs: [],
            lastPlaceTimeStamp: 0,
            lastLocation: { x: 0, y: 0, z: 0 },
            lastDiag: { x: 0, z: 0 },
            lastExtender: 0,
            lastRotX: 0,
            potentialDiagFlags: 0,
            potentialRotFlags: 0,
            potentialLowExtenderFlags: 0,
            godBridgeAmount: 0,
            isVoidScaffold: new Array(3).fill(false),
        });
    })
    .initClear((playerId) => {
        scaffoldDataMap.delete(playerId);
    })
    .onModuleEnable(() => {
        world.afterEvents.playerPlaceBlock.subscribe(onBlockPlace);
    })
    .onModuleDisable(() => {
        world.afterEvents.playerPlaceBlock.unsubscribe(onBlockPlace);
        scaffoldDataMap.clear();
    });
scaffold.register();
function onBlockPlace(event: PlayerPlaceBlockAfterEvent) {
    const block = event.block;
    const player = event.player;
    if (player.isFlying || player.getGameMode() == GameMode.creative || player.isAdmin()) return;
    if (!block?.isValid()) {
        // Type 1
        player.flag(scaffold, { t: "1" });
        return;
    }
    const { x: rotX, y: rotY } = player.getRotation();
    const absRotX = fastAbs(rotX);
    if (absRotX != 90 && (rotX % 5 == 0 || Number.isInteger(rotY))) {
        // Type 2
        player.flag(scaffold, { t: "2", rotX, rotY });
        return;
    }
    const headLocation = event.player.getHeadLocation();
    const blockCenterLocation = getBlockCenterLocation(block.location);
    const distance = calculateDistance(headLocation, blockCenterLocation);
    if (distance > ABSOLUTE_DISTANCE && absRotX < FLAT_ROTATION_THRESHOLD) {
        const angle = calculateAngleFromView(headLocation, blockCenterLocation, rotY);
        const angleLimit = getAngleLimit(player.clientSystemInfo.platformType);
        if (angle > angleLimit) {
            // Type 3
            player.flag(scaffold, { t: "3", angle, angleLimit });
            return;
        }
    }
    const data = scaffoldDataMap.get(player.id)!;
    if (distance > HIGH_DISTANCE_THRESHOLD && absRotX > HIGH_ROTATION_THRESHOLD) {
        // Type 4
        player.flag(scaffold, { t: "4", distance, absRotX });
        return;
    }
    const floorPlayerLocation = floorLocation(player.location);
    if (player.isJumping) floorPlayerLocation.y--;
    const lowExtenderScaffold = isLowExtenderScaffolding(floorPlayerLocation, blockCenterLocation);
    const voidScaffold = isVoidScaffolding(block.dimension, block.location);
    const now = Date.now();
    data.blockLogs.push(now);
    data.blockLogs = data.blockLogs.filter((time) => now - time < LOG_CLEAR_TIME);
    const noBypassEffect = !hasBypassEffect(player);
    if (lowExtenderScaffold) {
        if (voidScaffold && data.blockLogs.length > Module.config.sensitivity.antiScaffold.scaffoldBlockLimit && noBypassEffect) {
            // Type 5
            player.flag(scaffold, { t: "5" });
        } else if (rotX < NO_EXTENDER_ROTATION_THRESHOLD) {
            // Type 6
            player.flag(scaffold, { t: "6", rotX });
        }
    }
    const fairHeight = block.location.y - player.location.y;
    const isScaffoldHeight = fairHeight > -2.1 && fairHeight <= -1;
    const maxDiagSpeed = calculateDiagSpeedLimit(distance, player.isOnGround, fairHeight, rotX, data.lastRotX);
    const diag = getDiagXZ(block.location, data.lastLocation);
    const extender = getExtender(block.location, player.location);
    const diagScaffold = isDiagScaffold(data.lastDiag, diag);
    const placeInterval = now - data.lastPlaceTimeStamp;
    if (!player.isFlying && isScaffoldHeight && placeInterval < maxDiagSpeed && diagScaffold && (extender - data.lastExtender > 0 || extender < 1)) {
        data.potentialDiagFlags++;
        if (data.potentialDiagFlags >= 3) {
            data.potentialDiagFlags = 0;
            // Type 7
            player.flag(scaffold, { t: "7", placeInterval, maxDiagSpeed, extender, lastExtender: data.lastExtender });
        }
    }
    const lastBlockDistance = calculateDistance(headLocation, getBlockCenterLocation(data.lastLocation));
    if (rotX < COMMON_ROTATION_THRESHOLD && placeInterval < 600 && distance < 1.44 && lastBlockDistance < 1.44 && player.location.y > block.location.y) {
        // Type 8
        player.flag(scaffold, { t: "8", placeInterval, distance, lastBlockDistance });
    }
    const scaffoldState =
        !player.isFlying &&
        ((isScaffolding(extender, data.lastExtender) && isScaffoldHeight) ||
            (player.location.y > block.location.y && player.isOnGround && !player.isJumping && block.location.y == data.lastLocation.y && calculateDistance(block.location, data.lastLocation) < Math.SQRT2));
    if (scaffoldState) {
        if (!diagScaffold || placeInterval > 500) data.potentialDiagFlags = 0;
        const rotXDeviation = fastAbs(data.lastRotX - rotX);
        if (placeInterval < 200 && placeInterval >= 100 && rotXDeviation > MAX_ROTATION_X_DIFFERENCE && !diagScaffold && player.isMoving()) {
            data.potentialRotFlags++;
            if (data.potentialRotFlags >= 3) {
                // Type 9
                player.flag(scaffold, { t: "9", rotXDeviation, placeInterval });
                data.potentialRotFlags = 0;
            }
        } else if (placeInterval > 200 || placeInterval < 25 || Math.abs(data.lastRotX - rotX) < 0.5) data.potentialRotFlags = 0;
        if (rotX < MAX_LOW_EXTENDER_ROTATION_X && extender < LOW_EXTENDER_THRESHOLD && extender > 0 && !player.isOnGround) {
            data.potentialLowExtenderFlags++;
            if (data.potentialLowExtenderFlags >= 3) {
                // Type 10
                player.flag(scaffold, { t: "10", rotX, extender });
                data.potentialLowExtenderFlags = 0;
            }
        } else data.potentialLowExtenderFlags = 0;
        const { x, y } = player.inputInfo.getMovementVector();
        if (placeInterval < 200 && (voidScaffold || data.isVoidScaffold.includes(true)) && (y > 0 || fastAbs(x) === 1)) {
            data.godBridgeAmount++;
            if (data.godBridgeAmount >= Module.config.sensitivity.antiScaffold.scaffoldBlockLimit) {
                // Type 11
                player.flag(scaffold, { t: "11" });
                data.godBridgeAmount = 0;
            }
        } else data.godBridgeAmount = 0;
    }

    // Update data value.
    data.lastPlaceTimeStamp = now;
    data.lastDiag = diag;
    data.lastLocation = block.location;
    data.lastExtender = extender;
    data.lastRotX = rotX;
    data.isVoidScaffold.push(voidScaffold);
    data.isVoidScaffold.shift();
    scaffoldDataMap.set(player.id, data);
}

function isLowExtenderScaffolding({ x: x1, y: y1, z: z1 }: Vector3, { x: x2, y: y2, z: z2 }: Vector3): boolean {
    const absDistance = fastHypot(x2 - x1, z2 - z1);
    const height = y1 - y2;
    return height == 1 && absDistance <= Math.SQRT2;
}

function calculateDiagSpeedLimit(distance: number, isOnGround: boolean, extender: number, rotationX: number, lastRotX: number) {
    const commonScaffold = distance > 0 && distance < 0.3 && isOnGround && extender < 1;
    let diagSpeedLimit = 500;
    if (commonScaffold && lastRotX == rotationX) diagSpeedLimit = 150;
    if ((distance > 0.1 && !isOnGround) || extender >= 1 || distance > 0.5 || rotationX >= 80) diagSpeedLimit = 500;
    if (commonScaffold && lastRotX != rotationX) diagSpeedLimit = 50;
    return diagSpeedLimit;
}

function getExtender({ x: blockX, z: blockZ }: Vector3, { x: playerX, z: playerZ }: Vector3) {
    const absoluteDistanceX = fastAbs(blockX - playerX) - 0.2;
    const absoluteDistanceZ = fastAbs(blockZ - playerZ) - 0.2;
    const simulatedDistanceX = fastAbs(blockX + absoluteDistanceX * 2 - playerX);
    const simulatedDistanceZ = fastAbs(blockZ + absoluteDistanceZ * 2 - playerZ);
    let actualDistanceX = absoluteDistanceX;
    let actualDistanceZ = absoluteDistanceZ;
    if (simulatedDistanceX > absoluteDistanceX) actualDistanceX++;
    if (simulatedDistanceZ > absoluteDistanceZ) actualDistanceZ++;
    const extender = fastHypot(actualDistanceX, actualDistanceZ);
    return extender;
}

function getDiagXZ({ x: currentX, z: currentZ }: Vector3, { x: lastX, z: lastZ }: Vector3) {
    return { x: currentX - lastX, z: currentZ - lastZ } as VectorXZ;
}

function isDiagScaffold(lastDiag: VectorXZ, diag: VectorXZ) {
    return (lastDiag.x == 1 && diag.x == 0 && lastDiag.z == 0 && diag.z == 1) || (lastDiag.x == 0 && diag.x == 1 && lastDiag.z == 1 && diag.z == 0);
}

function isScaffolding(extender: number, lastExtender: number) {
    return extender - lastExtender <= 0.1 || extender < 1;
}

function isVoidScaffolding(dimension: Dimension, blockLocation: Vector3) {
    const belowLocation = { x: blockLocation.x, y: blockLocation.y - 1, z: blockLocation.z };
    try {
        const belowBlock = dimension.getBlock(belowLocation);
        return !!belowBlock?.isValid() && belowBlock.isAir;
    } catch {
        return true;
    }
}

function hasBypassEffect(player: Player) {
    return player.getEffect(MinecraftEffectTypes.Speed) || player.getEffect(MinecraftEffectTypes.JumpBoost);
}
