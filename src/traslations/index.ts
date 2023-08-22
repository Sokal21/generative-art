import p5 from "p5";

export abstract class Traslation {
    time: number = 0;

    constructor(public speed: number) {
    }

    tick() {
        this.time+=this.speed;
    };
    abstract calculatePosition(time: number): p5.Vector;
    getPosition(): p5.Vector {
        return this.calculatePosition(this.time)
    };
}