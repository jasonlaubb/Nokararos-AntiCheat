import { PlayerInteractWithBlockBeforeEvent, PlayerInteractWithEntityBeforeEvent, PlayerLeaveAfterEvent, PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { ModalFormData } from "@minecraft/server-ui";
import { Module } from "../../matrixAPI";
import { matrixKick } from "../system/moderation";
const defenderNotBlockingData: string[] = [];
async function onPlayerSpawn(event: PlayerSpawnAfterEvent) {
    if (!event.initialSpawn || event.player.isAdmin()) return;
    const player = event.player;
    // if the player name is repeated... Anti Alt spam protection
    if (player.name.match(/^.{3,16}\s\([0-9]{1,2}\)$/)) {
        const rawName = player.name.replace(/^(.{3,16})\s\([0-9]{1,2}\)$/, "$1");
        const currentServerOnline = world.getAllPlayers();
        matrixKick(player, `Captcha module`, `[Auto Moderation]`);
        world.sendMessage(rawtextTranslate("module.captcha.detected", player.name));
        const susPlayer = currentServerOnline.find(({ name }) => {
            return rawName == name;
        });
        if (!susPlayer) return;
        matrixKick(player, `Captcha module`, `[Auto Moderation]`);
        world.sendMessage(rawtextTranslate("module.captcha.detected", susPlayer.name));
        return;
    }

    // Defender bot checking
    player.sendMessage(rawtextTranslate("module.captcha.checking"));
    player.inputPermissions.movementEnabled = false;
    player.inputPermissions.cameraEnabled = true;
    try {
        player.runCommand("ability @s mute true");
    } catch {
        console.warn("Captcha :: Minecraft EDU is required to use defender without bypass!");
    }
    await system.waitTicks(100);
    player.sendMessage(rawtextTranslate("module.captcha.continue"));
    const isCameraMoved = await new Promise<boolean>((resolve) => {
        let lastRotationString = JSON.stringify(player.getRotation());
        let moveDuration = 0;
        const now = Date.now();
        let currentType = 0;
        const interval = system.runInterval(() => {
            try {
                const rotationString = JSON.stringify(player.getRotation());
                if (moveDuration > 40) {
                    resolve(true);
                    system.clearRun(interval);
                } else if (rotationString != lastRotationString) {
                    currentType = 1;
                    moveDuration++;
                } else {
                    if (currentType == 1) player.sendMessage(rawtextTranslate("module.captcha.keepmove", ((40 - moveDuration) * 0.05).toString()));
                    currentType = 0;
                    if (Date.now() - now > 60000) {
                        resolve(false);
                        system.clearRun(interval);
                    }
                }
                lastRotationString = rotationString;
            } catch (error) {
                Module.sendError(error as Error);
                resolve(false);
                system.clearRun(interval);
            }
        }, 1);
    });
    if (isCameraMoved === false) {
        matrixKick(player, `Please move your camera for captcha`, `[Auto Moderation]`);
        world.sendMessage(rawtextTranslate("module.captcha.detected", player.name));
        return;
    }
    const now = Date.now();
    let checkValid = true;
    // Main check
    do {
        const question1 = ran(6);
        const question2 = ran(6);
        const correctAnswer = question1 + question2;
        const ui = new ModalFormData()
            .title(rawtextTranslate("module.captcha.title"))
            .submitButton(rawtextTranslate("module.captcha.submit"))
            .slider(
                fastText().addTran("module.captcha.selectui").endline().addTran("module.captcha.why").endline().addTran("module.captcha.question", question1.toString(), question2.toString()).endline().addTran("module.captcha.youranswer").build(),
                0,
                10,
                1,
                ran(11)
            )
            .toggle(rawtextTranslate("module.captcha.notabot"), false)
            //@ts-expect-error
            .show(player);
        let uiNotAnswering = false;
        ui.then((result) => {
            uiNotAnswering = true;
            if (result.canceled) return;
            const playerAns = result.formValues![0] as number;
            const notabot = result.formValues![1] as boolean;
            if (playerAns == correctAnswer && notabot === true) {
                checkValid = false;
            } else {
                player.sendMessage(rawtextTranslate("module.captcha.recontinue"));
            }
        });
        await new Promise<void>((resolve) => {
            system.runInterval(async () => {
                if (now - Date.now() < 150000) {
                    resolve();
                } else if (uiNotAnswering) {
                    await system.waitTicks(40);
                    resolve();
                }
            }, 5);
        });
    } while (now - Date.now() < 150000 && checkValid);

    if (!checkValid) {
        player.sendMessage(rawtextTranslate("module.captcha.verified"));
        defenderNotBlockingData.push(player.id);
        // Give back the movement permission
        player.inputPermissions.movementEnabled = true;
        try {
            player.runCommand("ability @s mute false");
        } catch {
            console.warn("Module :: Captcha :: Minecraft EDU is required to use defender without bypass!");
        }
    } else {
        matrixKick(player, `Failed to verify`, "[Auto Moderation]");
        world.sendMessage(rawtextTranslate("module.captcha.detected", player.id));
    }
}
function ran(max: number) {
    return Math.floor(Math.random() * max);
}
async function onPlayerLeave(event: PlayerLeaveAfterEvent) {
    const index = defenderNotBlockingData.indexOf(event.playerId);
    if (index == -1) return;
    defenderNotBlockingData.splice(defenderNotBlockingData.indexOf(event.playerId), 1);
}
async function onPlayerInteract(event: PlayerInteractWithBlockBeforeEvent | PlayerInteractWithEntityBeforeEvent) {
    if (event.player.isAdmin() || defenderNotBlockingData.includes(event.player.id)) return;
    event.cancel = true;
}
new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.captcha.name"))
    .setDescription(rawtextTranslate("module.captcha.description"))
    .setToggleId("captcha")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.playerSpawn.subscribe(onPlayerSpawn);
        world.afterEvents.playerLeave.subscribe(onPlayerLeave);
        world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
        world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);
    })
    .onModuleDisable(() => {
        world.afterEvents.playerSpawn.unsubscribe(onPlayerSpawn);
        world.afterEvents.playerLeave.unsubscribe(onPlayerLeave);
        world.beforeEvents.playerInteractWithBlock.unsubscribe(onPlayerInteract);
        world.beforeEvents.playerInteractWithEntity.unsubscribe(onPlayerInteract);
    })
    .register();
