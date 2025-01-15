import { registerModeration } from "./system/moderation";
registerModeration();
import { registerTimeStampModule } from "./system/playerProperty";
registerTimeStampModule();
// Import the modules
import "./detection/firewall";
import "./detection/speed";
import "./detection/predictionModule";
import "./detection/phase";
import "./detection/fly";
import "./detection/killaura";
import "./detection/aim";
import "./detection/timer";
import "./detection/autoclicker";
import "./detection/namespoof";
import "./detection/scaffold";
import "./detection/insteabreak";
import "./detection/reach";
import "./detection/invalidSprint";
import "./detection/captcha";
import "./detection/hop";
import "./detection/entityFly";
import "./detection/elytraFly";
// Import the util modules
import "./utility/welcomer";
import "./utility/worldBorder";
import "./utility/chatRankAndAntiSpam";
import "./utility/antiAfk";
import "./utility/antiCombatLog";
// Import the commands
import "./command/about";
import "./command/help";
import "./command/op";
import "./command/deop";
import "./command/setadmin";
import "./command/setmodule";
import "./command/listmodule";
import "./command/set";
import "./command/matrixui";
import "./command/vanish";
import "./command/moderation";
import "./command/invsee";
import "./command/setpassword";
import "./command/configui";
import "./command/rank";
import "./command/reset";
