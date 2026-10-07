import { ShaderId } from "../../shared/protocol";
import { Runtime } from "../engine/runtime";
import { Connection } from "../net/connection";
import { StreamPublisher } from "../net/rtc";
import { CameraScene } from "../scenes/camera";

export async function startCam(root: HTMLElement, id: string) {
  document.title = `Cámara ${id}`;
  document.body.classList.add("stage");

  const status = document.createElement("div");
  status.className = "stage-status";
  document.body.append(status);

  const runtime = new Runtime(root);
  await runtime.ready;

  let shader: ShaderId = "red_hue_with_waves";
  let viewers = 0;
  let link = "connecting";

  const render = () => {
    if (!window.isSecureContext) {
      status.textContent = "El navegador solo permite usar la cámara con https o en localhost.";
    } else if (link === "replaced") {
      status.textContent = `Otra ventana se abrió como “${id}”. Esta quedó desconectada.`;
    } else if (link !== "online") {
      status.textContent = `${id}: sin conexión con el panel. Reintentando…`;
    } else {
      status.textContent =
        viewers === 0 ? `${id}: lista, sin pantallas asignadas` : `${id}: transmitiendo a ${viewers}`;
    }
  };

  runtime.show((ctx) => new CameraScene(ctx, shader));

  // Lo que se transmite es el canvas, ya con el efecto aplicado.
  const stream = runtime.canvas.captureStream(60);
  const connection = new Connection(() => ({ t: "hello", role: "cam", id, shader }));
  new StreamPublisher(connection, stream);

  connection.on("source", (message) => {
    shader = message.shader;
    if (runtime.current instanceof CameraScene) runtime.current.setShader(shader);
  });
  connection.on("viewers", (message) => {
    viewers = message.viewers.length;
    render();
  });
  connection.onStatus((state) => {
    link = state;
    render();
  });
}
