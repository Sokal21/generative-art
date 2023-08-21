export class Clock {
    current = 0;

    constructor(public speed = 1, public cycle = 100) {
    }

    percentage() {
        return this.current / this.cycle
    }

    tick(onEndCycle?: () => void) {
        if (this.current >= this.cycle) {
            this.current = 0;
            onEndCycle?.();
        } else {
            this.current += this.speed;
        }
    }
}