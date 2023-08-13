import { Matrix } from "../utils/matrix";

export class LifeGame {
    grid: Matrix;

    constructor(private readonly gridWidth: number, private readonly gridHeigth: number) {
        this.grid = new Matrix(gridWidth, gridHeigth)
    }

    getNeighbours(x: number, y: number) {
        const neighbours = new Uint8Array(8);

        neighbours[0] = this.grid.getValue(x, y + 1);
        neighbours[1] = this.grid.getValue(x + 1, y + 1);
        neighbours[2] = this.grid.getValue(x + 1, y);
        neighbours[3] = this.grid.getValue(x + 1, y - 1);
        neighbours[4] = this.grid.getValue(x, y - 1);
        neighbours[5] = this.grid.getValue(x - 1, y - 1);
        neighbours[6] = this.grid.getValue(x - 1, y);
        neighbours[7] = this.grid.getValue(x - 1, y + 1);

        return neighbours;
    }

    aliveNeighbours(x: number, y: number): number {
        const neighbours = this.getNeighbours(x, y);

        return neighbours.reduce((sum, value) => {
            if (value) {
                return sum + 1
            } else {
                return sum
            }
        }, 0)
    }

    step() {
        const changes: Array<{ x: number, y: number, value: number }> = [];

        for (let y = 0; y < this.gridHeigth; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid.getValue(x, y)
                const numberOfAlives = this.aliveNeighbours(x, y)


                if (cell) {
                    if (numberOfAlives < 2) {
                        changes.push({
                            x, y, value: 0
                        })
                    }
                    if (numberOfAlives > 3) {
                        changes.push({
                            x, y, value: 0
                        })
                    }
                } else {
                    if (numberOfAlives === 3) {
                        changes.push({
                            x, y, value: 1
                        })
                    }
                }
            }
        }

        changes.forEach((change) => this.grid.setValue(change.x, change.y, change.value))
    }
}