const CACHE_NAME = "visuales-media";
const PROBE_TIMEOUT_MS = 20000;

// Una URL local por video: es solo un puntero al archivo ya guardado.
const sources = new Map<string, string>();

/** URL lista para reproducir sin red, o null si este video todavía no se bajó. */
export async function cachedSource(url: string): Promise<string | null> {
  const known = sources.get(url);
  if (known) return known;

  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url);
  if (!response) return null;
  const source = URL.createObjectURL(await response.blob());
  sources.set(url, source);
  return source;
}

/** Guarda el video en la Cache API. Si se corta a la mitad no queda nada guardado. */
export async function download(
  url: string,
  onProgress: (progress: number) => void,
  signal: AbortSignal
) {
  const cache = await caches.open(CACHE_NAME);
  if (await cache.match(url)) return;

  // no-store: ya lo guardamos nosotros, no hace falta otra copia en disco.
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`El hub respondió ${response.status}`);

  const total = Number(response.headers.get("Content-Length")) || 0;
  let loaded = 0;
  const counted = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.length;
        if (total) onProgress(loaded / total);
        controller.enqueue(chunk);
      },
    })
  );
  await cache.put(url, new Response(counted, { headers: response.headers }));
}

/** Confirma que este navegador puede decodificar el video antes de mandarlo a pantalla. */
export function probe(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // En una pestaña oculta Chrome puede no cargar el video hasta que se muestre,
    // y esa pantalla frenaría a las demás.
    if (document.hidden) return resolve();

    const video = document.createElement("video");
    const finish = (error?: string) => {
      clearTimeout(timer);
      video.onloadeddata = video.onerror = null;
      video.removeAttribute("src");
      video.load();
      error ? reject(new Error(error)) : resolve();
    };
    const timer = setTimeout(() => finish("tardó demasiado en abrir"), PROBE_TIMEOUT_MS);
    video.onloadeddata = () => finish(video.videoWidth > 0 ? undefined : "no tiene imagen");
    video.onerror = () => finish("este navegador no puede reproducir el formato");
    video.muted = true;
    video.preload = "auto";
    video.src = source;
  });
}

/** Borra lo guardado de los videos que ya no están en el hub. */
export async function prune(keep: string[]) {
  const urls = new Set(keep.map((url) => new URL(url, location.href).href));
  const cache = await caches.open(CACHE_NAME);
  for (const request of await cache.keys()) {
    if (urls.has(request.url)) continue;
    await cache.delete(request);
    const path = new URL(request.url).pathname;
    const source = sources.get(path);
    if (source) URL.revokeObjectURL(source);
    sources.delete(path);
  }
}
