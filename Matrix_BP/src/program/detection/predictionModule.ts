import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { isSurroundedByAir, isSteppingOnIceOrSlime, isMovedUp, getDelta } from "../../util/util";
let eventId: IntegratedSystemEvent;
const EMPTY_LOCATION_DATA_ARRAY: LocationData[] = new Array(5).fill({ location: { x: 0, y: 0, z: 0 }, inAir: false });
/**
 * @author 4urxa
 * @link https://github.com/Dream23322/Isolate-Anticheat/tree/b5c443c739ff06fdfeeb7ced4ec30a9cc5c52933/scripts/checks/movement/prediction
 * @description Optimized by jasonlaubb.
 */
const predictionModule = new Module()
	.addCategory("detection")
	.setName(rawtextTranslate("module.prediction.name"))
	.setDescription(rawtextTranslate("module.prediction.description"))
	.setToggleId("predictionModule")
	.setPunishment("ban")
	.onModuleEnable(() => {
		eventId = Module.subscribePlayerTickEvent(tickEvent, false);
	})
	.onModuleDisable(() => {
		predictionData.clear();
		Module.clearPlayerTickEvent(eventId);
	})
	.initPlayer((playerId, player) => {
		predictionData.set(playerId, {
			isInit: false,
			spawnTime: Date.now(),
			locationData: EMPTY_LOCATION_DATA_ARRAY,
			lastLocation: { x: 0, y: 0, z: 0 },
			lastVelocity: { x: 0, y: 0, z: 0 },
			previousVelocity: { x: 0, y: 0, z: 0 },
			lastSneak: false,
			lastGround: false,
			airTime: 0,
			totalFlagAmount: 0,
			lastFlagTimestamp: 0,
			lastOnGroundLocation: player.location,
		});
	})
	.initClear((playerId) => {
		predictionData.delete(playerId);
	});
predictionModule.register();
interface LocationData {
	location: Vector3;
	inAir: boolean;
}
interface PredictionData {
	isInit: boolean;
	spawnTime: number;
	locationData: LocationData[];
	lastLocation: Vector3;
	lastVelocity: Vector3;
	previousVelocity: Vector3;
	lastSneak: boolean;
	lastGround: boolean;
	airTime: number;
	totalFlagAmount: number;
	lastFlagTimestamp: number;
	lastOnGroundLocation: Vector3;
}
const predictionData = new Map<string, PredictionData>();
const badEffects = ["speed", "jump_boost", "slowness", "slow_falling", "levitation", "wind_charged"];
function tickEvent (player: Player) {
	let data = predictionData.get(player.id)!;
	const now = Date.now();
	if (!data.isInit && now - data.spawnTime > 7000) {
		data.isInit = true;
	}
	const velocity = player.getVelocity();
	const isPlayerInAir = !player.isOnGround && isSurroundedByAir(player.location, player.dimension);
	if (isPlayerInAir) {
		data.airTime++;
	} else data.airTime = 0;
	if (player.isOnGround && velocity.y === 0) {
		data.lastOnGroundLocation = player.location;
	}
	if (data.isInit && !player.isFlying && !player.isGliding) {
		const hasBadEffect = badEffects.some((effect) => player.getEffect(effect));
		const isDamaged = (now - player.timeStamp.knockBack < 2000) || (now - player.timeStamp.riptide < 5000);
		const isTeleported = velocity.x === 0 && velocity.z === 0 && (data.lastLocation.x !== player.location.x || data.lastLocation.z !== player.location.z);
		const iceAndSlime = isSteppingOnIceOrSlime(player);
		if (!hasBadEffect && !isDamaged && !isTeleported && !iceAndSlime) {
			if (data.totalFlagAmount > 0 && now - data.lastFlagTimestamp > MAX_INTERVAL) {
				data.totalFlagAmount = 0;
			}
			// Gravity check
			data = checkPrediction(data, now);
			if (data.totalFlagAmount > THRESHOLD) {
				player.teleport(data.lastOnGroundLocation);
				player.flag(predictionModule);
				data.totalFlagAmount = 0;
			}
		}
	}
	data.locationData.unshift({ location: player.location, inAir: isPlayerInAir });
	data.locationData.pop();
	data.previousVelocity = data.lastVelocity;
	data.lastVelocity = velocity;
	data.lastSneak = player.isSneaking;
	data.lastGround = player.isOnGround;
	data.lastLocation = player.location;
	predictionData.set(player.id, data);
}
const DOWN_FACTOR = -0.00655;
const THRESHOLD = 20;
const MAX_INTERVAL = 4000;
function checkPrediction(data: PredictionData, now: number): PredictionData {
    // Check if the player is in the air.
    const isAllInAir = data.locationData.every((locationData) => locationData.inAir);
    if (!isAllInAir) return data;

    // Calculate the difference in y coordinates of the player's positions.
    const deltaY = getDelta(data.locationData.map((x) => x.location.y));
    // Calculate the minimum downward acceleration that is possible with normal gravity.
    const min_down_accel = DOWN_FACTOR * data.airTime;

    // Iterate through the differences in y coordinates and check if the player is in a state that is not possible with normal gravity.
    for (let i = 1; i < deltaY.length; i++) {
        const lastDelta = deltaY[i - 1];
        if (
            // Check if the player is not moving up and the downward acceleration is greater than the minimum downward acceleration.
            (!isMovedUp(data.locationData.map((i) => i.location)) &&
                deltaY[i] > min_down_accel) ||
            // Check if the player is in the air for more than one tick and the downward acceleration is greater than the previous downward acceleration and greater than 0.
            (data.airTime > 1 &&
                deltaY[i] >= lastDelta &&
                lastDelta > 0.003 &&
                deltaY[i] > 0) ||
            // Check if the player is moving down and the previous downward acceleration is greater than 0.
            (deltaY[i] < 0 && lastDelta > 1e-4)
        ) {
            // Increment the flag amount and set the last flag timestamp to the current time.
            data.totalFlagAmount++;
            data.lastFlagTimestamp = now;
            break;
        }
    }
    return data;
}
