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

        this.intervalSteping = window.setInterval(() => {
            this.lifeGame.step();
        }, stepInterval);
        this.intervalSampling = window.setInterval(() => {
            this.gridMixer();
        }, samplingRate);

        this.noteListener = this.noteListener.bind(this);
    }

    addMidiController(controller: Midi) {
        this.midiController = controller;
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
        this.intervalSteping = window.setInterval(() => {
            this.lifeGame.step();
        }, newStepInterval);
    }


    changeIntervalSampling(newSamplingRate: number) {
        clearInterval(this.intervalSampling);
        this.intervalSampling = window.setInterval(() => {
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

    dispose(): void {
        clearInterval(this.intervalSampling);
        clearInterval(this.intervalSteping);
        this.notesListenerUuids.map((uuid) => this.midiController?.removeNoteListener(uuid));
    }

    draw(): void {
        const { gridWidth, gridHeight, gridSize } = this;
        const grid = this.lifeGame.grid;

        this.p5.translate(-gridWidth * gridSize, -gridHeight * gridSize);
        this.p5.noStroke();
        this.p5.fill(this.backgroundColor);
        this.p5.rect(0, 0, gridWidth * 2 * gridSize, gridHeight * 2 * gridSize);
        this.p5.fill(this.cellColor);

        const cell = (alive: number, column: number, row: number) => {
            if (alive) {
                this.p5.square(column * gridSize, row * gridSize, gridSize, this.squareRadius);
            }
        };

        // La grilla se dibuja cuatro veces, espejada en cada cuadrante.
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                cell(grid.getValue(x, y), x, y);
                cell(grid.getValue(gridWidth - x, y), x + gridWidth, y);
                cell(grid.getValue(gridWidth - x, gridHeight - y), x + gridWidth, y + gridHeight);
                cell(grid.getValue(x, gridHeight - y), x, y + gridHeight);
            }
        }
    }
}
