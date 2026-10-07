import "./style.css";

// Una sola página con tres roles, elegidos por URL:
//   /control        panel de control
//   /screen/<id>    pantalla de salida
//   /cam/<id>       cámara que transmite
const app = document.getElementById("app")!;
const [, route, rawId] = location.pathname.split("/");
const id = slug(decodeURIComponent(rawId ?? ""));

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 64);
}

// Sin nombre en la URL se le inventa uno y se recuerda, para que una pantalla
// en modo kiosco vuelva siempre con el mismo.
function rememberedId(role: string, prefix: string): string {
  const key = `visuales:${role}`;
  let name = localStorage.getItem(key);
  if (!name) {
    name = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(key, name);
  }
  return name;
}

if (route === "control") {
  import("./control/main").then(({ startControl }) => startControl(app));
} else if (route === "screen") {
  if (!id) location.replace(`/screen/${rememberedId("screen", "pantalla")}`);
  else import("./screen/main").then(({ startScreen }) => startScreen(app, id));
} else if (route === "cam") {
  if (!id) location.replace(`/cam/${rememberedId("cam", "camara")}`);
  else import("./cam/main").then(({ startCam }) => startCam(app, id));
} else {
  import("./home").then(({ startHome }) => startHome(app, slug));
}
