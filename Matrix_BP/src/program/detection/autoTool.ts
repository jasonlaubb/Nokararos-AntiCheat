import { EntityHitBlockAfterEvent, EquipmentSlot, Player, world } from "@minecraft/server";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
let id: IntegratedSystemEvent;
const autoTool = new Module()
    .setName(rawtextTranslate("module.autoTool.name"))
    .setDescription(rawtextTranslate("module.autoTool.description"))
    .setToggleId("antiAutoTool")
    .setPunishment("kick")
    .onModuleEnable(() => {
        world.afterEvents.entityHitBlock.subscribe(blockHit);
        id = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        world.afterEvents.entityHitBlock.unsubscribe(blockHit);
        Module.clearPlayerTickEvent(id);
        autoToolData.clear();
    })
    .initPlayer((playerId) => {
        autoToolData.set(playerId, {
            startBreak: 0,
            breakType: "",
            lastSelectedSlot: 0,
        });
    })
    .initClear((playerId) => {
        autoToolData.delete(playerId);
    });
autoTool.register();
const TOOL_TYPE_SET = {
    axe: [
        MinecraftBlockTypes.OakLog,
        MinecraftBlockTypes.BirchLog,
        MinecraftBlockTypes.SpruceLog,
        MinecraftBlockTypes.JungleLog,
        MinecraftBlockTypes.AcaciaLog,
        MinecraftBlockTypes.DarkOakLog,
        MinecraftBlockTypes.OakWood,
        MinecraftBlockTypes.BirchWood,
        MinecraftBlockTypes.SpruceWood,
        MinecraftBlockTypes.JungleWood,
        MinecraftBlockTypes.AcaciaWood,
        MinecraftBlockTypes.DarkOakWood,
        MinecraftBlockTypes.Bamboo,
        MinecraftBlockTypes.BambooPlanks,
        MinecraftBlockTypes.OakPlanks,
        MinecraftBlockTypes.BirchPlanks,
        MinecraftBlockTypes.SprucePlanks,
        MinecraftBlockTypes.JunglePlanks,
        MinecraftBlockTypes.AcaciaPlanks,
        MinecraftBlockTypes.DarkOakPlanks,
        MinecraftBlockTypes.OakFence,
        MinecraftBlockTypes.BirchFence,
        MinecraftBlockTypes.SpruceFence,
        MinecraftBlockTypes.JungleFence,
        MinecraftBlockTypes.BambooBlock,
        MinecraftBlockTypes.BirchLog,
        MinecraftBlockTypes.FenceGate,
        MinecraftBlockTypes.BirchFenceGate,
        MinecraftBlockTypes.SpruceFenceGate,
        MinecraftBlockTypes.JungleFenceGate,
        MinecraftBlockTypes.BirchDoor,
        MinecraftBlockTypes.SpruceDoor,
        MinecraftBlockTypes.JungleDoor,
        MinecraftBlockTypes.Trapdoor,
        MinecraftBlockTypes.BirchTrapdoor,
        MinecraftBlockTypes.SpruceTrapdoor,
        MinecraftBlockTypes.JungleTrapdoor,
    ],
    hoe: [MinecraftBlockTypes.HayBlock],
    pickaxe: [
        MinecraftBlockTypes.Stone,
        MinecraftBlockTypes.Netherrack,
        MinecraftBlockTypes.AncientDebris,
        MinecraftBlockTypes.EndStone,
        MinecraftBlockTypes.NetherBrick,
        MinecraftBlockTypes.Deepslate,
        MinecraftBlockTypes.CobbledDeepslate,
        MinecraftBlockTypes.CobbledDeepslateSlab,
        MinecraftBlockTypes.CobbledDeepslateWall,
        MinecraftBlockTypes.RedstoneBlock,
        MinecraftBlockTypes.DiamondBlock,
        MinecraftBlockTypes.GoldBlock,
        MinecraftBlockTypes.IronBlock,
        MinecraftBlockTypes.CopperBlock,
        MinecraftBlockTypes.EmeraldBlock,
        MinecraftBlockTypes.LapisBlock,
        MinecraftBlockTypes.LapisBlock,
    ],
    shovel: [
        MinecraftBlockTypes.MuddyMangroveRoots,
        MinecraftBlockTypes.GrassBlock,
        MinecraftBlockTypes.Dirt,
        MinecraftBlockTypes.GrassPath,
        MinecraftBlockTypes.Gravel,
        MinecraftBlockTypes.Mud,
        MinecraftBlockTypes.Sand,
        MinecraftBlockTypes.SoulSand,
        MinecraftBlockTypes.SoulSoil,
    ],
};
function matchTool(toolTypeId: string, blockTypeId: string) {
    if (!toolTypeId.startsWith("minecraft:")) return false;
    if (toolTypeId.endsWith("pickaxe")) {
        return blockTypeId.endsWith("ore") || TOOL_TYPE_SET.pickaxe.includes(blockTypeId as MinecraftBlockTypes);
    } else if (toolTypeId.endsWith("hoe")) {
        return TOOL_TYPE_SET.hoe.includes(blockTypeId as MinecraftBlockTypes);
    } else if (toolTypeId.endsWith("axe")) {
        return TOOL_TYPE_SET.axe.includes(blockTypeId as MinecraftBlockTypes);
    } else if (toolTypeId.endsWith("shovel")) {
        return blockTypeId.endsWith("concrete_powder") || TOOL_TYPE_SET.shovel.includes(blockTypeId as MinecraftBlockTypes);
    }
    return false;
}
interface AutoToolData {
    startBreak: number;
    lastSelectedSlot: number;
    breakType: string;
}
const autoToolData = new Map<string, AutoToolData>();
function tickEvent(player: Player) {
    const data = autoToolData.get(player.id)!;
    const now = Date.now();
    if (data.startBreak !== 0 && now - data.startBreak < 250 && player.selectedSlotIndex !== data.lastSelectedSlot) {
        data.startBreak = 0;
        const toolName = player.getComponent("equippable")!.getEquipment(EquipmentSlot.Mainhand)?.typeId;
        if (toolName && matchTool(toolName, data.breakType)) {
            player.selectedSlotIndex = data.lastSelectedSlot;
            player.flag(autoTool, { toolName });
        }
    }
    data.lastSelectedSlot = player.selectedSlotIndex;
    autoToolData.set(player.id, data);
}
function blockHit({ damagingEntity, hitBlock }: EntityHitBlockAfterEvent) {
    if (!(damagingEntity instanceof Player) || damagingEntity.isAdmin()) return;
    const data = autoToolData.get(damagingEntity.id)!;
    const now = Date.now();
    if (!matchTool(damagingEntity.getComponent("equippable")!.getEquipment(EquipmentSlot.Mainhand)?.typeId ?? "air", hitBlock.typeId)) {
        data.startBreak = now;
        data.breakType = hitBlock.typeId;
        autoToolData.set(damagingEntity.id, data);
    }
}
