import { useEffect, useRef, useState } from "preact/hooks";
import {
  AUTO_MODES,
  AutoMode,
  complementary,
  DEFAULT_PARAMS,
  EffectParams,
  FigureId,
  FIGURES,
  PARAM_KEYS,
  ParamKey,
  PARAMS,
  ScreenState,
  SHADER_IDS,
  ShaderId,
  SHADERS,
  TUNNEL_IDS,
  TUNNELS,
  WEKUFE_MOVE_IDS,
  WEKUFE_MOVES,
  WEKUFE_SHOT_IDS,
  WEKUFE_SHOTS,
} from "../../shared/protocol";
import { Send } from "./useHub";

interface Props {
  chosen: ScreenState[];
  shader: ShaderId;
  onShader(shader: ShaderId): void;
  send: Send;
}

export function Look({ chosen, shader, onShader, send }: Props) {
  const ids = chosen.map((screen) => screen.id);
  const reference = chosen[0];
  const remote = reference?.params ?? DEFAULT_PARAMS;

  // Mientras se arrastra un control manda el valor local, para que el eco del
  // hub no le pelee el slider a la mano.
  const [values, setValues] = useState<EffectParams>(remote);
  const dragging = useRef(false);
  const [picked, setPicked] = useState(remote.color ?? "#ff2e88");
  useEffect(() => {
    if (!dragging.current) setValues(remote);
  }, [reference?.id, JSON.stringify(remote)]);

  const showsWekufe = reference?.content.kind === "scene" && reference.content.scene === "wekufe";

  // El selector sigue al shader del loop que está sonando en la pantalla elegida.
  const liveShader = reference?.content.kind === "video" ? reference.content.shader : shader;

  const change = (key: ParamKey, value: number) => {
    dragging.current = true;
    setValues((current) => ({ ...current, [key]: value }));
    send({ t: "set-params", screens: ids, params: { [key]: value } });
  };

  const update = (params: Partial<EffectParams>) => {
    setValues((current) => ({ ...current, ...params }));
    send({ t: "set-params", screens: ids, params });
  };

  const setColor = (color: string | null) => {
    if (color) setPicked(color);
    update({ color });
  };

  // Las teclas 1 a 7 cambian de túnel, salvo mientras se escribe en un campo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tunnel = TUNNEL_IDS[Number(event.key) - 1];
      const typing = (event.target as Element).matches?.(
        "textarea, select, input:not([type=range],[type=checkbox],[type=color])"
      );
      if (!tunnel || typing || event.metaKey || event.ctrlKey || event.altKey || ids.length === 0) return;
      update({ tunnel });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids.join("|")]);

  const slider = (key: ParamKey) => (
    <label key={key} class="slider">
      <span>{PARAMS[key].label}</span>
      <output>{values[key].toFixed(2)}</output>
      <input
        type="range"
        min={PARAMS[key].min}
        max={PARAMS[key].max}
        step={0.01}
        value={values[key]}
        onInput={(event) => change(key, event.currentTarget.valueAsNumber)}
        onChange={() => (dragging.current = false)}
      />
    </label>
  );

  const reset = () => {
    setValues(DEFAULT_PARAMS);
    send({ t: "set-params", screens: ids, params: DEFAULT_PARAMS });
  };

  return (
    <aside class="panel look">
      <div class="panel-head">
        <h2>Efecto de los loops</h2>
      </div>

      <label class="field">
        <span>Shader</span>
        <select value={liveShader} onChange={(e) => onShader(e.currentTarget.value as ShaderId)}>
          {SHADER_IDS.map((id) => (
            <option key={id} value={id}>
              {SHADERS[id]}
            </option>
          ))}
        </select>
      </label>

      <fieldset class="sliders" disabled={ids.length === 0}>
        {showsWekufe && (
          <div class="tunnels">
            <label class="tunnel-check">
              <input
                type="checkbox"
                checked={values.wekufeAuto}
                onChange={(event) => update({ wekufeAuto: event.currentTarget.checked })}
              />
              <span>Wekufe en automático</span>
            </label>
            <span>Plano{values.wekufeAuto ? " (apagá el automático para elegirlo)" : ""}</span>
            <div class="tunnel-grid">
              {WEKUFE_SHOT_IDS.map((id) => (
                <button
                  key={id}
                  class={!values.wekufeAuto && values.wekufeShot === id ? "chosen" : ""}
                  disabled={values.wekufeAuto}
                  onClick={() => update({ wekufeShot: id })}
                >
                  {WEKUFE_SHOTS[id]}
                </button>
              ))}
            </div>
            <span>Qué hace</span>
            <div class="tunnel-grid">
              {WEKUFE_MOVE_IDS.map((id) => (
                <button key={id} onClick={() => update({ wekufeMove: id, wekufeCue: Date.now() })}>
                  {WEKUFE_MOVES[id]}
                </button>
              ))}
            </div>
          </div>
        )}
        <label class="field">
          <span>Figura de Ángeles y demonios</span>
          <select
            value={values.figure}
            onChange={(event) => update({ figure: event.currentTarget.value as FigureId })}
          >
            {Object.entries(FIGURES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div class="tunnels">
          <span>Túnel (teclas 1 a {TUNNEL_IDS.length})</span>
          <div class="tunnel-grid">
            {TUNNEL_IDS.map((id, index) => (
              <button key={id} class={values.tunnel === id ? "chosen" : ""} onClick={() => update({ tunnel: id })}>
                {index + 1}. {TUNNELS[id]}
              </button>
            ))}
          </div>
          <label class="tunnel-check">
            <input
              type="checkbox"
              checked={values.onBeat}
              onChange={(event) => update({ onBeat: event.currentTarget.checked })}
            />
            <span>Cambiar en el golpe</span>
          </label>
          <label class="field">
            <span>Rotación</span>
            <select
              value={values.autoMode}
              onChange={(event) => update({ autoMode: event.currentTarget.value as AutoMode })}
            >
              {Object.entries(AUTO_MODES).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {PARAM_KEYS.filter((key) => PARAMS[key].tunnel).map(slider)}
        </div>
        <div class="tint">
          <label>
            <input
              type="checkbox"
              checked={values.color !== null}
              onChange={(event) => setColor(event.currentTarget.checked ? picked : null)}
            />
            <span>Color del túnel</span>
          </label>
          <input
            type="color"
            aria-label="Color elegido"
            disabled={values.color === null}
            value={values.color ?? picked}
            onInput={(event) => setColor(event.currentTarget.value)}
          />
          <span
            class="tint-complement"
            title="Complementario"
            style={{ background: complementary(values.color ?? picked), opacity: values.color === null ? 0.3 : 1 }}
          />
        </div>
        {PARAM_KEYS.filter((key) => !PARAMS[key].tunnel).map(slider)}
        <button class="quiet" onClick={reset}>
          Volver a los valores iniciales
        </button>
      </fieldset>

      <p class="panel-note">
        {ids.length === 0
          ? "Elegí una pantalla para ajustar su efecto."
          : ids.length === 1
          ? `Ajustando ${ids[0]}.`
          : `Ajustando ${ids.length} pantallas a la vez. Los valores son los de ${ids[0]}.`}
      </p>
    </aside>
  );
}
