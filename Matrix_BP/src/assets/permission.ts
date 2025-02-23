import { Player } from "@minecraft/server";
export { declarePermissionFunction };
/**
 * @description This function should be run when script fire.
 */
function declarePermissionFunction() {
    Player.prototype.isAdmin = function () {
        const isAdminState = ((this.getDynamicProperty("uniqueLevel") as number) ?? 0) >= 1;
        return isAdminState;
    };
    Player.prototype.getPermissionLevel = function () {
        return (this.getDynamicProperty("uniqueLevel") as number) ?? 0;
    };
    Player.prototype.setPermissionLevel = function (level: number) {
        if (!Number.isInteger(level)) {
            throw new Error("Player :: setPermissionLevel :: Level must be an integer.");
        }
        if (level == 0) {
            this.setDynamicProperty("uniqueLevel");
        } else {
            this.setDynamicProperty("uniqueLevel", level);
        }
    };
}
