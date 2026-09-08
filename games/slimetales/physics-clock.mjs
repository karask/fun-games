// Keep the original 60 Hz tuning at every display refresh rate. Long gaps are
// discarded so returning to a suspended tab cannot fast-forward into a hazard.
export class FixedStepClock {
    constructor() { this.reset(); }
    reset() { this.last = null; this.remainder = 0; }
    advance(timestamp, step) {
        if (this.last === null) { this.last = timestamp; return; }
        const elapsed = Math.max(0, timestamp - this.last);
        this.last = timestamp;
        if (elapsed > 250) { this.remainder = 0; return; }
        const interval = 1000 / 60;
        this.remainder += elapsed;
        while (this.remainder + 1e-7 >= interval) {
            this.remainder -= interval;
            step();
        }
    }
}
