import { EntityDamageCause, EntityHitEntityAfterEvent, EntityHurtAfterEvent, EquipmentSlot, ItemReleaseUseAfterEvent, ItemUseAfterEvent, PistonActivateAfterEvent, Player, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { MinecraftEnchantmentTypes, MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

export interface PlayerTimeStamp {
    knockBack: number;
    riptide: number;
    pistonPush: number;
}
export function registerTimeStampModule() {
    new Module()
        .lockModule()
        .addCategory("system")
        .onModuleEnable(() => {
            world.afterEvents.entityHurt.subscribe(onPlayerHurt);
            world.afterEvents.itemReleaseUse.subscribe(onPlayerThrow);
            world.afterEvents.itemUse.subscribe(onPlayerUse);
            world.afterEvents.entityHitEntity.subscribe(onPlayerAttack);
            world.afterEvents.pistonActivate.subscribe(onPistonPush);
        })
        .initPlayer((_playerId, player) => {
            player.timeStamp = {
                knockBack: 0,
                riptide: 0,
                pistonPush: 0,
            };
        })
        .register();
}
function onPlayerHurt({ hurtEntity: player, damageSource: { cause } }: EntityHurtAfterEvent) {
    if (!(player instanceof Player)) return;
    if (cause == EntityDamageCause.entityAttack || cause == EntityDamageCause.entityExplosion || cause == EntityDamageCause.blockExplosion || cause == EntityDamageCause.projectile) {
        player.timeStamp.knockBack = Date.now();
    }
}
function onPlayerThrow({ itemStack, source: player }: ItemReleaseUseAfterEvent) {
    if (itemStack?.typeId == MinecraftItemTypes.Trident && itemStack?.getComponent("enchantable")?.hasEnchantment(MinecraftEnchantmentTypes.Riptide)) {
        player.timeStamp.riptide = Date.now();
    }
}
function onPlayerUse({ itemStack, source: player }: ItemUseAfterEvent) {
    if (itemStack.typeId === MinecraftItemTypes.WindCharge) {
        player.timeStamp.knockBack = Date.now();
    } else if (itemStack.typeId === MinecraftItemTypes.FishingRod) {
        player.dimension
            .getPlayers({
                minDistance: 0,
                maxDistance: 8,
            })
            .filter((a) => a.id !== player.id)
            .forEach((a) => {
                a.timeStamp.knockBack = Date.now();
            });
    }
}
function onPlayerAttack({ damagingEntity }: EntityHitEntityAfterEvent) {
    if (damagingEntity instanceof Player) {
        const mainHand = damagingEntity.getComponent("equippable")!.getEquipmentSlot(EquipmentSlot.Mainhand).getItem();
        if (mainHand?.typeId === MinecraftItemTypes.Mace) {
            const enchantment = mainHand.getComponent("enchantable")?.getEnchantment(MinecraftEnchantmentTypes.WindBurst);
            if (enchantment) {
                damagingEntity.timeStamp.knockBack = Date.now();
            }
        }
    }
}

function onPistonPush({ dimension, isExpanding, piston }: PistonActivateAfterEvent) {
    if (!isExpanding) return;
    const now = Date.now();
    const allAffectedBlockLocation = piston.getAttachedBlocksLocations();
    allAffectedBlockLocation.push(piston.block.location);
    const playerNearby = [] as Player[];
    allAffectedBlockLocation.forEach((location) => {
        playerNearby.push(
            ...dimension.getPlayers({
                maxDistance: 2,
                minDistance: 0,
                location,
            })
        );
    });
    new Set(playerNearby).forEach((player) => {
        player.timeStamp.pistonPush = now;
    });
}
