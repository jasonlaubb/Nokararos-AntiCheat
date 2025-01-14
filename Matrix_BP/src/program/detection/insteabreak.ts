import { BlockPermutation, Dimension, EntityHitBlockAfterEvent, ItemStack, Player, PlayerBreakBlockAfterEvent, system, Vector3, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftBlockTypes, MinecraftEffectTypes, MinecraftEnchantmentTypes, MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
type BrokenBlockList = { blockPermutation: BlockPermutation; blockPosition: Vector3 }[];
interface BreakData {
    brokenBlocks: BrokenBlockList;
    brokenAmount: 0;
    startBreakingTime: number;
    flagInsteaBreak: boolean;
}
const MAX_BREAK_IN_TICK = 6;
let breakData: { [key: string]: BreakData } = {};
let eventId: IntegratedSystemEvent;
const insteabreak = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.insteabreak.name"))
    .setDescription(rawtextTranslate("module.insteabreak.description"))
    .setToggleId("antiInsteabreak")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.playerBreakBlock.subscribe(onBlockBreak);
        world.afterEvents.entityHitBlock.subscribe(onPlayerHitBlock);
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        world.afterEvents.playerBreakBlock.unsubscribe(onBlockBreak);
        world.afterEvents.entityHitBlock.unsubscribe(onPlayerHitBlock);
        Module.clearPlayerTickEvent(eventId);
        breakData = {};
    })
    .initPlayer((playerId) => {
        breakData[playerId] = DEFAULT_BREAK_DATA;
    })
    .initClear((playerId) => {
        delete breakData[playerId];
    });
insteabreak.register();
/**
 * @author jasonlaubb
 * @description The module against insteabreak hack. These types of hack is not working on the realm and bds server.
 */
function onBlockBreak({ player, brokenBlockPermutation, itemStackBeforeBreak: tool, block }: PlayerBreakBlockAfterEvent) {
    if (player.isAdmin() || brokenBlockPermutation.type.id == MinecraftBlockTypes.Air) return;
    breakData[player.id].brokenBlocks.push({ blockPermutation: brokenBlockPermutation, blockPosition: block.location });
    const usingTool = tool && isTool(tool);
    if (
        !(player.getEffect(MinecraftEffectTypes.Haste) && usingTool) ||
        (usingTool && (tool.getComponent("enchantable")?.getEnchantment(MinecraftEnchantmentTypes.Efficiency)?.level ?? 0) >= 2 && INSTA_BREAKABLE_SET.has(brokenBlockPermutation.type.id as MinecraftBlockTypes))
    ) {
        breakData[player.id].brokenAmount++;
        if (Date.now() > breakData[player.id].startBreakingTime) breakData[player.id].flagInsteaBreak = true;
    }
}
function onPlayerHitBlock({ damagingEntity: player }: EntityHitBlockAfterEvent) {
    if (player instanceof Player && !player.isAdmin()) {
        breakData[player.id].startBreakingTime = Date.now();
    }
}
function tickEvent(player: Player) {
    if (breakData[player.id].brokenBlocks.length == 0) return;
    if (breakData[player.id].brokenAmount > MAX_BREAK_IN_TICK || breakData[player.id].flagInsteaBreak) {
        // Recover the blocks
        system.runJob(recoverBlocks(breakData[player.id].brokenBlocks, player.dimension));
        player.flag(insteabreak, { type: breakData[player.id].flagInsteaBreak ? "instabreak" : "nuking", breakAmount: breakData[player.id].brokenAmount });
    }
    breakData[player.id] = DEFAULT_BREAK_DATA;
}
function isTool(itemStack: ItemStack) {
    TOOL_SET.has(itemStack.type.id as MinecraftItemTypes);
}
function* recoverBlocks(blocks: BrokenBlockList, dimension: Dimension) {
    for (const { blockPermutation, blockPosition } of blocks) {
        dimension.setBlockPermutation(blockPosition, blockPermutation);
        dimension
            .getEntities({
                location: blockPosition,
                type: "minecraft:item",
                maxDistance: 2,
                minDistance: 0,
            })
            .forEach((item) => item.kill());
        yield;
    }
}
const TOOL_SET = new Set([
    MinecraftItemTypes.WoodenAxe,
    MinecraftItemTypes.StoneAxe,
    MinecraftItemTypes.IronAxe,
    MinecraftItemTypes.GoldenAxe,
    MinecraftItemTypes.DiamondAxe,
    MinecraftItemTypes.NetheriteAxe,
    MinecraftItemTypes.WoodenPickaxe,
    MinecraftItemTypes.StonePickaxe,
    MinecraftItemTypes.IronPickaxe,
    MinecraftItemTypes.GoldenPickaxe,
    MinecraftItemTypes.DiamondPickaxe,
    MinecraftItemTypes.NetheritePickaxe,
    // Not including sword.
    MinecraftItemTypes.WoodenShovel,
    MinecraftItemTypes.StoneShovel,
    MinecraftItemTypes.IronShovel,
    MinecraftItemTypes.GoldenShovel,
    MinecraftItemTypes.DiamondShovel,
    MinecraftItemTypes.NetheriteShovel,
    MinecraftItemTypes.WoodenHoe,
    MinecraftItemTypes.StoneHoe,
    MinecraftItemTypes.IronHoe,
    MinecraftItemTypes.GoldenHoe,
    MinecraftItemTypes.DiamondHoe,
    MinecraftItemTypes.NetheriteHoe,
]);
const INSTA_BREAKABLE_SET = new Set([
    // Stone blocks
    MinecraftBlockTypes.Stone,
    MinecraftBlockTypes.Granite,
    MinecraftBlockTypes.Diorite,
    MinecraftBlockTypes.Andesite,
    MinecraftBlockTypes.Sandstone,
    MinecraftBlockTypes.QuartzBlock,
    MinecraftBlockTypes.Deepslate,
    // Overworld blocks
    MinecraftBlockTypes.Dirt,
    MinecraftBlockTypes.GrassBlock,
    MinecraftBlockTypes.Sand,
    MinecraftBlockTypes.Obsidian,
    MinecraftBlockTypes.CryingObsidian,
    // Log blocks
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
    // Other blocks
    MinecraftBlockTypes.Anvil,
    MinecraftBlockTypes.DiamondBlock,
    MinecraftBlockTypes.GoldBlock,
    MinecraftBlockTypes.IronBlock,
    MinecraftBlockTypes.LapisBlock,
    MinecraftBlockTypes.RedstoneBlock,
    MinecraftBlockTypes.NetheriteBlock,
    // Ore [important]
    MinecraftBlockTypes.CoalOre,
    MinecraftBlockTypes.IronOre,
    MinecraftBlockTypes.GoldOre,
    MinecraftBlockTypes.RedstoneOre,
    MinecraftBlockTypes.DiamondOre,
    MinecraftBlockTypes.CopperOre,
    MinecraftBlockTypes.EmeraldOre,
    MinecraftBlockTypes.QuartzOre,
    MinecraftBlockTypes.DeepslateCoalOre,
    MinecraftBlockTypes.DeepslateIronOre,
    MinecraftBlockTypes.DeepslateGoldOre,
    MinecraftBlockTypes.DeepslateRedstoneOre,
    MinecraftBlockTypes.DeepslateDiamondOre,
    MinecraftBlockTypes.DeepslateCopperOre,
    MinecraftBlockTypes.DeepslateEmeraldOre,
    MinecraftBlockTypes.DeepslateLapisOre,
    MinecraftBlockTypes.LapisOre,
    MinecraftBlockTypes.AncientDebris,
]);
const DEFAULT_BREAK_DATA = {
    brokenBlocks: [],
    startBreakingTime: 0,
    brokenAmount: 0,
    flagInsteaBreak: false,
} as BreakData;
