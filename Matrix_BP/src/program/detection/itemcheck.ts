import { EquipmentSlot, Player, system } from "@minecraft/server";
import { isItemIllegal } from "../../assets/itemcheck";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
let eventId: number;
const itemCheck = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.itemcheck.name"))
    .setDescription(rawtextTranslate("module.itemcheck.description"))
    .setToggleId("itemCheck")
    .setPunishment("ban")
    .onModuleEnable(() => {
        eventId = system.runInterval(() => {
            const allPlayers = Module.allNonAdminPlayers;
            for (const player of allPlayers) {
                tickEvent(player);
            }
        }, 20);
    })
    .onModuleDisable(() => {
        system.clearRun(eventId);
    });
itemCheck.register();
/**
 * @author jasonlaubb
 */
function tickEvent(player: Player) {
    const equipmentSlot = player.getComponent("equippable")!.getEquipmentSlot(EquipmentSlot.Mainhand);
    const mainHandItem = equipmentSlot.getItem();
    if (!mainHandItem) return;

    if (isItemIllegal(mainHandItem)) {
        equipmentSlot.setItem();
        const { typeId, amount } = mainHandItem;
        player.flag(itemCheck, { typeId, amount });
    }
}
