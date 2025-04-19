import p5 from "p5";
import { Scene } from ".";
import { LifeGame } from "../patterns/life_game";
import { Microphone } from "../inputs/microphone";
import { Matrix } from "../utils/matrix";
import { shuffle } from "lodash";
import { Midi } from "../inputs/midit";
import { NoteMessageEvent } from "webmidi";

export class LifeGameWithMic implements Scene {
    p5: p5;
    lifeGame: LifeGame;
    intervalSampling: number;
    intervalSteping: number;
    generatedGridSize: number;
    midiController: Midi | undefined;
    notesListenerUuids: string[] = [];
    cellColor = '#ffffff';
    backgroundColor = '#000000';

    constructor(
        p5: p5,
        private readonly microphone: Microphone,
        private readonly gridWidth: number,
        private readonly gridHeight: number,
        private readonly gridSize: number,
        generatedGridSize: number,
        samplingRate: number,
        stepInterval: number,
        private squareRadius = 0,
    ) {
        this.p5 = p5;
        this.lifeGame = new LifeGame(gridWidth, gridHeight);
        this.generatedGridSize = Math.pow(2, generatedGridSize);

        this.intervalSteping = setInterval(() => {
            this.lifeGame.step();
        }, stepInterval);
        this.intervalSampling = setInterval(() => {
            this.gridMixer();
        }, samplingRate);

        this.noteListener = this.noteListener.bind(this);
    }

    addMidiController(controller: Midi) {
        this.notesListenerUuids.push(controller.addNoteListener(this.noteListener));
    }

    private noteListener(event: NoteMessageEvent) {
        switch (event.note.name) {
            case "C":
                this.cellColor = '#222222';
                break;
            case "D":
                this.cellColor = '#ff0a6c';
                break;
            default:
                break;
        }
    }

    changeSquareRadius(newSquareRadius: number) {
        this.squareRadius = newSquareRadius;
    }

    changeGeneratedGridSize(newGridSize: number) {
        this.generatedGridSize = Math.pow(2, newGridSize);
    }

    changeIntervalStep(newStepInterval: number) {
        clearInterval(this.intervalSteping);
        this.intervalSampling = setInterval(() => {
            this.lifeGame.step();
        }, newStepInterval);
    }


    changeIntervalSampling(newSamplingRate: number) {
        clearInterval(this.intervalSampling);
        this.intervalSampling = setInterval(() => {
            this.gridMixer();
        }, newSamplingRate);
    }

    private getRandomArbitrary(min: number, max: number) {
        return Math.ceil(Math.random() * (max - min) + min);
    }

    private gridMixer() {
        const dataArray = shuffle(this.microphone.getByteFrequencyData());
        const cellGrid = new Matrix(this.generatedGridSize, this.generatedGridSize)
        const rawRowSize = this.microphone.bufferLength / this.generatedGridSize;
        const rawColumnSize = rawRowSize / this.generatedGridSize;

        for (let i = 0; i < this.generatedGridSize; i++) {
            const rawRow = dataArray.slice(i, (i + 1) * rawRowSize);

            for (let j = 0; j < this.generatedGridSize; j++) {
                const batch = rawRow.slice((j + i) * rawColumnSize, (j + i + 1) * rawColumnSize);
                const average = batch.reduce((p, v) => p + v, 0) / batch.length;

                cellGrid.setValue(i, j, average > 25 ? 1 : 0)
            }
        }

        this.lifeGame.grid.insertMatrix(
            this.getRandomArbitrary(0, this.gridWidth - 1),
            this.getRandomArbitrary(0, this.gridHeight - 1),
            cellGrid,
        );
    }

    delete(): void {
        clearInterval(this.intervalSampling);
        clearInterval(this.intervalSteping);
        this.notesListenerUuids.map((uuid) => this.midiController?.removeNoteListener(uuid));
    }

    draw(): void {
        this.p5.noStroke();

        for (let y = 0; y < this.gridHeight; y++) {

            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.lifeGame.grid.getValue(x, y);

                if (cell) {
                    this.p5.fill(this.cellColor);
                } else {
                    this.p5.fill(this.backgroundColor);
                }

                this.p5.square(x * this.gridSize, y * this.gridSize, this.gridSize, this.squareRadius)
            }

        }

        this.p5.translate(this.gridWidth * this.gridSize, 0)

        for (let y = 0; y < this.gridHeight; y++) {

            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.lifeGame.grid.getValue((this.gridWidth - x), y);

                if (cell) {
                    this.p5.fill(this.cellColor);
                } else {
                    this.p5.fill(this.backgroundColor);
                }

                this.p5.square(x * this.gridSize, y * this.gridSize, this.gridSize, this.squareRadius)
            }

        }

        this.p5.translate(0, this.gridHeight * this.gridSize)

        for (let y = 0; y < this.gridHeight; y++) {

            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.lifeGame.grid.getValue((this.gridWidth - x), (this.gridHeight - y));

                if (cell) {
                    this.p5.fill(this.cellColor);
                } else {
                    this.p5.fill(this.backgroundColor);
                }

                this.p5.square(x * this.gridSize, y * this.gridSize, this.gridSize, this.squareRadius)
            }

        }

        this.p5.translate(- this.gridWidth * this.gridSize, 0)

        for (let y = 0; y < this.gridHeight; y++) {

            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.lifeGame.grid.getValue(x, (this.gridHeight - y));

                if (cell) {
                    this.p5.fill(this.cellColor);
                } else {
                    this.p5.fill(this.backgroundColor);
                }

                this.p5.square(x * this.gridSize, y * this.gridSize, this.gridSize, this.squareRadius)
            }

        }

        this.p5.translate(0, - this.gridHeight * this.gridSize)
    }
}