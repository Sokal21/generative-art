import { SceneFactory } from ".";
import { SceneId } from "../../shared/protocol";
import { CurvesWithMic } from "./curves_with_mic";
import { LifeGameWithMic } from "./life_game_with_mic";
import { Planet } from "./planet";
import { SinWithMic } from "./sin_with_mic";

const LIFE_CELL_PX = 10;

export const SCENE_FACTORIES: Record<SceneId, SceneFactory> = {
  curves: ({ p, mic }) => new CurvesWithMic(p, p.width, p.height, mic()),
  life: ({ p, mic }) =>
    new LifeGameWithMic(
      p,
      mic(),
      // La escena espeja la grilla en cuatro cuadrantes.
      Math.ceil(p.width / 2 / LIFE_CELL_PX),
      Math.ceil(p.height / 2 / LIFE_CELL_PX),
      LIFE_CELL_PX,
      3,
      200,
      100
    ),
  rings: ({ p, mic }) => new SinWithMic(p, mic()),
  planet: ({ p }) => new Planet(p, Math.min(p.width, p.height)),
};
