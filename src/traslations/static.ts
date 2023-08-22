import p5 from "p5";
import { Traslation } from ".";

export class Static extends Traslation {
    constructor(
        public p5: p5,
        public center: p5.Vector,
    ) {
        super(0);
    }

    calculatePosition(): p5.Vector {
        return this.center;
    }
}