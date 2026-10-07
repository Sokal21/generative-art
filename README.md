# Visuales

Visuales audio-reactivos para tocar en vivo, repartidos en varias pantallas de
la red local y manejados desde un panel de control. Hecho con p5.js, shaders
GLSL, Preact y WebRTC.

## Cómo se usa

```
pnpm install
pnpm dev
```

Eso levanta todo (la web y el hub que coordina las máquinas) en un solo puerto.
La consola muestra la dirección de red, por ejemplo `https://192.168.0.20:5173`.
Cada máquina abre esa misma dirección con una ruta distinta según su rol:

| Ruta             | Rol                                                             |
| ---------------- | --------------------------------------------------------------- |
| `/control`       | Panel de control. Elige qué muestra cada pantalla.              |
| `/screen/nombre` | Pantalla de salida. Muestra lo que le mande el panel.           |
| `/cam/nombre`    | Cámara. Transmite su imagen con efecto a las pantallas elegidas. |

El nombre es libre (`/screen/izquierda`, `/cam/escenario`) y es el que aparece
en el panel. Si se omite, el navegador genera uno y lo recuerda.

Los loops se copian a `public/videos` (la carpeta no se sube a git) y aparecen
en el panel al tocar "Actualizar lista".

Para una función, `pnpm start` compila y sirve la versión optimizada. Como
copia los loops al compilar, hay que volver a correrlo si se agregan videos.

### HTTPS

El servidor usa HTTPS con un certificado autofirmado, porque los navegadores
solo permiten usar cámara y micrófono fuera de `localhost` en páginas seguras.
La primera vez, cada máquina muestra una advertencia que hay que aceptar.

Si todo corre en una sola máquina, `HTTPS=0 pnpm dev` lo apaga.

### Qué pasa cuando algo se cae

- Las pantallas, las cámaras y el panel se reconectan solos.
- El hub recuerda qué estaba mostrando cada pantalla y se lo vuelve a mandar.
  Si el que se reinicia es el hub, cada pantalla le cuenta qué tenía.
- Abrir dos ventanas con el mismo nombre desconecta a la más vieja.
- El video en vivo viaja directo entre cámara y pantalla, así que sigue aunque
  el hub se reinicie.
- No hace falta internet: nada se carga desde afuera de la red local.

La ventana de cada cámara tiene que quedar visible: los navegadores frenan el
canvas de las pestañas en segundo plano y el stream se congela.

## Cómo está armado

```
shared/protocol.ts   Mensajes y tipos que comparten el hub y los clientes
server/hub.ts        Hub WebSocket: estado de cada pantalla y señalización WebRTC
server/vite-plugin.ts  Monta el hub en el servidor de Vite
src/main.ts          Elige el rol según la URL
src/control/         Panel de control (Preact)
src/screen/          Pantalla de salida
src/cam/             Cámara
src/net/             Conexión al hub con reconexión, y WebRTC
src/engine/          Canvas p5 que muestra una escena por vez
src/scenes/          Escenas: loop con shader, cámara, stream y las generativas
public/shaders/      Shaders GLSL
```

Las órdenes (qué loop, qué shader, qué parámetros) van por WebSocket a través
del hub. WebRTC se usa solo para el video en vivo de las cámaras.

### Agregar una escena generativa

1. Crear la clase en `src/scenes/` implementando `Scene` (`draw` y `dispose`).
2. Sumarla a `SCENES` en `shared/protocol.ts` con el nombre que va a ver el panel.
3. Registrar cómo se construye en `src/scenes/registry.ts`.

### Agregar un shader

1. Crear `public/shaders/<id>/effect.vert` y `effect.frag`.
2. Sumarlo a `SHADERS` en `shared/protocol.ts`.

Los shaders reciben `tex0`, `resolution`, `time`, `speed`, `offset`,
`brightness`, `contrast`, `saturation` y `distortion`; cada uno usa los que
necesita.
