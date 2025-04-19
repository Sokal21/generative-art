export class Microphone {
    private audioCtx = new AudioContext();
    dataArray: Uint8Array;
    dataArrayFrequency: Uint8Array;
    private lastVolume = 0;
    private beatThreshold = 1.2; // Adjust this value to change beat sensitivity
    private beatDecayRate = 0.98; // How quickly the beat threshold decays

    analyser: AnalyserNode | undefined;

    constructor(deviceId: string, readonly bufferLength = 256) {
        this.dataArray = new Uint8Array(this.bufferLength);
        this.dataArrayFrequency = new Uint8Array(this.bufferLength);

        navigator.mediaDevices
            .getUserMedia({ 
                video: false, 
                audio: {
                    deviceId: deviceId === 'default' ? undefined : { exact: deviceId }
                }
            })
            .then((stream) => {
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = this.bufferLength;

                const source = this.audioCtx.createMediaStreamSource(stream);
                source.connect(this.analyser);
                // this.analyser.connect(this.audioCtx.destination);
            })
            .catch((err) => {
                console.error(`you got an error: ${err}`);
            });
    }

    getAverageVolume() {
        const dataArrayFrequency = this.getByteFrequencyData()

        return dataArrayFrequency.reduce((avg, f) => avg + f) / dataArrayFrequency.length;
    }

    getByteFrequencyData(): Uint8Array {
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