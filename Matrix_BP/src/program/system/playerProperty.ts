import { EntityDamageCause, EntityHitEntityAfterEvent, EntityHurtAfterEvent, EquipmentSlot, ItemReleaseUseAfterEvent, ItemUseAfterEvent, Player, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { MinecraftEnchantmentTypes, MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

export interface PlayerTimeStamp {
    knockBack: number;
    riptide: number;
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
        })
        .initPlayer((_playerId, player) => {
            player.timeStamp = {
                knockBack: 0,
                riptide: 0,
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
