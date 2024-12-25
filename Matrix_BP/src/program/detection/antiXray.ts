import { Dimension, MinecraftDimensionTypes, system, Vector3, VectorXZ, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftBlockTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";

new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.antiXray.name"))
    .setDescription(rawtextTranslate("module.antiXray.description"))
    .setToggleId("antiXray")
    .onModuleEnable(() => {})
    .onModuleDisable(() => {})
    .register();
const TO_STONE: Set<MinecraftBlockTypes> = new Set([
    MinecraftBlockTypes.CoalOre,
    MinecraftBlockTypes.IronOre,
    MinecraftBlockTypes.GoldOre,
    MinecraftBlockTypes.RedstoneOre,
    MinecraftBlockTypes.DiamondOre,
    MinecraftBlockTypes.CopperOre,
    MinecraftBlockTypes.EmeraldOre,
    MinecraftBlockTypes.LapisOre,
]);
const TO_DEEPSLATE: Set<MinecraftBlockTypes> = new Set([
    MinecraftBlockTypes.DeepslateCoalOre,
    MinecraftBlockTypes.DeepslateIronOre,
    MinecraftBlockTypes.DeepslateGoldOre,
    MinecraftBlockTypes.DeepslateRedstoneOre,
    MinecraftBlockTypes.DeepslateDiamondOre,
    MinecraftBlockTypes.DeepslateCopperOre,
    MinecraftBlockTypes.DeepslateEmeraldOre,
    MinecraftBlockTypes.DeepslateLapisOre,
]);
const STONE_AND_DEEPSLATE = new Set([...TO_STONE, ...TO_DEEPSLATE]);
const TO_NETHERRACK = new Set([MinecraftBlockTypes.AncientDebris, MinecraftBlockTypes.NetherGoldOre, MinecraftBlockTypes.QuartzOre]);
function findChunkBoarder({ x, z }: VectorXZ): [VectorXZ, VectorXZ] {
    const chunkSize = 16;
    const chunkX = Math.floor(x / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);

    const minX = chunkX * chunkSize;
    const minZ = chunkZ * chunkSize;
    const maxX = minX + chunkSize - 1;
    const maxZ = minZ + chunkSize - 1;

    return [
        { x: minX, z: minZ },
        { x: maxX, z: maxZ },
    ];
}
interface OreData {
    blockId: string;
    location: {
        x: number;
        y: number;
        z: number;
    };
}
function getEncryptedData({ x, z }: Vector3, dimension: Dimension) {
    const id = `antiXray::${dimension.id}::${x}::${z}`;
    const data = world.getDynamicProperty(id) as string;
    if (!data) {
        currentJob[id] = true;
        const [{ x: startX, z: startZ }, { x: endX, z: endZ }] = findChunkBoarder({ x, z });
        system.runJob(logChunkOre({ x: startX, z: startZ }, { x: endX, z: endZ }, dimension, id));
    } else {
        const oreArray = data.split("//");
        return oreArray.map((ore) => {
            const [blockId, x, y, z] = ore.split("::");
            return {
                blockId,
                location: {
                    x: parseInt(x),
                    y: parseInt(y),
                    z: parseInt(z),
                },
            } as OreData;
        });
    }
}
let currentJob: { [key: string]: boolean } = {};
/**
 * @description High efficiency chunk ore finder [No spike lag]
 */
function* logChunkOre({ x: startX, z: startZ }: VectorXZ, { x: endX, z: endZ }: VectorXZ, dimension: Dimension, id: string): Generator<void, void, void> {
    const data: string[] = [];
    try {
        let block = dimension.getBlock({ x: startX, y: -64, z: startZ });
        let targetArray: Set<MinecraftBlockTypes>;
        switch (dimension.id) {
            case MinecraftDimensionTypes.overworld: {
                targetArray = STONE_AND_DEEPSLATE;
                break;
            }
            case MinecraftDimensionTypes.nether: {
                targetArray = TO_NETHERRACK;
                break;
            }
            default: {
                return undefined;
            }
        }
        for (let y = -64; y < 256; y++) {
            for (let x = startX; x <= endX; x++) {
                for (let z = startZ; z <= endZ; z++) {
                    if (block?.isSolid && targetArray.has(block.typeId as MinecraftBlockTypes)) {
                        data.push(`${block.typeId}::${x}::${y}::${z}`);
                    }
                    block = block?.east();
                    if (!block) {
                        delete currentJob[id];
                        return;
                    }
                    yield;
                }
                block = block?.west(16)?.north();
                if (!block) {
                    delete currentJob[id];
                    return;
                }
                yield;
            }
            block = block?.south(16)?.above();
            if (!block) {
                delete currentJob[id];
                return;
            }
            yield;
        }
        world.setDynamicProperty(id, data.join("//"));
    } catch {
    } finally {
        delete currentJob[id];
    }
}
function initChunkOre({ x: startX, z: startZ }: VectorXZ, { x: endX, z: endZ }: VectorXZ, dimension: Dimension) {}
function* encryptChunkOre({ x, z }: Vector3, dimension: Dimension) {}
