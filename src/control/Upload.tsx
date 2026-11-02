import { useEffect, useState } from "preact/hooks";
import { MEDIA_PATH } from "../../shared/protocol";

type Progress = { name: string; percent: number } | null;

function send(file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    // fetch no informa el avance de una subida.
    const request = new XMLHttpRequest();
    request.open("POST", `${MEDIA_PATH}?name=${encodeURIComponent(file.name)}`);
    request.upload.onprogress = (event) => onProgress(Math.floor((event.loaded / event.total) * 100));
    request.onload = () => {
      if (request.status < 300) return resolve();
      let reason = `error ${request.status}`;
      try {
        reason = JSON.parse(request.responseText).error ?? reason;
      } catch {}
      reject(new Error(reason));
    };
    request.onerror = () => reject(new Error("se cortó la conexión con el hub"));
    request.send(file);
  });
}

export function Upload() {
  const [progress, setProgress] = useState<Progress>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: Iterable<File>) => {
    setError(null);
    for (const file of files) {
      try {
        setProgress({ name: file.name, percent: 0 });
        await send(file, (percent) => setProgress({ name: file.name, percent }));
      } catch (failure) {
        setError(`No se pudo subir ${file.name}: ${(failure as Error).message}`);
      }
    }
    setProgress(null);
  };

  // Soltar un video en cualquier parte del panel lo sube.
  useEffect(() => {
    const over = (event: DragEvent) => event.preventDefault();
    const drop = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.files.length) upload([...event.dataTransfer.files]);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <div class="upload">
      <label class={`upload-pick ${progress ? "upload-busy" : ""}`}>
        Subir video
        <input
          type="file"
          accept="video/*,.mov,.m4v,.ogv"
          multiple
          disabled={!!progress}
          onChange={(event) => {
            const input = event.currentTarget;
            upload([...(input.files ?? [])]).then(() => (input.value = ""));
          }}
        />
      </label>
      <span class={`panel-note ${error ? "fault" : ""}`} role="status">
        {error ??
          (progress
            ? `Subiendo ${progress.name}: ${progress.percent}%`
            : "O soltalo en cualquier parte del panel.")}
      </span>
    </div>
  );
}
