import { world, system } from '@minecraft/server';
import { flag, punish, uniqueId, getGamemode } from '../../../unti/World.js';
import config from '../../../data/config.js';

const fly_a = () => {
  const EVENT = system.runInterval(() => {
    for(const player of world.getPlayers()) {
      if(uniqueId(player) || getGamemode(player) == 1 || getGamemode(player) == 3 || player.hasTag('anticheat:may_fly')) continue
      if(player.isFlying) {
        player.kill();
        flag(player, 'fly/A', 0);
        punish(player, 'fly/A', config.modules.flyA.punishment)
      }
    };
    if(!config.modules.flyA.state) {
      system.clearRun(EVENT)
    }
  })
};

export { fly_a }