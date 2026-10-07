import { useEffect, useRef, useState } from "preact/hooks";
import {
  DEFAULT_PARAMS,
  EffectParams,
  PARAM_KEYS,
  ParamKey,
  PARAMS,
  ScreenState,
  SHADER_IDS,
  ShaderId,
  SHADERS,
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
  useEffect(() => {
    if (!dragging.current) setValues(remote);
  }, [reference?.id, JSON.stringify(remote)]);

  // El selector sigue al shader del loop que está sonando en la pantalla elegida.
  const liveShader = reference?.content.kind === "video" ? reference.content.shader : shader;

  const change = (key: ParamKey, value: number) => {
    dragging.current = true;
    setValues((current) => ({ ...current, [key]: value }));
    send({ t: "set-params", screens: ids, params: { [key]: value } });
  };

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
        {PARAM_KEYS.map((key) => (
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
        ))}
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
