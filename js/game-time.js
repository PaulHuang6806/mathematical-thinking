/* ============================================
   Mathematical Thinking · 时间与空间馆（幼儿学习科学版）
   依据《幼小衔接数学游戏盒》12 张咖啡色牌设计（见 docs/数学游戏盒数字化设计方案.md）：
   整点时钟 / 一年四季 / 空间方位（上下前后左右）/ 星期与日期 / 比远近 /
   几排几号（行列坐标）/ 有几个正方体（立体计数）/ 一年十二个月

   设计原则：
   - 由易到难三级：L1 具体直观（整点 1-6、四季、方位）→ L2 半抽象（整点 7-12、星期）→ L3 推理（坐标、立体计数、月份）
   - 具体形象：钟面/场景/积木全部图形化呈现
   - 答错不批评：鼓励 → 提示 → 温柔揭晓（脚手架阶梯）
   - 金星（一次答对）/ 银星（重试答对）双轨奖励
   - 难度自适应（最近发展区）+ 语音播报（可一键静音）+ 学习记录本地保存
   纯函数部分可被 Node 单测复用。
   ============================================ */
(function (global) {
  'use strict';

  // ================= 工具 =================
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  const TOTAL_ROUNDS = 10;

  // ================= 表扬与鼓励语库（与其余模块一致，语音已预合成） =================
  const PHRASES = {
    firstTry: [
      '太棒啦，一次就答对！',
      '你真认真！',
      '我看到了你的努力！',
      '好厉害，继续加油！',
      '你越来越棒啦！',
      '小手一点就对啦！',
      '猫头鹰都看呆啦！',
      '眼睛真尖！',
    ],
    retry: [
      '答对啦！再试一次就成功啦！',
      '坚持就是胜利！',
      '你看，多试就能做到！',
      '进步啦！',
    ],
    encourage: [
      '没关系，再想想嘛',
      '别急，慢慢来',
      '再仔细看看哦',
      '你可以的，再试试',
    ],
    streak: [
      '哇哇哇！连对啦，太厉害啦！',
      '猫头鹰飞过来给你鼓掌！',
      '太棒啦！我们继续！',
      '你好厉害，像小超人一样！',
      '哇！我都想跟你学啦！',
      '连对啦连对啦！继续冲！',
      '哗——！又答对啦！',
    ],
    huge: [
      '哇——！太厉害啦！星星都飞起来啦！',
      '你是今天的数学小冠军！',
      '猫头鹰都转圈圈啦！太棒啦！',
      '哇！我已经跟不上你啦！',
    ],
  };

  function pickPhrase(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  // 从候选里取 n 个不同干扰项（剔除答案）
  function pickDistractors(answer, pool, n) {
    const cands = pool.filter((x) => x !== answer);
    return shuffle(cands).slice(0, n);
  }

  // ================= 时钟（整点 1-12） =================
  // L1: 1-6 点；L2: 7-12 点；L3: 混合
  function clockQuestion(round, level) {
    const lv = level || 0;
    const hour = lv === 0 ? randInt(1, 6) : lv === 1 ? randInt(7, 12) : randInt(1, 12);
    const pool = [];
    for (let h = 1; h <= 12; h++) pool.push(h);
    const options = shuffle([hour].concat(pickDistractors(hour, pool, 3)));
    return {
      kind: 'clock',
      hour: hour,
      answer: hour,
      options: options,
      answerIndex: options.indexOf(hour),
      prompt: '小钟表，几点了？',
      hint1: '看看时针指到几，就是几点',
      hint2: '短针是时针，它指着几就是几点',
      reveal: '是 ' + hour + ' 点，我们一起记住它',
      revealVoice: '是 ' + hour + ' 点，我们一起记住它',
    };
  }

  // ================= 四季 =================
  const SEASONS = [
    { id: 'spring', name: '春天', scene: '🌸🌷🐝', hint: '花儿都开啦，天气暖和和的' },
    { id: 'summer', name: '夏天', scene: '🌞🍉🕶️', hint: '太阳火辣辣，可以吃西瓜' },
    { id: 'autumn', name: '秋天', scene: '🍁🌰🥮', hint: '树叶黄了，果子熟啦' },
    { id: 'winter', name: '冬天', scene: '⛄🧣❄️', hint: '好冷呀，会下雪' },
  ];

  function seasonQuestion() {
    const target = SEASONS[randInt(0, 3)];
    const options = shuffle(SEASONS.slice().map((s) => s.name));
    return {
      kind: 'season',
      season: target,
      answer: target.name,
      options: options,
      answerIndex: options.indexOf(target.name),
      prompt: '这是哪个季节？',
      hint1: target.hint,
      hint2: '看看图片里的东西，是哪个季节才有的',
      reveal: '是' + target.name + '，我们一起记住它',
      revealVoice: '是' + target.name + '，我们一起记住它',
    };
  }

  // ================= 空间方位（上下前后 / 左右） =================
  // L1: 树 + 动物（上/下/前/后）；L2: 女孩 + 动物（左/右）
  const PLACE_POS = [
    { pos: '上面', emoji: '🐦', q: '小鸟在树的哪里？', treePos: 'top' },
    { pos: '下面', emoji: '🐢', q: '小乌龟在树的哪里？', treePos: 'bottom' },
    { pos: '前面', emoji: '🐰', q: '小兔在树的哪里？', treePos: 'front' },
    { pos: '后面', emoji: '🦊', q: '小狐狸在树的哪里？', treePos: 'back' },
  ];
  const PLACE_LR = [
    { pos: '左边', emoji: '🐶', q: '小狗在女孩的哪边？', lr: 'left' },
    { pos: '右边', emoji: '🐱', q: '小猫在女孩的哪边？', lr: 'right' },
  ];

  function placeQuestion(round, level) {
    const lv = level || 0;
    if (lv >= 1 && Math.random() < 0.5) {
      const t = PLACE_LR[randInt(0, 1)];
      const pool = PLACE_LR.map((x) => x.pos);
      const options = shuffle(pool);
      return {
        kind: 'place',
        scene: 'girl',
        lr: t.lr,
        item: t.emoji,
        answer: t.pos,
        options: options,
        answerIndex: options.indexOf(t.pos),
        prompt: t.q,
        hint1: '伸出右手比一比，哪边是右边',
        hint2: '女孩的左手边是哪边？想一想',
        reveal: '对啦，它在女孩的' + t.pos + '！',
        revealVoice: '真棒，方向找对啦！',
      };
    }
    const t = PLACE_POS[randInt(0, 3)];
    const pool = PLACE_POS.map((x) => x.pos);
    const options = shuffle(pool);
    return {
      kind: 'place',
      scene: 'tree',
      treePos: t.treePos,
      item: t.emoji,
      answer: t.pos,
      options: options,
      answerIndex: options.indexOf(t.pos),
      prompt: t.q,
      hint1: '想一想，它在大树的哪个方向',
      hint2: '看看它和大树的位置',
      reveal: '对啦，它在大树的' + t.pos + '！',
      revealVoice: '真棒，方向找对啦！',
    };
  }

  // ================= 星期（昨天/明天/一周 7 天） =================
  const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  function weekQuestion(round, level) {
    const lv = level || 0;
    const today = randInt(0, 6);
    const offset = lv === 0 ? (Math.random() < 0.5 ? 1 : -1)
      : [1, -1, 2, -2][randInt(0, 3)];
    const ansIdx = ((today + offset) % 7 + 7) % 7;
    const qText = offset === 1 ? '明天是星期几？' : offset === -1 ? '昨天是星期几？'
      : offset === 2 ? '后天是星期几？' : '前天是星期几？';
    const options = shuffle(WEEKDAYS.slice());
    return {
      kind: 'week',
      today: WEEKDAYS[today],
      offset: offset,
      answer: WEEKDAYS[ansIdx],
      options: options,
      answerIndex: options.indexOf(WEEKDAYS[ansIdx]),
      prompt: '今天是' + WEEKDAYS[today] + '，' + qText,
      hint1: '想一想，今天后面是星期几',
      hint2: '星期一到星期天，按顺序数一数',
      reveal: '是' + WEEKDAYS[ansIdx] + '，我们一起记住它',
      revealVoice: '是' + WEEKDAYS[ansIdx] + '，我们一起记住它',
    };
  }

  // ================= 比远近 =================
  const DIST_ANIMALS = [
    { name: '小熊', emoji: '🐻' }, { name: '小兔', emoji: '🐰' }, { name: '小鸡', emoji: '🐔' },
    { name: '小猫', emoji: '🐱' }, { name: '小狗', emoji: '🐶' }, { name: '小鸭', emoji: '🦆' },
    { name: '乌龟', emoji: '🐢' }, { name: '蜗牛', emoji: '🐌' },
  ];

  function distQuestion() {
    const picked = shuffle(DIST_ANIMALS.slice()).slice(0, 3);
    const nearest = picked[0], farthest = picked[2];
    const askFar = Math.random() < 0.5;
    const target = askFar ? farthest : nearest;
    const options = shuffle(picked.map((a) => a.name));
    return {
      kind: 'dist',
      animals: picked,
      target: askFar ? 'farthest' : 'nearest',
      answer: target.name,
      options: options,
      answerIndex: options.indexOf(target.name),
      prompt: askFar ? '谁离房子最远？' : '谁离房子最近？',
      hint1: askFar ? '看看谁离房子最远' : '看看谁离房子最近',
      hint2: '从房子往外数一数，第一个是谁',
      reveal: askFar ? '它离房子最远，真棒！' : '它离房子最近，真棒！',
      revealVoice: '真棒！',
    };
  }

  // ================= 几排几号（行列坐标） =================
  const GRID_EMOJIS = ['🍎', '🍌', '⭐', '🌈', '🍓', '🐰', '🌸', '🚗', '🍇', '⚽', '🦋', '🎈'];
  const GRID_ROWS = 4, GRID_COLS = 3;

  function gridQuestion() {
    const grid = shuffle(GRID_EMOJIS.slice());
    const askCell = Math.random() < 0.6;
    const tIdx = randInt(0, GRID_ROWS * GRID_COLS - 1);
    const row = Math.floor(tIdx / GRID_COLS) + 1;
    const col = (tIdx % GRID_COLS) + 1;
    const targetEmoji = grid[tIdx];
    if (askCell) {
      const pool = GRID_EMOJIS.slice();
      const options = shuffle([targetEmoji].concat(pickDistractors(targetEmoji, pool, 3)));
      return {
        kind: 'grid',
        grid: grid,
        askCell: true,
        qRow: row, qCol: col,
        answer: targetEmoji,
        options: options,
        answerIndex: options.indexOf(targetEmoji),
        prompt: '第' + row + '排第' + col + '个是什么？',
        hint1: '横着数是排，竖着数是号',
        hint2: '先找到第' + row + '排，再看第' + col + '个',
        reveal: '找对啦，眼睛真尖！',
        revealVoice: '眼睛真尖！',
      };
    }
    const coord = '第' + row + '排第' + col + '号';
    const coords = [];
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) coords.push('第' + r + '排第' + c + '号');
    }
    const options = shuffle([coord].concat(pickDistractors(coord, coords, 3)));
    return {
      kind: 'grid',
      grid: grid,
      askCell: false,
      qRow: row, qCol: col,
      targetEmoji: targetEmoji,
      answer: coord,
      options: options,
      answerIndex: options.indexOf(coord),
      prompt: targetEmoji + ' 在第几排第几号？',
      hint1: '横着数是排，竖着数是号',
      hint2: '从上往下数第几排，从左往右数第几号',
      reveal: '找对啦，眼睛真尖！',
      revealVoice: '眼睛真尖！',
    };
  }

  // ================= 有几个正方体（分层堆叠计数） =================
  function blocksQuestion() {
    const layers = randInt(1, 3);
    const counts = [];
    let total = 0;
    for (let i = 0; i < layers; i++) {
      const remain = 10 - total;
      if (remain <= 0) break; // 总数已满，不再加层
      const upper = Math.min(6 - i, i > 0 ? counts[i - 1] : 6, remain);
      if (upper < 1) break;
      const lower = i === 0 ? 2 : 1;
      const c = randInt(lower, Math.max(lower, upper));
      counts.push(c);
      total += c;
    }
    if (total < 3 && counts.length) { counts[0] += (3 - total); total = 3; }
    const pool = [];
    for (let n = 1; n <= 10; n++) pool.push(n);
    const options = shuffle([total].concat(pickDistractors(total, pool, 3)));
    return {
      kind: 'blocks',
      layers: counts.slice(),
      total: total,
      answer: total,
      options: options,
      answerIndex: options.indexOf(total),
      prompt: '一共有几个正方体？',
      hint1: '一层一层数，别忘了上面的',
      hint2: '先数最下面一层，再往上数',
      reveal: '是 ' + total + ' 个，我们一起记住它',
      revealVoice: '是 ' + total + ' 个，我们一起记住它',
    };
  }

  // ================= 一年十二个月 =================
  const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const FESTS = [
    { month: '一月', text: '新年元旦是几月？' },
    { month: '二月', text: '春节一般在几月？' },
    { month: '三月', text: '三八妇女节是几月？' },
    { month: '六月', text: '六一儿童节是几月？' },
    { month: '九月', text: '九月开学啦，是几月？' },
    { month: '十月', text: '国庆节是几月？' },
  ];

  function monthQuestion(round, level) {
    const lv = level || 0;
    const askFest = lv >= 1 && Math.random() < 0.5;
    if (askFest) {
      const f = FESTS[randInt(0, FESTS.length - 1)];
      const options = shuffle(MONTHS.slice());
      return {
        kind: 'month',
        qtype: 'fest',
        answer: f.month,
        options: options,
        answerIndex: options.indexOf(f.month),
        prompt: f.text,
        hint1: '想一想，这个节日在几月',
        hint2: '想想这个节日的天气怎么样',
        reveal: '是' + f.month + '，我们一起记住它',
        revealVoice: '是' + f.month + '，我们一起记住它',
      };
    }
    const idx = randInt(0, 11);
    const forward = Math.random() < 0.6;
    const ansIdx = ((idx + (forward ? 1 : -1)) % 12 + 12) % 12;
    const options = shuffle(MONTHS.slice());
    return {
      kind: 'month',
      qtype: 'seq',
      qMonth: MONTHS[idx],
      answer: MONTHS[ansIdx],
      options: options,
      answerIndex: options.indexOf(MONTHS[ansIdx]),
      prompt: MONTHS[idx] + (forward ? '后面' : '前面') + '是几月？',
      hint1: '按顺序数一数月份',
      hint2: '一月二月三月…接着往下数',
      reveal: '是' + MONTHS[ansIdx] + '，我们一起记住它',
      revealVoice: '是' + MONTHS[ansIdx] + '，我们一起记住它',
    };
  }

  // ================= 自适应难度 =================
  function adjustLevel(results) {
    if (results.length < 5) return 0;
    const win = results.slice(-5);
    const ok = win.filter(Boolean).length;
    if (ok === 5) return 1;
    if (ok <= 2) return -1;
    return 0;
  }

  // 本局小结（供学习报告）
  function buildSummary(st) {
    return { gold: st.gold, silver: st.silver, helped: st.helped, level: st.level };
  }

  // ================= 单测导出（浏览器中无副作用） =================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      clockQuestion: clockQuestion,
      seasonQuestion: seasonQuestion,
      placeQuestion: placeQuestion,
      weekQuestion: weekQuestion,
      distQuestion: distQuestion,
      gridQuestion: gridQuestion,
      blocksQuestion: blocksQuestion,
      monthQuestion: monthQuestion,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      SEASONS: SEASONS,
      WEEKDAYS: WEEKDAYS,
      MONTHS: MONTHS,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ================= 语音播报（优先 base64 可爱语音包，缺失回退 Web Speech） =================
  const voice = global.__mtVoice;

  function speak(text, rate) {
    if (voice) voice.play(text, rate);
  }

  function stopSpeak() {
    if (voice) voice.stop();
  }

  // ================= 音效（WebAudio 合成） =================
  let audioCtx = null;

  function tone(freq, start, dur) {
    try {
      if (!audioCtx) {
        audioCtx = new (global.AudioContext || global.webkitAudioContext)();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = audioCtx.currentTime + start;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) { /* 音效失败不影响游戏 */ }
  }

  function soundCorrect() { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.18); tone(1046, 0.3, 0.28); }
  function soundWrong() { tone(220, 0, 0.25); }

  // ================= 渲染辅助（SVG 钟面 / 积木堆叠） =================
  function clockSvg(hour) {
    const a = (hour % 12) * 30 - 90;
    const hrX = 70 + 32 * Math.cos((a * Math.PI) / 180);
    const hrY = 70 + 32 * Math.sin((a * Math.PI) / 180);
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const ang = (i * 30 * Math.PI) / 180;
      const x1 = 70 + 52 * Math.cos(ang), y1 = 70 + 52 * Math.sin(ang);
      const x2 = 70 + 58 * Math.cos(ang), y2 = 70 + 58 * Math.sin(ang);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#555" stroke-width="2"/>`;
    }
    return `<svg class="ts-clock" viewBox="0 0 140 140" width="150" height="150" aria-hidden="true">
      <circle cx="70" cy="70" r="62" fill="#fffdf5" stroke="#c98a3b" stroke-width="5"/>
      ${ticks}
      <line x1="70" y1="70" x2="${hrX.toFixed(1)}" y2="${hrY.toFixed(1)}" stroke="#333" stroke-width="7" stroke-linecap="round"/>
      <line x1="70" y1="70" x2="70" y2="24" stroke="#e5484d" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="70" cy="70" r="5" fill="#333"/>
    </svg>`;
  }

  function blocksHtml(layers) {
    const frags = [];
    for (let i = layers.length - 1; i >= 0; i--) {
      frags.push(`<div class="ts-block-layer">` +
        new Array(layers[i]).fill('<span class="ts-block">📦</span>').join('') +
        `</div>`);
    }
    return `<div class="ts-blocks">${frags.join('')}</div>`;
  }

  // ================= 游戏状态与 UI（仅浏览器环境） =================
  if (typeof document === 'undefined') return;

  const state = {
    mode: null,
    round: 0,
    gold: 0,
    silver: 0,
    helped: 0,
    attempts: 0,
    level: 0,
    locked: false,
    question: null,
    results: [],
    streak: 0,
    startTs: 0,
  };

  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    game: $('screen-game'),
    end: $('screen-end'),
  };

  const MODE_NAMES = {
    clock: '整点时钟', season: '一年四季', place: '上下左右',
    week: '星期朋友', dist: '比远近', grid: '几排几号', blocks: '积木几块', month: '月份朋友',
  };

  // ================= 渲染 =================
  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
      screens[k].style.display = k === name ? 'block' : 'none';
    });
  }

  function renderQuestion() {
    const q = state.question;
    const elArea = $('question-area');
    $('q-prompt').textContent = q.prompt;
    $('hint').textContent = '';
    $('hint').className = 'hint';
    state.attempts = 0;

    if (q.kind === 'clock') {
      elArea.innerHTML = clockSvg(q.hour);
      $('options').innerHTML = q.options
        .map((h) => `<button class="opt-btn ts-opt" data-val="${h}">${h}点</button>`)
        .join('');
    } else if (q.kind === 'season') {
      elArea.innerHTML = `<div class="ts-season-scene">${Array.from(q.season.scene).map((c) => `<span class="ts-season-emoji">${c}</span>`).join('')}</div>`;
      $('options').innerHTML = q.options
        .map((s) => `<button class="opt-btn ts-opt" data-val="${s}">${s}</button>`)
        .join('');
    } else if (q.kind === 'place') {
      const item = `<span class="ts-place-item">${q.item}</span>`;
      if (q.scene === 'tree') {
        const posHtml = {
          top: '<div class="ts-tree-top">' + item + '</div><div class="ts-tree-mid"><span class="ts-tree">🌳</span></div>',
          bottom: '<div class="ts-tree-mid"><span class="ts-tree">🌳</span></div><div class="ts-tree-bottom">' + item + '</div>',
          front: '<div class="ts-tree-mid"><span class="ts-tree">🌳</span>' + item + '</div>',
          back: '<div class="ts-tree-mid">' + item + '<span class="ts-tree">🌳</span></div>',
        };
        elArea.innerHTML = `<div class="ts-scene">${posHtml[q.treePos]}</div>`;
      } else {
        const order = q.lr === 'left'
          ? item + '<span class="ts-girl">👧</span>'
          : '<span class="ts-girl">👧</span>' + item;
        elArea.innerHTML = `<div class="ts-scene ts-scene-lr"><span class="ts-lr-label">左</span>${order}<span class="ts-lr-label">右</span></div>`;
      }
      $('options').innerHTML = q.options
        .map((p) => `<button class="opt-btn ts-opt" data-val="${p}">${p}</button>`)
        .join('');
    } else if (q.kind === 'week') {
      elArea.innerHTML = `<div class="ts-week-row">${WEEKDAYS.map((d, i) =>
        `<span class="ts-week-cell${d === q.today ? ' ts-week-today' : ''}">${i + 1}<br>${d}</span>`).join('')}</div>`;
      $('options').innerHTML = q.options
        .map((d) => `<button class="opt-btn ts-opt" data-val="${d}">${d}</button>`)
        .join('');
    } else if (q.kind === 'dist') {
      const animals = q.animals.map((a, i) =>
        `<div class="ts-dist-animal ts-dist-pos-${i}"><span class="ts-dist-emoji">${a.emoji}</span><span class="ts-dist-name">${a.name}</span></div>`).join('');
      elArea.innerHTML = `<div class="ts-dist"><div class="ts-house">🏠</div>${animals}</div>`;
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn ts-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'grid') {
      let cells = '';
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const i = r * GRID_COLS + c;
          cells += `<span class="ts-grid-cell">${q.grid[i]}</span>`;
        }
      }
      const rowLabels = [];
      for (let r = 1; r <= GRID_ROWS; r++) rowLabels.push(`<span class="ts-grid-rowlabel">第${r}排</span>`);
      elArea.innerHTML = `<div class="ts-grid-wrap"><div class="ts-grid-rows">${rowLabels.join('')}</div><div class="ts-grid">${cells}</div></div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn ts-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'blocks') {
      elArea.innerHTML = blocksHtml(q.layers);
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn ts-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'month') {
      elArea.innerHTML = `<div class="ts-month-ring">${MONTHS.map((m) => `<span class="ts-month-cell">${m}</span>`).join('')}</div>`;
      $('options').innerHTML = q.options
        .map((m) => `<button class="opt-btn ts-opt" data-val="${m}">${m}</button>`)
        .join('');
    }

    $('round-info').textContent = '第 ' + state.round + ' / ' + TOTAL_ROUNDS + ' 题';
    $('score-info').textContent = '⭐ ' + state.gold;
    $('progress-fill').style.width = ((state.round - 1) / TOTAL_ROUNDS) * 100 + '%';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';

    speak(q.prompt);
  }

  function showFeedback(correct, detail) {
    const fb = $('feedback');
    if (correct) {
      fb.textContent = '✅ ' + detail;
      fb.className = 'feedback fb-ok';
      $('score-info').textContent = '⭐ ' + state.gold;
    } else {
      fb.textContent = '❌ ' + detail;
      fb.className = 'feedback fb-err';
      const area = $('question-area');
      area.classList.add('shake');
      setTimeout(() => area.classList.remove('shake'), 400);
    }
  }

  function showHint(text) {
    const h = $('hint');
    h.textContent = text;
    h.className = 'hint hint-on';
  }

  // ================= 流程（与其余模块一致） =================
  function startMode(mode) {
    stopSpeak();
    state.mode = mode;
    state.round = 1;
    state.gold = 0;
    state.silver = 0;
    state.helped = 0;
    state.level = 0;
    state.locked = false;
    state.results = [];
    state.streak = 0;
    state.startTs = Date.now();
    $('mode-title').textContent = MODE_NAMES[mode] || mode;
    if (global.__mtOwl) {
      global.__mtOwl.flyIn('wave');
      global.__mtOwl.say('开始啦，我们一起玩吧！', 1600);
    }
    nextQuestion();
    showScreen('game');
  }

  function nextQuestion() {
    switch (state.mode) {
      case 'clock': state.question = clockQuestion(state.round, state.level); break;
      case 'season': state.question = seasonQuestion(); break;
      case 'place': state.question = placeQuestion(state.round, state.level); break;
      case 'week': state.question = weekQuestion(state.round, state.level); break;
      case 'dist': state.question = distQuestion(); break;
      case 'grid': state.question = gridQuestion(); break;
      case 'blocks': state.question = blocksQuestion(); break;
      default: state.question = monthQuestion(state.round, state.level);
    }
    if (global.__mtOwl) global.__mtOwl.flyIn('idle');
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    const q = state.question;
    const correct = String(payload.val) === String(q.answer);
    if (correct) resolveCorrect(); else resolveWrong();
  }

  function resolveCorrect() {
    state.locked = true;
    stopSpeak();
    const firstTry = state.attempts === 0;
    if (firstTry) { state.gold++; state.streak++; } else { state.silver++; state.streak = 0; }
    state.results.push(firstTry);
    const phrase = !firstTry ? pickPhrase(PHRASES.retry)
      : state.streak >= 5 ? pickPhrase(PHRASES.huge)
      : state.streak >= 3 ? pickPhrase(PHRASES.streak)
      : pickPhrase(PHRASES.firstTry);
    showFeedback(true, phrase);
    speak(phrase);
    soundCorrect();
    let celebrate = false;
    if (global.__mtOwl) {
      if (state.streak >= 5) { global.__mtOwl.flyIn('huge'); celebrate = true; }
      else if (state.streak >= 3) { global.__mtOwl.flyIn('big'); celebrate = true; }
      else if (state.gold >= 3 && state.gold % 3 === 0) global.__mtOwl.flyIn('cheer');
    }
    setTimeout(advance, celebrate ? 2200 : 1100);
  }

  function resolveWrong() {
    state.locked = true;
    stopSpeak();
    state.attempts++;
    state.streak = 0;
    const q = state.question;
    showFeedback(false, pickPhrase(PHRASES.encourage));
    soundWrong();

    if (state.attempts === 1) {
      if (global.__mtOwl && Math.random() < 0.4) global.__mtOwl.flyIn('encourage');
      showHint('提示：' + q.hint1);
      speak(q.hint1);
      setTimeout(() => { state.locked = false; }, 1300);
    } else if (state.attempts === 2) {
      showHint('再想想：' + q.hint2);
      speak(q.hint2);
      setTimeout(() => { state.locked = false; }, 1600);
    } else {
      state.helped++;
      state.results.push(false);
      const revealText = q.reveal;
      showFeedback(false, revealText);
      speak(q.revealVoice || revealText);
      setTimeout(advance, 1600);
    }
  }

  function advance() {
    state.locked = false;
    state.round++;
    if (state.results.length >= 5) {
      state.level = clamp(state.level + adjustLevel(state.results), 0, 2);
    }
    if (state.round > TOTAL_ROUNDS) {
      renderEnd();
    } else {
      nextQuestion();
    }
  }

  // ================= 结算 =================
  function renderEnd() {
    stopSpeak();
    const goldHtml = '⭐'.repeat(state.gold);
    const silverHtml = `<span class="star-silver">${'⭐'.repeat(state.silver)}</span>`;
    $('end-stars').innerHTML = goldHtml + silverHtml;

    let msg;
    if (state.gold === TOTAL_ROUNDS) msg = '完美！全部一次答对！🎉';
    else if (state.gold >= 8) msg = `太棒了！拿到 ${state.gold} 颗金星！`;
    else if (state.gold >= 6) msg = '不错哦，继续练习会更棒！';
    else if (state.gold + state.silver >= 8) msg = '坚持练习，你会越来越棒！';
    else msg = '没关系，每次练习都在进步！';
    if (state.helped > 0) msg += ` 有 ${state.helped} 题我们是一起完成的`;
    $('end-msg').textContent = `金星 ${state.gold} · 银星 ${state.silver}，${msg}`;

    const secs = Math.round((Date.now() - state.startTs) / 1000);
    $('end-time').textContent = `用时 ${secs} 秒`;

    saveSession();
    showScreen('end');
    if (global.__mtOwl) {
      if (state.gold === TOTAL_ROUNDS) {
        global.__mtOwl.flyIn('perfect');
        global.__mtOwl.say('哇，太厉害啦！', 900);
      } else {
        global.__mtOwl.flyIn('end');
        global.__mtOwl.say('再来一局吧！', 1500);
      }
    }
  }

  function saveSession() {
    try {
      const recs = JSON.parse(localStorage.getItem('mt_sessions') || '[]');
      recs.push({
        ts: Date.now(),
        mode: state.mode,
        gold: state.gold,
        silver: state.silver,
        helped: state.helped,
      });
      localStorage.setItem('mt_sessions', JSON.stringify(recs.slice(-100)));
    } catch (e) { /* 忽略 */ }
  }

  // ================= 事件绑定 =================
  function bind() {
    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => startMode(btn.dataset.mode));
    });

    document.addEventListener('click', (e) => {
      const opt = e.target.closest('.ts-opt');
      if (opt) return answer({ val: opt.dataset.val });
    });

    const btnSound = $('btn-sound');
    if (btnSound) {
      btnSound.textContent = voice.isSoundOn() ? '🔊' : '🔇';
      btnSound.addEventListener('click', () => {
        const on = !voice.isSoundOn();
        voice.setSound(on);
        try { localStorage.setItem('mt_sound', on ? '1' : '0'); } catch (e) { /* 忽略 */ }
        btnSound.textContent = on ? '🔊' : '🔇';
        if (on) speak('声音已打开');
      });
    }

    $('btn-again').addEventListener('click', () => startMode(state.mode));
    $('btn-menu').addEventListener('click', () => showScreen('start'));
  }

  // ================= 启动 =================
  document.addEventListener('DOMContentLoaded', () => {
    bind();
    showScreen('start');
  });

  // 调试钩子
  global.__mtDebug = function () {
    const q = state.question || {};
    return {
      round: state.round,
      kind: q.kind || null,
      hour: q.hour !== undefined ? q.hour : null,
      answer: q.answer !== undefined ? q.answer : null,
      options: q.options || [],
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : null,
      attempts: state.attempts,
      gold: state.gold,
      silver: state.silver,
      helped: state.helped,
      streak: state.streak,
      locked: state.locked,
      level: state.level,
      results: state.results.slice(-8),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
