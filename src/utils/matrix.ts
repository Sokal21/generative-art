export class Matrix {
    grid: Uint8Array;

    constructor(private readonly gridWidth: number, private readonly gridHeigth: number) {
        this.grid = new Uint8Array(gridWidth * gridHeigth);
    }

    setValue(x: number, y: number, value: number) {
        const offset = y * this.gridWidth + x;

        if (offset < this.grid.length) {
            this.grid[y * this.gridWidth + x] = value;
        }
    }

    getValue(x: number, y: number) {
        const offset = y * this.gridWidth + x;

        if (offset < this.grid.length) {
            return this.grid[y * this.gridWidth + x];
        }

        return 0;
    }

    insertMatrix(x: number, y: number, matrix: Matrix) {
        for (let column = 0; column < matrix.gridWidth; column++) {
            for (let row = 0; row < matrix.gridHeigth; row++) {
                this.setValue(x + column, y + row, matrix.getValue(column, row))
            }
        }
    }
}