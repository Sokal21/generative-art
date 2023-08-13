import p5 from "p5";

export abstract class Scene {
    abstract p5: p5

    abstract draw(): void
    abstract delete(): void
}