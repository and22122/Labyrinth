// p5.js sketch — rebuild-maze-with-preserved-connections approach

let iters = 5;
let rows = 1 << iters;
let cols = 1 << iters;
let cellSize;

let maze;
let visited;
let moveCount = 0;
let forgetThreshold = 2 ** 5;
let fadeRate = 255 / forgetThreshold;

let player, minotaur, ariadne;

let gameState = "playing"; // "playing", "won", "lost"



// win screen
function drawWinScreen() {
  push();
  background(255, 255, 255, 192);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("Congratulations!\nYou found Ariadne!", width/2, height/2);
  pop();
}

// lose screen
function drawLoseScreen() {
  push();
  background(255, 255, 255, 192);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("You lost - \nThe minotaur got you!", width/2, height/2);
  pop();
}


// small helper to produce numeric id for union-find
function idFor(x, y) { return y * cols + x; }

// --- Hilbert helpers (same as before) ---
function hilbertIndexToXY(n, d) {
  let x = 0, y = 0, t = d;
  for (let s = 1; s < (1 << n); s <<= 1) {
    let rx = 1 & (t >> 1);
    let ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      [x, y] = [y, x];
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

function generateMazeWithHilbert(rowsArg, colsArg) {
  let order = generateHilbertOrder(Math.log2(rowsArg));
  let index = Array(rowsArg).fill().map(() => Array(colsArg).fill(0));
  for (let i = 0; i < order.length; i++) {
    let [x, y] = order[i];
    index[y][x] = i;
  }

  let m = Array(rowsArg).fill().map(() =>
    Array(colsArg).fill().map(() => ({ north: false, south: false, east: false, west: false }))
  );

  for (let k = 0; k < order.length; k++) {
    let [x, y] = order[k];
    let neighbors = [];
    const tryNeighbor = (nx, ny, dir) => {
      if (nx < 0 || nx >= colsArg || ny < 0 || ny >= rowsArg) return;
      if (index[ny][nx] > k) neighbors.push({ nx, ny, dir });
    };
    tryNeighbor(x + 1, y, "east");
    tryNeighbor(x - 1, y, "west");
    tryNeighbor(x, y + 1, "south");
    tryNeighbor(x, y - 1, "north");

    if (neighbors.length === 0) continue;
    let { nx, ny, dir } = neighbors[floor(random(neighbors.length))];
    if (dir === "east") { m[y][x].east = true; m[ny][nx].west = true; }
    else if (dir === "west") { m[y][x].west = true; m[ny][nx].east = true; }
    else if (dir === "south") { m[y][x].south = true; m[ny][nx].north = true; }
    else if (dir === "north") { m[y][x].north = true; m[ny][nx].south = true; }
  }
  return m;
}

// --- Entities (unchanged behavior) ---
class Entity {
  constructor(x, y) { this.x = x; this.y = y; }
  draw(px, py, cellSize) { ellipse(px, py, cellSize, cellSize); }
}

class Player extends Entity {
  move(dx, dy) {
    let nx = this.x + dx, ny = this.y + dy;
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
    let cell = maze[this.y][this.x];
    if (dx === 1 && !cell.east) return false;
    if (dx === -1 && !cell.west) return false;
    if (dy === 1 && !cell.south) return false;
    if (dy === -1 && !cell.north) return false;
    this.x = nx; this.y = ny;
    moveCount++; visited[ny][nx] = moveCount;
    return true;
  }
  draw(px, py, cellSize) { fill(0,255,0); rect(px+2, py+2, cellSize-4, cellSize-4); }
}

class Ariadne extends Player {
  constructor(x, y) {
    super(x, y);
  }

  moveAI() {
    const key = (x, y) => `${x},${y}`;
    const candidates = [];
    const c = maze[this.y][this.x];

    // Build possible moves
    if (c.north && this.y > 0) candidates.push([this.x, this.y - 1]);
    if (c.south && this.y < rows - 1) candidates.push([this.x, this.y + 1]);
    if (c.east && this.x < cols - 1) candidates.push([this.x + 1, this.y]);
    if (c.west && this.x > 0) candidates.push([this.x - 1, this.y]);

    if (candidates.length === 0) return; // trapped

    let bestScore = -Infinity;
    let bestMoves = [];

    for (let [nx, ny] of candidates) {
      // distance to player (closer is better)
      let dist = Math.abs(nx - player.x) + Math.abs(ny - player.y);
      let score = -dist; // closer = higher score

      // dead-end penalty: fewer open neighbors = slightly lower score
      let nc = maze[ny][nx];
      let openDirs = 0;
      if (nc.north) openDirs++;
      if (nc.south) openDirs++;
      if (nc.east) openDirs++;
      if (nc.west) openDirs++;
      score += openDirs * 0.2; // small bonus for not being a dead-end

      // slight randomness to prevent looping
      score += random(0, 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [[nx, ny]];
      } else if (score === bestScore) {
        bestMoves.push([nx, ny]);
      }
    }

    // pick one of the best moves randomly
    let [tx, ty] = bestMoves[floor(random(bestMoves.length))];
    this.x = tx;
    this.y = ty;
  }

  draw(px, py, cellSize) {
    fill(200, 100, 150);
    ellipse(px + cellSize / 2, py + cellSize / 2, cellSize * 0.7);
  }
}

class Minotaur extends Entity {
  constructor(x, y) {
    super(x, y);
    this.dir = 3;
    this.chargeDistance = 3;
    this.noiseCounter = 0; // increases when player regenerates cells nearby
  }

  canMoveDir(dir, x, y) {
    let c = maze[y][x];
    return dir === 0 ? c.north : dir === 1 ? c.east : dir === 2 ? c.south : c.west;
  }

  step(dir) {
    if (dir === 0) this.y--;
    else if (dir === 1) this.x++;
    else if (dir === 2) this.y++;
    else this.x--;
  }

  seesPlayerInDirection(dir) {
    let cx = this.x, cy = this.y;
    while (true) {
      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) break;
      if (!this.canMoveDir(dir, cx, cy)) break;
      if (dir === 0) cy--; else if (dir === 1) cx++; else if (dir === 2) cy++; else cx--;
      if (cx === player.x && cy === player.y) return true;
    }
    return false;
  }

  detectPlayerDirection() {
    for (let d = 0; d < 4; d++)
      if (this.seesPlayerInDirection(d)) return d;
    return null;
  }

  // prefer directions that are not dead-ends
  nonDeadEndDirs(dirs, x, y) {
    return dirs.filter(d => {
      let nx = x, ny = y;
      if (d === 0) ny--; else if (d === 1) nx++; else if (d === 2) ny++; else nx--;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
      let c = maze[ny][nx];
      let openCount = 0;
      if (c.north) openCount++;
      if (c.east) openCount++;
      if (c.south) openCount++;
      if (c.west) openCount++;
      return openCount > 1; // not a dead end
    });
  }

  update() {
    // noise awareness increment: if player regenerated nearby, minotaur is more alert
    if (regeneratedThisFrame.has(`${this.x},${this.y}`)) this.noiseCounter += 1;
    if (this.noiseCounter > 5) this.noiseCounter = 5;

    let spotted = this.detectPlayerDirection();
    if (spotted !== null || this.noiseCounter > 0) {
      // charge only when sees player or noiseCounter > 0
      if (spotted !== null) this.dir = spotted;
      for (let i = 0; i < this.chargeDistance; i++) {
        if (this.canMoveDir(this.dir, this.x, this.y)) {
          this.step(this.dir);
          if (this.x === player.x && this.y === player.y) break;
        } else break;
      }
      this.noiseCounter = 0; // reset after moving toward player
      return;
    }

    // random movement with dead-end awareness
    let forward = this.dir, left = (this.dir + 3) % 4, right = (this.dir + 1) % 4, backward = (this.dir + 2) % 4;
    let canF = this.canMoveDir(forward, this.x, this.y), canL = this.canMoveDir(left, this.x, this.y),
      canR = this.canMoveDir(right, this.x, this.y), canB = this.canMoveDir(backward, this.x, this.y);

    let choices = [];
    if (canF) choices.push(forward);
    if (canL) choices.push(left);
    if (canR) choices.push(right);

    // filter out choices that would lead to dead ends
    choices = this.nonDeadEndDirs(choices, this.x, this.y);
    if (choices.length === 0 && canB) choices.push(backward);

    if (choices.length > 0) {
      this.dir = choices[floor(random(choices.length))];
      this.step(this.dir);
    }
  }

  draw(px, py, cellSize) {
    fill(255, 0, 0);
    rect(px + 2, py + 2, cellSize - 4, cellSize - 4);
  }
}


// --- Visibility / BFS ---
function computeVisibleCells(px, py, radius) {
  let visible = new Set();
  let queue = [[px, py, 0]];
  while(queue.length>0){
    let [x,y,dist] = queue.shift();
    let key = `${x},${y}`;
    if(visible.has(key) || dist > radius) continue;
    visible.add(key);
    let c = maze[y][x];
    if(c.north && y>0) queue.push([x,y-1,dist+1]);
    if(c.south && y<rows-1) queue.push([x,y+1,dist+1]);
    if(c.east  && x<cols-1) queue.push([x+1,y,dist+1]);
    if(c.west  && x>0) queue.push([x-1,y,dist+1]);
  }
  return visible;
}

// BFS used by earlier attempts (kept for backups)
function getReachableFromPlayer(excludeX=null, excludeY=null) {
  const key = (x,y) => `${x},${y}`;
  const q = [], seen = new Set();
  if (player.x < 0 || player.x >= cols || player.y < 0 || player.y >= rows) return seen;
  q.push([player.x, player.y]); seen.add(key(player.x, player.y));
  while(q.length>0){
    const [cx,cy] = q.shift();
    const cell = maze[cy][cx];
    if(cell.north && cy>0 && !(cx===excludeX && cy-1===excludeY)){
      const k = key(cx, cy-1); if(!seen.has(k)){ seen.add(k); q.push([cx, cy-1]); }
    }
    if(cell.south && cy<rows-1 && !(cx===excludeX && cy+1===excludeY)){
      const k = key(cx, cy+1); if(!seen.has(k)){ seen.add(k); q.push([cx, cy+1]); }
    }
    if(cell.east && cx<cols-1 && !(cx+1===excludeX && cy===excludeY)){
      const k = key(cx+1, cy); if(!seen.has(k)){ seen.add(k); q.push([cx+1, cy]); }
    }
    if(cell.west && cx>0 && !(cx-1===excludeX && cy===excludeY)){
      const k = key(cx-1, cy); if(!seen.has(k)){ seen.add(k); q.push([cx-1, cy]); }
    }
  }
  return seen;
}

// --- Union-Find helpers for Kruskal-like rebuild ---
function makeUF(n) {
  let p = new Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  return {
    find(i) { return p[i] === i ? i : (p[i] = this.find(p[i])); },
    union(a,b){ let ra=this.find(a), rb=this.find(b); if(ra===rb) return false; p[ra]=rb; return true; }
  };
}

// Rebuild entire maze while preserving visible/remembered connections
function rebuildMazePreserving(visibleCells) {
  // preserved cell set: visible OR recently remembered (within forgetThreshold)
  let preserved = new Set();
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      let key = `${x},${y}`;
      let last = visited[y][x];
      if (visibleCells.has(key) || (last !== -1 && moveCount - last <= forgetThreshold)) {
        preserved.add(key);
      }
    }
  }

  // Build list of forced edges: any currently open edge where at least one endpoint is preserved.
  // Represent an edge as {ax,ay,bx,by,dirFromA}
  let forced = [];
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      let aId = idFor(x,y);
      let c = maze[y][x];
      // check east
      if (c.east && x+1<cols) {
        let aKey = `${x},${y}`, bKey = `${x+1},${y}`;
        if (preserved.has(aKey) || preserved.has(bKey)) forced.push({ax:x,ay:y,bx:x+1,by:y,dir:'east'});
      }
      // check south
      if (c.south && y+1<rows) {
        let aKey = `${x},${y}`, bKey = `${x},${y+1}`;
        if (preserved.has(aKey) || preserved.has(bKey)) forced.push({ax:x,ay:y,bx:x,by:y+1,dir:'south'});
      }
    }
  }

  // all possible candidate edges (unique, only east and south to avoid duplication)
  let candidates = [];
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      if (x+1 < cols) candidates.push({ax:x,ay:y,bx:x+1,by:y,dir:'east'});
      if (y+1 < rows) candidates.push({ax:x,ay:y,bx:x,by:y+1,dir:'south'});
    }
  }

// shuffle candidate edges
  candidates = shuffle(candidates);

// union-find initialization
  let uf = makeUF(rows * cols);
  let treeEdges = []; // edges that will make the spanning tree

  // First, add forced edges (skip those that would create cycle)
  for (let e of forced) {
    let a = idFor(e.ax, e.ay), b = idFor(e.bx, e.by);
    if (uf.find(a) !== uf.find(b)) {
      uf.union(a, b);
      treeEdges.push(e);
    } // else skip forced edge because it would form a cycle
  }

// Then add random edges until spanning tree complete
  for (let e of candidates) {
    let a = idFor(e.ax, e.ay), b = idFor(e.bx, e.by);
    if (uf.find(a) !== uf.find(b)) {
      uf.union(a, b);
      treeEdges.push(e);
    }
    // stop early if we've connected all nodes
    if (treeEdges.length >= rows * cols - 1) break;
  }

// Reconstruct maze from edges: first close everything, then open edges in treeEdges
  let newMaze = Array(rows).fill().map(() => Array(cols).fill().map(() => ({north:false,south:false,east:false,west:false})));
  for (let e of treeEdges) {
    let ax=e.ax, ay=e.ay, bx=e.bx, by=e.by;
    if (bx === ax + 1 && by === ay) {
      newMaze[ay][ax].east = true;
      newMaze[by][bx].west = true;
    } else if (by === ay + 1 && bx === ax) {
      newMaze[ay][ax].south = true;
      newMaze[by][bx].north = true;
    } else {
      // unexpected orientation (shouldn't happen)
    }
  }

// Replace maze with rebuilt maze
  maze = newMaze;
}

// Track which cells got regenerated this frame (for flash)
let regeneratedThisFrame = new Set();

// When a forgotten cell becomes visible, rebuild the maze preserving seen/remembered connections.
// We mark the triggering cell for a visual flash.
function regenerateForgottenCell(x, y) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return;
  if (visited[y][x] === -1) return; // never visited
  if (moveCount - visited[y][x] <= forgetThreshold) return; // not forgotten

  // compute visible set (we use current visible region from player)
  let visible = computeVisibleCells(player.x, player.y, 5);
  // rebuild entire maze while preserving visible+recently remembered edges
  rebuildMazePreserving(visible);

  // mark this cell as regenerated this frame (so draw flashes it)
  regeneratedThisFrame.add(`${x},${y}`);
  console.log(`Rebuilt maze preserving seen/remembered. Triggering cell: (${x},${y})`);
}

// --- Setup and drawing (integrated with regenerate) ---
function setup() {
  createCanvas(400, 400);
  cellSize = width / cols;
  maze = generateMazeWithHilbert(rows, cols);
  visited = Array(rows).fill().map(() => Array(cols).fill(-1));
  player = new Player(0, 0);
  minotaur = new Minotaur(floor(cols / 2), floor(rows / 2));
  ariadne = new Ariadne(cols - 1, rows - 1);
  visited[player.y][player.x] = 0;
  noLoop();
  redraw();
}

function keyReleased() {
  
  let moved = false;
  if (gameState === "playing") {
    if (key === 'w' || keyCode === UP_ARROW) moved = player.move(0, -1);
    else if (key === 's' || keyCode === DOWN_ARROW) moved = player.move(0, 1);
    else if (key === 'a' || keyCode === LEFT_ARROW) moved = player.move(-1, 0);
    else if (key === 'd' || keyCode === RIGHT_ARROW) moved = player.move(1, 0);
  }
  if (moved) {
    minotaur.update();
    ariadne.moveAI(player.x, player.y);
    redraw();
  }
}

function draw() {
  strokeWeight(2);
  background(0);
  regeneratedThisFrame.clear(); // clear set at start of frame

  let visible = computeVisibleCells(player.x, player.y, 5);
  visible.add(`${player.x},${player.y}`);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let last = visited[y][x];
      let cell = maze[y][x];
      let px = x * cellSize, py = y * cellSize;
      let isRegen = false;

      if (visible.has(`${x},${y}`)) {
        // If forgotten sufficiently, trigger full rebuild preserving seen/remembered
        if (last !== -1 && moveCount - last > forgetThreshold) {
          regenerateForgottenCell(x, y);
          isRegen = true;
        }
        visited[y][x] = moveCount;
        fill(255, 255, 192); // visible = white
      } else if (last !== -1 && moveCount - last <= forgetThreshold) {
        fill(255 - fadeRate * (moveCount - last), 255 - fadeRate * (moveCount - last), 192 - 0.75 * fadeRate * (moveCount - last)); // faded memory
      } else {
        fill(224); // never seen
      }

      noStroke();
      rect(px, py, cellSize, cellSize);

      if (visible.has(`${x},${y}`) || last !== -1) {
        // highlight if this specific cell triggered regeneration this frame
        let regenHighlight = regeneratedThisFrame.has(`${x},${y}`) || isRegen;
        //Below is just a debugging option.
        //stroke(regenHighlight ? color(255, 0, 0) : 0);
        stroke(0, 0, 0);
        if (!cell.north) line(px, py, px + cellSize, py);
        if (!cell.south) line(px, py + cellSize, px + cellSize, py + cellSize);
        if (!cell.west)  line(px, py, px, py + cellSize);
        if (!cell.east)  line(px + cellSize, py, px + cellSize, py + cellSize);
      }
    }
  }

  // gameState changes
  if (player.x === minotaur.x && player.y === minotaur.y) {
    gameState = "lost";
  }
  else if (player.x === ariadne.x && player.y === ariadne.y) {
    gameState = "won";
    noLoop();
  }

  ariadne.draw(ariadne.x * cellSize, ariadne.y * cellSize, cellSize);
  minotaur.draw(minotaur.x * cellSize, minotaur.y * cellSize, cellSize);
  player.draw(player.x * cellSize, player.y * cellSize, cellSize);

  if (gameState === "won") {
    drawWinScreen();
  }
  else if (gameState === "lost") {
    drawLoseScreen();
  }
}
