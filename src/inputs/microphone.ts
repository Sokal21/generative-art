export class Microphone {
    private audioCtx = new AudioContext();
    dataArray: Uint8Array;
    dataArrayFrequency: Uint8Array;

    analyser: AnalyserNode | undefined;

    constructor(deviceId: string, readonly bufferLength = 256) {
        this.dataArray = new Uint8Array(this.bufferLength);
        this.dataArrayFrequency = new Uint8Array(this.bufferLength);

        navigator.mediaDevices
            .getUserMedia({ video: false, audio: { deviceId } })
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
}