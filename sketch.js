let iters = 5;
let visited;
let moveCount = 0;
let forgetThreshold = 16;

function hilbertIndexToXY(n, d) {
    let x = 0, y = 0, t = d;
    for (let s = 1; s < (1 << n); s <<= 1) {
        let rx = 1 & (t >> 1);
        let ry = 1 & (t ^ rx);
        if (ry === 0) {
            if (rx === 1) {
                x = s - 1 - x;
                y = s - 1 - y;
            }
            let tmp = x;
            x = y;
            y = tmp;
        }
        x += s * rx;
        y += s * ry;
        t >>= 2;
    }
    return [x, y];
}

function generateHilbertOrder(n) {
    let size = 1 << n;
    let total = size * size;
    let points = [];
    for (let i = 0; i < total; i++) points.push(hilbertIndexToXY(n, i));
    return points;
}

function generateMazeWithHilbert(rows, cols) {
    let order = generateHilbertOrder(Math.log2(rows));
    let index = Array(rows).fill().map(() => Array(cols).fill(0));
    for (let i = 0; i < order.length; i++) {
        let [x, y] = order[i];
        index[y][x] = i;
    }

    let maze = Array(rows).fill().map(() => Array(cols).fill().map(() => ({
        north: false, south: false, east: false, west: false
    })));

    for (let k = 0; k < order.length; k++) {
        let [x, y] = order[k];
        let currentIndex = k;
        let neighbors = [];

        const tryNeighbor = (nx, ny, dir) => {
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return;
            if (index[ny][nx] > currentIndex) neighbors.push({ nx, ny, dir });
        };
        tryNeighbor(x + 1, y, "east");
        tryNeighbor(x - 1, y, "west");
        tryNeighbor(x, y + 1, "south");
        tryNeighbor(x, y - 1, "north");

        if (neighbors.length === 0) continue;
        let { nx, ny, dir } = neighbors[floor(random(neighbors.length))];

        if (dir === "east") { maze[y][x].east = true; maze[ny][nx].west = true; }
        else if (dir === "west") { maze[y][x].west = true; maze[ny][nx].east = true; }
        else if (dir === "south") { maze[y][x].south = true; maze[ny][nx].north = true; }
        else if (dir === "north") { maze[y][x].north = true; maze[ny][nx].south = true; }
    }
    return maze;
}

// Entities
class Entity {
    constructor(x, y) { this.x = x; this.y = y; }
    draw(cellSize) { ellipse(this.x * cellSize, this.y * cellSize, cellSize, cellSize); }
}

// Player vision
function computeVisibleCells(px, py, radius) {
    let visible = new Set();
    let queue = [[px, py, 0]];

    while (queue.length > 0) {
        let [x, y, dist] = queue.shift();
        let key = `${x},${y}`;
        if (visible.has(key) || dist > radius) continue;
        visible.add(key);
        let cell = maze[y][x];
        if (cell.north && y > 0) queue.push([x, y - 1, dist + 1]);
        if (cell.south && y < rows - 1) queue.push([x, y + 1, dist + 1]);
        if (cell.east && x < cols - 1) queue.push([x + 1, y, dist + 1]);
        if (cell.west && x > 0) queue.push([x - 1, y, dist + 1]);
    }
    return visible;
}

// Player
class Player extends Entity {
    move(dx, dy) {
        let nx = this.x + dx;
        let ny = this.y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
        let cell = maze[this.y][this.x];
        if (dx === 1 && !cell.east) return false;
        if (dx === -1 && !cell.west) return false;
        if (dy === 1 && !cell.south) return false;
        if (dy === -1 && !cell.north) return false;
        this.x = nx; this.y = ny;
        moveCount++;
        visited[ny][nx] = moveCount;
        return true;
    }
    draw(px, py, cellSize) { fill(0, 255, 0); rect(px + 2, py + 2, cellSize - 4, cellSize - 4); }
}

// Goal
class Goal extends Entity {
    draw(gx, gy, cellSize) { fill(255, 255, 0); rect(gx + 2, gy + 2, cellSize - 4, cellSize - 4); }
}

// Minotaur
class Minotaur extends Entity {
    constructor(x, y) { super(x, y); this.dir = 3; this.chargeDistance = 3; }
    canMoveDir(dir, x, y) {
        let cell = maze[y][x];
        if (dir === 0) return cell.north;
        if (dir === 1) return cell.east;
        if (dir === 2) return cell.south;
        if (dir === 3) return cell.west;
    }
    step(dir) { if (dir === 0) this.y--; else if (dir === 1) this.x++; else if (dir === 2) this.y++; else if (dir === 3) this.x--; }
    seesPlayerInDirection(dir) {
        let cx = this.x, cy = this.y;
        while (true) {
            if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) break;
            if (!this.canMoveDir(dir, cx, cy)) break;
            if (dir === 0) cy--; else if (dir === 1) cx++; else if (dir === 2) cy++; else if (dir === 3) cx--;
            if (cx === player.x && cy === player.y) return true;
        }
        return false;
    }
    detectPlayerDirection() {
        for (let d = 0; d < 4; d++) if (this.seesPlayerInDirection(d)) return d;
        return null;
    }
    update() {
        let spottedDir = this.detectPlayerDirection();
        if (spottedDir !== null) {
            this.dir = spottedDir;
            for (let i = 0; i < this.chargeDistance; i++) {
                if (this.canMoveDir(this.dir, this.x, this.y)) { this.step(this.dir); if (this.x === player.x && this.y === player.y) break; }
                else break;
            }
            return;
        }
        let forward = this.dir, left = (this.dir + 3) % 4, right = (this.dir + 1) % 4, backward = (this.dir + 2) % 4;
        let canF = this.canMoveDir(forward, this.x, this.y), canL = this.canMoveDir(left, this.x, this.y), canR = this.canMoveDir(right, this.x, this.y), canB = this.canMoveDir(backward, this.x, this.y);
        let nonBackwardMoves = [canF, canL, canR].filter(v => v).length;
        if (nonBackwardMoves === 1 && !canL && !canR) {
            if (this.seesPlayerInDirection(backward)) { this.dir = backward; this.step(this.dir); } 
            else if (canF) { this.dir = forward; this.step(this.dir); }
            return;
        }
        let choices = [];
        if (canF) choices.push(forward);
        if (canL) choices.push(left);
        if (canR) choices.push(right);
        if (choices.length > 0) { this.dir = choices[floor(random(choices.length))]; this.step(this.dir); return; }
        if (canB) { this.dir = backward; this.step(this.dir); }
    }
    draw(mx, my, cellSize) { fill(255, 0, 0); rect(mx + 2, my + 2, cellSize - 4, cellSize - 4); }
}

// BFS from player
function getReachableFromPlayer(excludeX = null, excludeY = null) {
    const key = (x,y) => `${x},${y}`;
    const q = [], seen = new Set();
    if (player.x < 0 || player.x >= cols || player.y < 0 || player.y >= rows) return seen;
    q.push([player.x, player.y]);
    seen.add(key(player.x, player.y));
    while (q.length > 0) {
        const [cx, cy] = q.shift();
        const cell = maze[cy][cx];
        if (cell.north && cy > 0 && !(cx === excludeX && cy - 1 === excludeY)) { const k = key(cx, cy - 1); if (!seen.has(k)) { seen.add(k); q.push([cx, cy - 1]); } }
        if (cell.south && cy < rows - 1 && !(cx === excludeX && cy + 1 === excludeY)) { const k = key(cx, cy + 1); if (!seen.has(k)) { seen.add(k); q.push([cx, cy + 1]); } }
        if (cell.east && cx < cols - 1 && !(cx + 1 === excludeX && cy === excludeY)) { const k = key(cx + 1, cy); if (!seen.has(k)) { seen.add(k); q.push([cx + 1, cy]); } }
        if (cell.west && cx > 0 && !(cx - 1 === excludeX && cy === excludeY)) { const k = key(cx - 1, cy); if (!seen.has(k)) { seen.add(k); q.push([cx - 1, cy]); } }
    }
    return seen;
}

// NEW SAFE REGENERATION
function regenerateForgottenCell(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    if (visited[y][x] === -1) return;
    if (moveCount - visited[y][x] <= forgetThreshold) return;

    const reachable = getReachableFromPlayer(x, y);

    const neighbors = [];
    if (y > 0) neighbors.push({ nx: x, ny: y - 1, dir: 'north', opp: 'south' });
    if (y < rows - 1) neighbors.push({ nx: x, ny: y + 1, dir: 'south', opp: 'north' });
    if (x > 0) neighbors.push({ nx: x - 1, ny: y, dir: 'west', opp: 'east' });
    if (x < cols - 1) neighbors.push({ nx: x + 1, ny: y, dir: 'east', opp: 'west' });

    shuffle(neighbors, true);

    let chosen = null;
    for (const n of neighbors) if (reachable.has(`${n.nx},${n.ny}`)) { chosen = n; break; }
    if (!chosen && neighbors.length > 0) chosen = neighbors[0];

    if (chosen) {
        const cell = maze[y][x];
        cell.north = cell.south = cell.east = cell.west = false;
        cell[chosen.dir] = true;
        maze[chosen.ny][chosen.nx][chosen.opp] = true;
    }
}

// Setup
let maze, cellSize, rows = Math.pow(2, iters), cols = Math.pow(2, iters);
let player, goal, minotaur;

function setup() {
    createCanvas(400, 400);
    cellSize = width / cols;
    maze = generateMazeWithHilbert(rows, cols);
    visited = Array(rows).fill().map(() => Array(cols).fill(-1));
    player = new Player(0, 0);
    goal = new Goal(cols - 1, rows - 1);
    minotaur = new Minotaur(cols - 1, 0);
    visited[player.y][player.x] = 0;
    noLoop();
    redraw();
}

// Player input
function keyReleased() {
    let moved = false;
    if (key === 'w' || keyCode === UP_ARROW) moved = player.move(0, -1);
    else if (key === 's' || keyCode === DOWN_ARROW) moved = player.move(0, 1);
    else if (key === 'a' || keyCode === LEFT_ARROW) moved = player.move(-1, 0);
    else if (key === 'd' || keyCode === RIGHT_ARROW) moved = player.move(1, 0);
    if (moved) { minotaur.update(); redraw(); }
}

// Draw
function draw() {
    strokeWeight(2);
    background(0);

    let visibleCells = computeVisibleCells(player.x, player.y, 5);
    visibleCells.add(`${player.x},${player.y}`);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let lastVisited = visited[y][x];
            let cell = maze[y][x];
            let px = x * cellSize, py = y * cellSize;
            let isRegen = false;

            if (visibleCells.has(`${x},${y}`)) {
                if (lastVisited !== -1 && moveCount - lastVisited > forgetThreshold) {
                    regenerateForgottenCell(x, y);
                    isRegen = true;
                }
                visited[y][x] = moveCount;
                fill(255);
            } else if (lastVisited !== -1 && moveCount - lastVisited <= forgetThreshold) {
                fill(255 - 15 * (moveCount - lastVisited));
            } else fill(192);

            noStroke();
            rect(px, py, cellSize, cellSize);

            if (visibleCells.has(`${x},${y}`) || lastVisited !== -1) {
                stroke(isRegen ? color(255, 0, 0) : 0);
                if (!cell.north) line(px + 0.5, py + 0.5, px + cellSize + 0.5, py + 0.5);
                if (!cell.south) line(px + 0.5, py + cellSize + 0.5, px + cellSize + 0.5, py + cellSize + 0.5);
                if (!cell.west) line(px + 0.5, py + 0.5, px + 0.5, py + cellSize + 0.5);
                if (!cell.east) line(px + cellSize + 0.5, py + 0.5, px + cellSize + 0.5, py + cellSize + 0.5);
            }
        }
    }

    goal.draw(goal.x * cellSize, goal.y * cellSize, cellSize);
    minotaur.draw(minotaur.x * cellSize, minotaur.y * cellSize, cellSize);
    player.draw(player.x * cellSize, player.y * cellSize, cellSize);
}
