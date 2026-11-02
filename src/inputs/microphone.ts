// Si dejan de llegar datos del panel, más vale silencio que el último golpe congelado.
const REMOTE_STALE_MS = 500;

export class Microphone {
    private audioCtx?: AudioContext;
    private stream?: MediaStream;
    private opening?: Promise<void>;
    private remote = false;
    private lastFed = 0;
    dataArray: Uint8Array;
    dataArrayFrequency: Uint8Array;
    private lastVolume = 0;
    private beatThreshold = 1.2; // Adjust this value to change beat sensitivity
    private beatDecayRate = 0.98; // How quickly the beat threshold decays

    analyser: AnalyserNode | undefined;

    constructor(private readonly deviceId: string, readonly bufferLength = 256) {
        this.dataArray = new Uint8Array(this.bufferLength);
        this.dataArrayFrequency = new Uint8Array(this.bufferLength);
    }

    // El permiso se pide recién al usarlo: si el sonido viene del panel, nunca.
    open(): Promise<void> {
        return (this.opening ??= navigator.mediaDevices
            .getUserMedia({
                video: false,
                audio: {
                    deviceId: this.deviceId === 'default' ? undefined : { exact: this.deviceId },
                    // Pensados para voz: tratan a la música como ruido y la apagan.
                    echoCancellation: false,
                    noiseSuppression: false,
                }
            })
            .then((stream) => {
                this.stream = stream;
                this.audioCtx = new AudioContext();
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = this.bufferLength;

                const source = this.audioCtx.createMediaStreamSource(stream);
                source.connect(this.analyser);
                this.resume();
                // this.analyser.connect(this.audioCtx.destination);
            }));
    }

    close() {
        this.stream?.getTracks().forEach((track) => track.stop());
        this.audioCtx?.close();
    }

    // Chrome deja el AudioContext suspendido hasta que haya un gesto del usuario.
    private resume() {
        if (this.audioCtx?.state !== "suspended") return;
        const unlock = () => this.audioCtx?.resume();
        this.audioCtx.resume().catch(() => {});
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
    }

    /** Con `true`, el sonido deja de salir de este micrófono y lo manda el panel. */
    setRemote(remote: boolean) {
        this.remote = remote;
        this.dataArrayFrequency.fill(0);
    }

    feed(spectrum: string) {
        if (!this.remote) return;
        const bytes = atob(spectrum);
        for (let i = 0; i < bytes.length && i < this.bufferLength; i++) {
            this.dataArrayFrequency[i] = bytes.charCodeAt(i);
        }
        this.lastFed = performance.now();
    }

    /** Las frecuencias actuales listas para mandar. La mitad de arriba del arreglo siempre es cero. */
    spectrum(): string {
        const bins = this.getByteFrequencyData().subarray(0, this.bufferLength / 2);
        return btoa(String.fromCharCode(...bins));
    }

    getAverageVolume() {
        const dataArrayFrequency = this.getByteFrequencyData()

        return dataArrayFrequency.reduce((avg, f) => avg + f) / dataArrayFrequency.length;
    }

    getByteFrequencyData(): Uint8Array {
        if (this.remote) {
            if (performance.now() - this.lastFed > REMOTE_STALE_MS) this.dataArrayFrequency.fill(0);
            return this.dataArrayFrequency;
        }
        if (!this.opening) {
            this.open().catch((err) => console.error(`you got an error: ${err}`));
        }
        this.analyser?.getByteFrequencyData(this.dataArrayFrequency);

        return this.dataArrayFrequency;
    }

    getByteTimeDomainData(): Uint8Array {
        this.analyser?.getByteTimeDomainData(this.dataArray);

        return this.dataArray;
    }

    detectBeat(): boolean {
        const currentVolume = this.getAverageVolume();
        const isBeat = currentVolume > this.lastVolume * this.beatThreshold;

        // Update last volume with decay
        this.lastVolume = Math.max(currentVolume, this.lastVolume * this.beatDecayRate);

        return isBeat;
    }
}
