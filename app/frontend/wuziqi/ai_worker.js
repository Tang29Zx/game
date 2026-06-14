"use strict";

const BOARD_SIZE = 25;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const INF = 1e15;
const WIN = 10000000;

const RANK = {
  FIVE: 700,
  LIVE4: 660,
  DOUBLE4: 640,
  FOUR3: 620,
  DOUBLE3: 560,
  RUSH4: 500,
  LIVE3: 300
};

const PATTERNS = [
  ["11111", "five"],
  ["011110", "live4"],
  ["011112", "rush4"],
  ["211110", "rush4"],
  ["11011", "rush4"],
  ["10111", "rush4"],
  ["11101", "rush4"],
  ["01110", "live3"],
  ["010110", "live3"],
  ["011010", "live3"],
  ["001112", "sleep3"],
  ["211100", "sleep3"],
  ["010112", "sleep3"],
  ["211010", "sleep3"],
  ["011012", "sleep3"],
  ["210110", "sleep3"],
  ["10011", "sleep3"],
  ["11001", "sleep3"],
  ["10101", "sleep3"]
];

const LEVELS = {
  fast: { label: "极速", depth: 2, time: 220, width: 7, reduceAfter: 4 },
  strong: { label: "高手", depth: 3, time: 650, width: 10, reduceAfter: 5 },
  master: { label: "天元", depth: 4, time: 1050, width: 12, reduceAfter: 6 },
  legend: { label: "宗师", depth: 5, time: 1600, width: 14, reduceAfter: 7 }
};

let grid = [];
let history = [];
let aiStats = {};
let boardHash = 0;
let tt = new Map();

function resetBoard(snapshot) {
  grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  history = [];
  boardHash = 0;
  for (const item of snapshot || []) {
    const x = item[0];
    const y = item[1];
    const color = item[2];
    if (x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE && grid[y][x] === EMPTY) {
      grid[y][x] = color;
      history.push([x, y, color]);
      boardHash = (boardHash ^ hashStone(x, y, color)) >>> 0;
    }
  }
}

function hashStone(x, y, color) {
  return (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(color, 83492791)) >>> 0;
}

function other(color) {
  return color === BLACK ? WHITE : BLACK;
}

function isValid(x, y) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE && grid[y][x] === EMPTY;
}

function placeMove(x, y, color) {
  if (!isValid(x, y)) return false;
  grid[y][x] = color;
  history.push([x, y, color]);
  boardHash = (boardHash ^ hashStone(x, y, color)) >>> 0;
  return true;
}

function undoMove() {
  const mv = history.pop();
  if (!mv) return;
  grid[mv[1]][mv[0]] = EMPTY;
  boardHash = (boardHash ^ hashStone(mv[0], mv[1], mv[2])) >>> 0;
}

function checkWin(x, y, color) {
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const count = 1 + countDir(x, y, dx, dy, color) + countDir(x, y, -dx, -dy, color);
    if (count >= 5) return true;
  }
  return false;
}

function countDir(x, y, dx, dy, color) {
  let c = 0;
  let nx = x + dx;
  let ny = y + dy;
  while (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && grid[ny][nx] === color) {
    c += 1;
    nx += dx;
    ny += dy;
  }
  return c;
}

function countLineFast(x, y, dx, dy, color) {
  let count = 1;
  let open = 0;
  let nx = x + dx;
  let ny = y + dy;
  while (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && grid[ny][nx] === color) {
    count += 1;
    nx += dx;
    ny += dy;
  }
  if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && grid[ny][nx] === EMPTY) open += 1;
  nx = x - dx;
  ny = y - dy;
  while (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && grid[ny][nx] === color) {
    count += 1;
    nx -= dx;
    ny -= dy;
  }
  if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE && grid[ny][nx] === EMPTY) open += 1;
  return [Math.min(count, 5), open];
}

function directionHits(x, y, dx, dy, color) {
  const radius = 5;
  const center = radius;
  let line = "";
  for (let step = -radius; step <= radius; step += 1) {
    const nx = x + dx * step;
    const ny = y + dy * step;
    if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) {
      line += "2";
    } else {
      const v = grid[ny][nx];
      line += v === EMPTY ? "0" : v === color ? "1" : "2";
    }
  }
  const hits = { five: 0, live4: 0, rush4: 0, live3: 0, sleep3: 0 };
  for (const [pat, kind] of PATTERNS) {
    const len = pat.length;
    for (let start = 0; start + len <= line.length; start += 1) {
      if (start <= center && center < start + len && line.slice(start, start + len) === pat) {
        hits[kind] = 1;
        break;
      }
    }
    if (hits.five) break;
  }
  return hits;
}

function threatProfile(x, y, color) {
  if (!isValid(x, y)) return { rank: 0, five: 0, live4: 0, rush4: 0, live3: 0, sleep3: 0 };
  grid[y][x] = color;
  let five = 0;
  let live4 = 0;
  let rush4 = 0;
  let live3 = 0;
  let sleep3 = 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const hits = directionHits(x, y, dx, dy, color);
    five += hits.five;
    live4 += hits.live4;
    rush4 += hits.rush4;
    live3 += hits.live3;
    sleep3 += hits.sleep3;
  }
  grid[y][x] = EMPTY;
  let rank = 0;
  if (five) rank = RANK.FIVE;
  else if (live4) rank = RANK.LIVE4;
  else if (rush4 >= 2) rank = RANK.DOUBLE4;
  else if (rush4 >= 1 && live3 >= 1) rank = RANK.FOUR3;
  else if (live3 >= 2) rank = RANK.DOUBLE3;
  else if (rush4 >= 1) rank = RANK.RUSH4;
  else if (live3 >= 1) rank = RANK.LIVE3;
  return { rank, five, live4, rush4, live3, sleep3 };
}

function profileScore(profile) {
  const rank = profile ? profile.rank : 0;
  if (rank >= RANK.FIVE) return WIN;
  if (rank >= RANK.LIVE4) return 1000000;
  if (rank >= RANK.DOUBLE4) return 900000;
  if (rank >= RANK.FOUR3) return 760000;
  if (rank >= RANK.DOUBLE3) return 260000;
  if (rank >= RANK.RUSH4) return 85000;
  if (rank >= RANK.LIVE3) return 18000;
  return 0;
}

function quickScore(x, y, color) {
  if (!isValid(x, y)) return 0;
  grid[y][x] = color;
  let total = 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const [c, o] = countLineFast(x, y, dx, dy, color);
    if (c >= 5) total += 1000000;
    else if (c === 4 && o === 2) total += 120000;
    else if (c === 4 && o === 1) total += 18000;
    else if (c === 3 && o === 2) total += 7000;
    else if (c === 3 && o === 1) total += 900;
    else if (c === 2 && o === 2) total += 260;
    else if (c === 2 && o === 1) total += 70;
  }
  grid[y][x] = EMPTY;
  return total;
}

function neighbors() {
  if (!history.length) return [[Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2)]];
  const set = new Set();
  for (const [x, y] of history) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (isValid(nx, ny)) set.add(nx + "," + ny);
      }
    }
  }
  return Array.from(set, s => s.split(",").map(Number));
}

function moveScore(x, y, color) {
  const opp = other(color);
  const selfProf = threatProfile(x, y, color);
  const oppProf = threatProfile(x, y, opp);
  const center = Math.floor(BOARD_SIZE / 2);
  const centerPull = BOARD_SIZE - Math.abs(x - center) - Math.abs(y - center);
  const last = history[history.length - 1];
  const lastPull = last ? Math.max(0, 10 - Math.abs(x - last[0]) - Math.abs(y - last[1])) : 0;
  return selfProf.rank * 2200000 + oppProf.rank * 2350000 +
    quickScore(x, y, color) * 4.5 + quickScore(x, y, opp) * 3.8 +
    centerPull * 28 + lastPull * 48;
}

function candidates(color, width) {
  const scored = neighbors().map(([x, y]) => [moveScore(x, y, color), x, y])
    .sort((a, b) => b[0] - a[0]);
  const protectedMoves = [];
  const opp = other(color);
  for (const [, x, y] of scored) {
    if (threatProfile(x, y, color).rank >= RANK.LIVE3 || threatProfile(x, y, opp).rank >= RANK.LIVE3) {
      protectedMoves.push([x, y]);
    }
  }
  const out = [];
  const seen = new Set();
  for (const mv of protectedMoves.concat(scored.slice(0, width).map(item => [item[1], item[2]]))) {
    const key = mv[0] + "," + mv[1];
    if (!seen.has(key)) {
      seen.add(key);
      out.push(mv);
    }
    if (out.length >= width + 10) break;
  }
  return out;
}

function immediateWin(color) {
  const all = neighbors().sort((a, b) => quickScore(b[0], b[1], color) - quickScore(a[0], a[1], color));
  for (const [x, y] of all) {
    placeMove(x, y, color);
    const win = checkWin(x, y, color);
    undoMove();
    if (win) return [x, y];
  }
  return null;
}

function bestForcing(color, minRank) {
  let best = null;
  let bestProfile = null;
  let bestScore = -INF;
  const opp = other(color);
  for (const [x, y] of neighbors()) {
    const prof = threatProfile(x, y, color);
    if (prof.rank < minRank) continue;
    const score = prof.rank * 1000000 + quickScore(x, y, color) * 4 + quickScore(x, y, opp) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = [x, y];
      bestProfile = prof;
    }
  }
  return [best, bestProfile];
}

function candidateSafety(move, color) {
  const opp = other(color);
  placeMove(move[0], move[1], color);
  let penalty = 0;
  if (immediateWin(opp)) penalty += WIN * 1.2;
  const [, oppForce] = bestForcing(opp, RANK.FOUR3);
  const [, oppPressure] = bestForcing(opp, RANK.DOUBLE3);
  penalty += profileScore(oppForce) * 1.25;
  penalty += profileScore(oppPressure) * 0.9;
  undoMove();
  return penalty;
}

function evaluate(color) {
  const opp = other(color);
  let self = 0;
  let enemy = 0;
  for (const [x, y] of neighbors()) {
    const selfProf = threatProfile(x, y, color);
    const enemyProf = threatProfile(x, y, opp);
    self += profileScore(selfProf) * 0.56 + quickScore(x, y, color) * 1.45;
    enemy += profileScore(enemyProf) * 0.82 + quickScore(x, y, opp) * 2.05;
    if (enemyProf.rank >= RANK.FOUR3) enemy += 520000;
    if (selfProf.rank >= RANK.FOUR3) self += 360000;
  }
  return self - enemy;
}

function terminalScore(colorToMove) {
  const last = history[history.length - 1];
  if (!last) return null;
  if (!checkWin(last[0], last[1], last[2])) return null;
  return last[2] === colorToMove ? WIN : -WIN;
}

function negamax(depth, alpha, beta, color, deadline, width, reduceAfter) {
  aiStats.nodes += 1;
  if ((aiStats.nodes & 127) === 0 && performance.now() > deadline) throw new Error("timeout");
  const term = terminalScore(color);
  if (term !== null) return term;
  if (depth <= 0) return evaluate(color);
  const key = color + ":" + depth + ":" + boardHash;
  const cached = tt.get(key);
  if (cached !== undefined) {
    aiStats.cacheHits += 1;
    return cached;
  }

  const win = immediateWin(color);
  if (win) return WIN - (10 - depth);

  const moves = candidates(color, Math.max(6, width - (depth >= 3 ? 3 : 0)));
  let best = -INF;
  const opp = other(color);
  let searched = 0;
  let cut = false;
  for (const mv of moves) {
    const rank = Math.max(threatProfile(mv[0], mv[1], color).rank, threatProfile(mv[0], mv[1], opp).rank);
    const reduction = searched >= reduceAfter && depth >= 3 && rank < RANK.LIVE3 ? 1 : 0;
    placeMove(mv[0], mv[1], color);
    const val = -negamax(depth - 1 - reduction, -beta, -alpha, opp, deadline, width, reduceAfter);
    undoMove();
    searched += 1;
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      cut = true;
      break;
    }
  }
  if (!cut) {
    if (tt.size > 30000) tt.clear();
    tt.set(key, best);
  }
  return best;
}

function openingMove(color) {
  if (history.length !== 1) return null;
  const [x, y] = history[0];
  const offsets = [[1, 1], [1, 0], [0, 1], [-1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [2, 0], [0, 2]];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (isValid(nx, ny)) return [nx, ny];
  }
  return null;
}

function localAiMove(color, difficulty) {
  const level = LEVELS[difficulty] || LEVELS.strong;
  const start = performance.now();
  const deadline = start + level.time;
  tt = new Map();
  aiStats = { nodes: 0, cacheHits: 0, depth: 0, gate: "", elapsed: 0, source: "worker", difficulty: level.label };
  const opp = other(color);

  if (!history.length) return [Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2)];

  const win = immediateWin(color);
  if (win) {
    aiStats.gate = "win";
    aiStats.elapsed = performance.now() - start;
    return win;
  }
  const block = immediateWin(opp);
  if (block) {
    aiStats.gate = "block";
    aiStats.elapsed = performance.now() - start;
    return block;
  }

  const book = openingMove(color);
  if (book) {
    aiStats.gate = "book";
    aiStats.elapsed = performance.now() - start;
    return book;
  }

  const [ownForce, ownForceProfile] = bestForcing(color, RANK.FOUR3);
  const [oppForce, oppForceProfile] = bestForcing(opp, RANK.FOUR3);
  if (ownForce && (!oppForceProfile || ownForceProfile.rank >= oppForceProfile.rank || ownForceProfile.rank >= RANK.LIVE4)) {
    aiStats.gate = "force";
    aiStats.elapsed = performance.now() - start;
    return ownForce;
  }
  if (oppForce) {
    aiStats.gate = "defense";
    aiStats.elapsed = performance.now() - start;
    return oppForce;
  }
  if (ownForce) {
    aiStats.gate = "force";
    aiStats.elapsed = performance.now() - start;
    return ownForce;
  }

  const [ownPressure] = bestForcing(color, RANK.DOUBLE3);
  const [oppPressure] = bestForcing(opp, RANK.DOUBLE3);
  if (ownPressure && !oppPressure) {
    aiStats.gate = "pressure";
    aiStats.elapsed = performance.now() - start;
    return ownPressure;
  }
  if (oppPressure) {
    aiStats.gate = "anti-pressure";
    aiStats.elapsed = performance.now() - start;
    return oppPressure;
  }

  let bestMove = candidates(color, level.width)[0];
  let bestScore = -INF;
  for (let depth = 1; depth <= level.depth; depth += 1) {
    try {
      const moves = candidates(color, level.width + (depth >= 4 ? 1 : 0));
      let depthBest = bestMove;
      let depthScore = -INF;
      let alpha = -INF;
      const beta = INF;
      for (const mv of moves) {
        placeMove(mv[0], mv[1], color);
        const score = -negamax(depth - 1, -beta, -alpha, opp, deadline, level.width, level.reduceAfter);
        undoMove();
        const safety = candidateSafety(mv, color);
        const finalScore = score - safety * (difficulty === "legend" ? 1.1 : 0.9);
        if (finalScore > depthScore) {
          depthScore = finalScore;
          depthBest = mv;
        }
        alpha = Math.max(alpha, score);
        if (performance.now() > deadline) throw new Error("timeout");
      }
      bestMove = depthBest;
      bestScore = depthScore;
      aiStats.depth = depth;
    } catch (err) {
      aiStats.gate = aiStats.gate || "timeout";
      break;
    }
  }

  const safety = bestMove ? candidateSafety(bestMove, color) : 0;
  if (safety >= 85000) {
    const safe = candidates(color, level.width + 6)
      .map(mv => [candidateSafety(mv, color), -moveScore(mv[0], mv[1], color), mv])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    if (safe && safe[2]) {
      bestMove = safe[2];
      aiStats.gate = "safe";
    }
  }
  aiStats.elapsed = performance.now() - start;
  aiStats.score = Math.round(bestScore);
  return bestMove;
}

function coordName(x, y) {
  let n = x;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label + String(y + 1);
}

function formatNodes(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n ? String(n) : "--";
}

function gateInfo(gate) {
  const table = {
    win: ["一手制胜", "AI 发现自己可以立即连五，因此跳过深层搜索直接落子。", "终局检测"],
    block: ["必须防守", "对手存在下一手连五威胁，本步优先封堵胜点。", "必防优先"],
    book: ["开局定式", "AI 使用轻量开局库，先占据贴近首手的高弹性位置。", "开局知识"],
    force: ["强制进攻", "AI 找到四三或更强的进攻点，迫使对手进入防守。", "威胁搜索"],
    defense: ["防守强制线", "对手存在强迫性组合威胁，AI 先化解危险。", "威胁搜索"],
    pressure: ["双三压力", "当前局面适合制造双三压力，扩大后续候选优势。", "组合棋型"],
    "anti-pressure": ["解除双三", "对手可形成双三，AI 选择先消除该战术点。", "组合棋型"],
    safe: ["安全修正", "初选落点会给对手较强反击，AI 改选更稳的候选点。", "安全过滤"],
    timeout: ["限时决策", "AI 在移动端时间预算内返回当前最优结果，保证界面流畅。", "迭代加深"],
    fallback: ["本地兜底", "后台 Worker 不可用时，使用轻量策略保证可玩。", "降级策略"]
  };
  return table[gate || ""] || ["Alpha-Beta 搜索", "AI 根据候选点排序、局面评估和剪枝结果选择本手。", "Minimax / Alpha-Beta"];
}

function makeExplain(move, color, difficulty) {
  const info = gateInfo(aiStats && aiStats.gate);
  const moveText = move ? coordName(move[0], move[1]) : "--";
  const level = LEVELS[difficulty] || LEVELS.strong;
  const topMoves = [];
  try {
    for (const [index, mv] of candidates(color, Math.min(level.width, 5)).slice(0, 3).entries()) {
      topMoves.push({
        move: coordName(mv[0], mv[1]),
        score: index === 0 ? "主线" : "备选"
      });
    }
  } catch (err) {}
  return {
    title: info[0] + " · " + moveText,
    reason: info[1] + " " + level.label + "模式搜索深度 D" + (aiStats.depth || 0) + "，节点 " + formatNodes(aiStats.nodes) + "。",
    knowledgePoint: info[2],
    topMoves
  };
}

self.addEventListener("message", event => {
  const { id, snapshot, color, difficulty } = event.data || {};
  try {
    resetBoard(snapshot);
    const aiColor = color || WHITE;
    const level = difficulty || "strong";
    const move = localAiMove(aiColor, level);
    const explain = makeExplain(move, aiColor, level);
    self.postMessage({ id, ok: true, move, stats: aiStats, explain });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err && err.message ? err.message : String(err),
      move: null,
      stats: aiStats,
      explain: null
    });
  }
});
