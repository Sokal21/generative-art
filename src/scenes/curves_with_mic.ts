import p5 from "p5";
import { Scene } from ".";
import { Microphone } from "../inputs/microphone";
import { Midi } from "../inputs/midit";
import { ControlChangeMessageEvent } from "webmidi";

export class CurvesWithMic implements Scene {
    p5: p5;
    dx: number;
    spacing: number;
    sectors: number;
    midiController: Midi | undefined;
    controllerListenerUuids: string[] = [];
    currentClicks = 0;

    constructor(
        p5: p5,
        private readonly microphone: Microphone,
        private readonly canvasWidth: number,
        private readonly canvasHeight: number,
        private theta = 0.00,
        private amplitude = 100.0,
        private period = 500,
        private clicks = 1000,
        // private readonly minYchange: number,
        // private readonly maxYchange: number,
    ) {
        this.p5 = p5;
        this.sectors = microphone.bufferLength;
        this.spacing = this.canvasWidth / this.sectors;
        this.dx = (p5.TWO_PI / this.period) * this.spacing

        this.controllerListener = this.controllerListener.bind(this);
    }

    delete(): void {
        this.controllerListenerUuids.map((uuid) => this.midiController?.removeNoteListener(uuid));
    }

    controllerListener(event: ControlChangeMessageEvent) {
        if (event.subtype === "controller51" && event.value) {
            this.amplitude = 1000 * (event.value as any);
        }

        if (event.subtype === "expressionfine" && event.value) {
            this.period = 1000 * (event.value as any);
        }
        // func(this, 10);
    }

    addMidiController(controller: Midi) {
        this.controllerListenerUuids.push(
            controller.addControllerListener(this.controllerListener)
        );
    }

    calcWave(sectorNumber: number) {
        // Increment theta (try different values for
        // 'angular velocity' here)

        let x = this.theta + this.dx * sectorNumber;
        // func(this, amp); 
        return (1 / 4 * (3 * this.p5.sin(x) - this.p5.sin(3 * x))) * this.amplitude;
    }

    draw(): void {
        // const xOffset = this.canvasWidth / this.sectors;

        console.log(this.p5.deltaTime);


        this.p5.fill("#ff0a6c");
        const sample = this.microphone.getByteTimeDomainData();

        // this.p5.rotate(this.p5.PI / 4.0);
        this.p5.beginShape();

        for (let x = 0; x < this.sectors; x++) {
            const y = this.calcWave(x);
            this.p5.curveVertex(x * this.spacing, this.canvasHeight / 2 + y + (sample[x] - 128) * 0.5);

            // const y = this.p5.noise(x * noiseScale, (this.canvasWidth / 2) * noiseScale) * 80 + this.canvasWidth / 2;
            // const y = this.calcWave(x) + this.canvasWidth / 2;
            // this.p5.ellipse(x * this.spacing, this.canvasHeight / 2 + this.calcWave(x) + (sample[x] - 128) * 0.5, this.canvasWidth / this.sectors, this.canvasWidth / this.sectors);


            // x += xOffset;


        }
        // this.p5.curveVertex(this.canvasWidth, this.canvasHeight);
        // this.p5.curveVertex(0, this.canvasHeight);
        // this.p5.curveVertex(0, this.canvasHeight / 2);
        this.p5.endShape(this.p5.CLOSE);

        // throw new Error("asdasdasd")
        // this.p5.curveVertex(this.canvasWidth * 1 / 4, this.canvasHeight / 2 + 50);
        // this.p5.curveVertex(this.canvasWidth * 1 / 2, this.canvasHeight / 2 - 100);
        // this.p5.curveVertex(this.canvasWidth * 3 / 4, this.canvasHeight / 2 + 15);
        // this.p5.curveVertex(this.canvasWidth, this.canvasHeight / 2 + 200);

        // this.microphone.getByteTimeDomainData().forEach((value) => {
        //     this.p5.curveVertex(x, this.canvasHeight / 2 + (value));
        //     x += xOffset;
        // })
        // this.p5.curveVertex(this.canvasWidth, this.canvasHeight);
        // this.p5.curveVertex(0, this.canvasHeight);
        // this.p5.curveVertex(0, this.canvasHeight/2);

        // this.p5.curveVertex(0 - 300, 300);
        // this.p5.curveVertex(0 + (this.canvasWidth / 5) * 1, 300);
        // this.p5.curveVertex(0 + (this.canvasWidth / 5) * 2, 300);
        // this.p5.curveVertex(0 + (this.canvasWidth / 5) * 3, 300);
        // this.p5.curveVertex(0 + (this.canvasWidth / 5) * 4, 300);
        // this.p5.curveVertex(this.canvasWidth / 2 + 300, 300);
        // this.p5.curveVertex(this.canvasWidth / 2 + 300, this.canvasHeight / 2 + 500);
    }
}