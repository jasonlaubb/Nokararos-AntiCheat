# FAQ

Here is the FAQ pages, you can find your answer here, go to support server if you can't get help from here.

## Where to download?

- CurseForge (latest): https://www.curseforge.com/minecraft-bedrock/addons/matrix-anti/download
- CurseForge (all): https://www.curseforge.com/minecraft-bedrock/addons/matrix-anti/files
- Mcpedl: https://mcpedl.com/matrix-anti/
- Source code: https://github.com/jasonlaubb/Matrix-AntiCheat/releases

?> This is the only way.

## How to set up Matrix AntiCheat?

No complicated setup is required, here is the few step.

1. Download Matrix AntiCheat from our [curseForge pages](https://www.curseforge.com/minecraft-bedrock/addons/matrix-anti/download).

2. Enable Beta-API in your experimental world setting.

3. Join the server and run the command `-op` to gain matrix operator permission (level 4).

4. After you had finished the `/scriptevent` verification, you can start to use Matrix AntiCheat.

5. Do `-help` to view what command can you use.

## It show something like "level 1", it is not working!

Do `-op`, thank you. Stop asking this question.

If it is not working, please make sure Matrix is above any chatRank addon (but below addon with chat command).

## How to change the punishment of the modules?

Method 1: configui command

1. Run `-configui` to open the config UI.

2. Click the button `modules` afterward.

3. Click the button of the module you want to change.

4. Click `punishment` button.

5. Type your punishment. Suggested punishments: `kick`, `ban` and `crash`.

Method 2: set command

Run `-set modules/(module's toggle id)/punishment (punishment)` to set the punishment.

## Why Matrix is not working

Can you try:

1. Deleting Matrix from your Realm's settings

2. Downloading your realm's world to your device

4. Removing Matrix from your world (if it exists)

5. Adding latest Matrix version to your world

6. Reuploading your world back to your realm

## How to select a player whose name contains whitespace(s)?

Even if the player has white space, matrix can still select him/her.

Method 1: Add double quotes to the player's name. (For example: `"Rabbit ZeYang"`)

Method 2: Use `-matrixui` to execute the command

1. Run `-matrixui` to open the matrix UI.

2. Select the command (action) that you want to execute

3. Run the command after you have typed all the information.

## Why Matrix is not working?

Possible reasons:

1. You have not enable Beta-API. (You can do `/function matrix/help` to check.)

2. You have a outdated Minecraft version which Matrix can not support.

3. Your Matrix's version is outdated.

4. You download and compress and use the source code from github directly (Not compiled).

## How to make a password?

Run the command `-setpassword <password>` to make a password.

You can also use `-clearpassword` to remove the password and back to `/scriptevent` verification mode.

## How to disable, enable and view the modules?

Use `-setmodule <module's toggle id> false` to disable the module.

Similarly, use `-setmodule <module's toggle id> true` to enable the module.

You can also execute `-listmodule` to view the modules (including toggle id).
