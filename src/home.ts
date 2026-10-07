import "./control/control.css";

/** Portada: desde acá se elige qué va a ser esta ventana. */
export function startHome(root: HTMLElement, slug: (name: string) => string) {
  root.innerHTML = `
    <main class="home">
      <h1>Visuales</h1>
      <p class="home-lead">Elegí qué va a ser esta ventana.</p>

      <a class="home-card" href="/control">
        <strong>Panel de control</strong>
        <span>Mandá loops, escenas y cámaras a cada pantalla.</span>
      </a>

      <form class="home-card" data-route="screen">
        <strong>Pantalla</strong>
        <span>Muestra lo que le mande el panel. Ponele un nombre para reconocerla.</span>
        <div class="home-row">
          <input name="name" aria-label="Nombre de la pantalla" placeholder="izquierda" autocomplete="off" />
          <button>Abrir pantalla</button>
        </div>
      </form>

      <form class="home-card" data-route="cam">
        <strong>Cámara</strong>
        <span>Transmite la cámara de esta máquina, con efecto, a las pantallas que elijas.</span>
        <div class="home-row">
          <input name="name" aria-label="Nombre de la cámara" placeholder="escenario" autocomplete="off" />
          <button>Abrir cámara</button>
        </div>
      </form>
    </main>
  `;

  root.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = slug(new FormData(form).get("name") as string);
      // Sin nombre, la ruta sola genera uno y lo recuerda.
      location.href = `/${form.dataset.route}/${encodeURIComponent(name)}`;
    });
  });
}
