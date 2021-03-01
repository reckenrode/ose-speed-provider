/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
Hooks.once("dragRuler.ready", (SpeedProvider) => {
  const GRID_SIZE = 100;

  function getThreatenedArea(token) {
    return [
      token.x - GRID_SIZE,
      token.y - GRID_SIZE,
      token.x + token.width * GRID_SIZE + GRID_SIZE,
      token.y + token.height * GRID_SIZE + GRID_SIZE,
    ];
  }

  function contains(rect1, rect2) {
    return !(rect1[0] > rect2[2]
      || rect1[2] < rect2[0]
      || rect1[1] > rect2[3]
      || rect1[3] < rect2[1]);
  }

  function getCenters(token) {
    const centers = [];
    for (let x = 0; x < token.width; ++x) {
      for (let y = 0; y < token.height; ++y) {
        centers.push([
          token.x + GRID_HEIGHT / 2 + GRID_HEIGHT * x,
          token.y + GRID_HEIGHT / 2 + GRID_HEIGHT * y,
        ]);
      }
    }
    return centers;
  }

  function canReach(token, target, walls) {
    const tokenCenters = getCenters(token);
    const targetCenters = getCenters(target);
    const rays = tokenCenters.flatMap(c => targetCenters.map(t => Ray.fromArrays(c, t)));
    return rays.reduce((result, r) => {
      return result || !walls.reduce((result, w) => result || r.intersectSegment(w.c), false);
    }, false);
  }

  function isInMelee(token, combat, ctx) {
    const mySquare = [
      token.x, token.y,
      token.x + token.width * GRID_SIZE, token.y + token.height * GRID_SIZE
    ];
    const myCombatant = combat.combatants.find(combatant => combatant.tokenId === token._id);
    return myCombatant && combat.combatants
      .filter(combatant => {
        if (combatant !== myCombatant
            && combatant.flags.ose.group !== myCombatant.flags.ose.group) {
          const threatenedArea = getThreatenedArea(combatant.token);
          return contains(threatenedArea, mySquare) && ctx.canReach(token, target, ctx.walls);
        } else {
          return false;
        }
      })
      .length > 0;
  }

  class OseSpeedProvider extends SpeedProvider {
    get colors() {
      return [
        {
          id: "base",
          default: 0x00FF00,
          name: "ose-speed-provider.speeds.base"},
        {
          id: "encounter",
          default: 0x00FF00,
          name: "ose-speed-provider.speeds.encounter"
        },
        {
          id: "fighting-withdrawl",
          default: 0xFFFF00,
          name: "ose-speed-provider.speeds.fighting-withdrawl"
        },
      ];
    }

    get settings() {
      return [
        {
          id: "checkWalls",
          name: "ose-speed-provider.settings.checkWalls.name",
          hint: "ose-speed-provider.settings.checkWalls.hint",
          scope: "world",
          config: true,
          type: Boolean,
          default: true,
        }
      ];
    }

    getRanges(token) {
      const actorData = token.actor.getRollData();
      const ranges = [];
      const context = {
        canReach: this.getSetting("checkWalls" ? canReach : (_, _, _) => true,
        walls: game.scenes.active.data.walls,
      };
      if (game.combat) {
        let baseSpeed = actorData.movement.encounter;
        if (isInMelee(token.data, game.combat, context)) {
          ranges.push({range: baseSpeed / 2, color: "encounter"});
          ranges.push({range: baseSpeed, color: "fighting-withdrawl"});
        } else {
          ranges.push({range: baseSpeed, color: "encounter"});
        }
      } else {
          ranges.push({range: actorData.movement.base, color: "base"});
      }
      return ranges;
    }
  }

  dragRuler.registerModule("ose-speed-provider", OseSpeedProvider);
});
