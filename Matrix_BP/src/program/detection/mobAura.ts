import { Dimension, EntityHitEntityAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { calculateAngleFromView } from "../../util/fastmath";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
const mobAura = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.mobaura.name"))
    .setDescription(rawtextTranslate("module.mobaura.description"))
    .setToggleId("antiMobAura")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.entityHitEntity.subscribe(entityHitEntity);
    })
    .onModuleDisable(() => {
        world.afterEvents.entityHitEntity.unsubscribe(entityHitEntity);
    })
    .initPlayer((tickData, _playerId, player) => {
        player.mobAuraFlag = 0;
        player.mobAuraLastFlagTimestamp = 0;
        return tickData;
    });
mobAura.register();
const SUMMON_RANDOM_OFFSET = 1.3;
const SUMMON_LOWEST_OFFSET = 1;
const SUMMON_Y_OFFSET = 1.25;
const SAFE_ANGLE_ZONE = 120;
const TEST_ENTITY = "matrix:killaura_dummy";
const MAX_FLAG_AMOUNT = 7;
const MIN_FLAG_INTERVAL = 4000;
function entityHitEntity({ damagingEntity, hitEntity }: EntityHitEntityAfterEvent) {
    if (!(damagingEntity instanceof Player) || damagingEntity.isAdmin()) return;
    let isDummyHit = false;
    try {
        isDummyHit = hitEntity.typeId === TEST_ENTITY && hitEntity?.hasTag("matrix:dummy::" + damagingEntity.id);
    } catch {}
    const location = damagingEntity.location;
    if (isDummyHit) {
        // Prevent spamming
        if (
            damagingEntity.dimension.getEntities({
                tags: ["matrix:dummy::" + damagingEntity.id],
            }).length <= 1
        )
            spawnDummy(location, damagingEntity.getRotation().y, damagingEntity.id, damagingEntity.dimension);
        const now = Date.now();
        if (damagingEntity.mobAuraFlag > 0 && now - damagingEntity.mobAuraLastFlagTimestamp > MIN_FLAG_INTERVAL) {
            damagingEntity.mobAuraFlag = 0;
        }
        damagingEntity.mobAuraFlag++;
        damagingEntity.mobAuraLastFlagTimestamp = now;
        if (damagingEntity.mobAuraFlag >= MAX_FLAG_AMOUNT) {
            damagingEntity.flag(mobAura);
            damagingEntity.mobAuraFlag = 0;
        }
    } else if (
        damagingEntity.dimension.getEntities({
            tags: ["matrix:dummy::" + damagingEntity.id],
        }).length === 0
    ) {
        spawnDummy(location, damagingEntity.getRotation().y, damagingEntity.id, damagingEntity.dimension);
    }
}
function spawnDummy(centerLocation: Vector3, pitch: number, playerId: string, dimension: Dimension) {
    const expectedSpawnLocation = { x: centerLocation.x + getRandomOffset(), y: centerLocation.y + SUMMON_Y_OFFSET, z: centerLocation.z + getRandomOffset() };
    const viewAngle = calculateAngleFromView(centerLocation, expectedSpawnLocation, pitch);
    if (viewAngle > SAFE_ANGLE_ZONE) {
        const dummy = dimension.spawnEntity(TEST_ENTITY, expectedSpawnLocation);
        dummy.addTag("matrix:dummy::" + playerId);
        return dummy;
    } else {
        return spawnDummy(centerLocation, pitch, playerId, dimension);
    }
}
function getRandomOffset() {
    const offset = Math.random() * SUMMON_RANDOM_OFFSET + SUMMON_LOWEST_OFFSET;
    return Math.random() > 0.5 ? offset : -offset;
}
