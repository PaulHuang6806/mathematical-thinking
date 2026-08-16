/* ============================================
   Mathematical Thinking · 比较与测量馆（幼儿学习科学版）
   依据《幼小衔接数学游戏盒》10 张紫色牌设计（见 docs/数学游戏盒数字化设计方案.md）：
   船载重比轻重 / 一样粗细 / 哪条线最短 / 测量工具 / 面积比较与守恒 /
   天平传递推理 / 水杯守恒 / 蛋糕等量代换

   设计原则：
   - 由易到难三级：L1 直观比较（轻重/粗细/长短）→ L2 半抽象（测量工具/面积数格）→ L3 推理守恒（传递/守恒/代换）
   - 全部图形化呈现（船/铅笔/线/天平/水杯/蛋糕），支持数一数、比一比
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

  // ================= 表扬与鼓励语库（语音已预合成） =================
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

  function pickDistractors(answer, pool, n) {
    const cands = pool.filter((x) => x !== answer);
    return shuffle(cands).slice(0, n);
  }

  // ================= 动物池（船载重/天平推理共用，名字语音已有） =================
  const MEASURE_ANIMALS = [
    { name: '小熊', emoji: '🐻' }, { name: '小兔', emoji: '🐰' }, { name: '小鸡', emoji: '🐔' },
    { name: '小猫', emoji: '🐱' }, { name: '小狗', emoji: '🐶' }, { name: '小鸭', emoji: '🦆' },
    { name: '乌龟', emoji: '🐢' }, { name: '小猪', emoji: '🐷' }, { name: '大象', emoji: '🐘' },
    { name: '长颈鹿', emoji: '🦒' },
  ];

  // ================= 船载重（谁更重） =================
  // 两只动物坐船，沉得深的更重（L1 直观比较）
  function heavyQuestion() {
    const pair = shuffle(MEASURE_ANIMALS.slice()).slice(0, 2);
    const heavyIsA = Math.random() < 0.5;
    const options = shuffle(pair.map((a) => a.name));
    return {
      kind: 'heavy',
      animals: pair,
      heavyIsA: heavyIsA,
      answer: (heavyIsA ? pair[0] : pair[1]).name,
      options: options,
      answerIndex: options.indexOf(heavyIsA ? pair[0].name : pair[1].name),
      prompt: '谁更重？',
      hint1: '看看谁的船沉得更深',
      hint2: '船沉得深的，更重',
      reveal: '它更重，船都沉下去啦！',
      revealVoice: '真棒！',
    };
  }

  // ================= 一样粗细（铅笔） =================
  // 3 支铅笔粗细不同，问最粗/最细（L1）
  const PENCIL_COLORS = [
    { name: '红铅笔', cls: 'red' }, { name: '蓝铅笔', cls: 'blue' }, { name: '绿铅笔', cls: 'green' },
  ];

  function thickQuestion() {
    const widths = shuffle([6, 13, 20]);
    const pencils = PENCIL_COLORS.map((c, i) => ({ name: c.name, cls: c.cls, w: widths[i] }));
    const askThick = Math.random() < 0.5;
    const targetW = askThick ? Math.max.apply(null, widths) : Math.min.apply(null, widths);
    const answer = pencils.find((p) => p.w === targetW).name;
    const options = shuffle(PENCIL_COLORS.map((c) => c.name));
    return {
      kind: 'thick',
      pencils: pencils,
      askThick: askThick,
      answer: answer,
      options: options,
      answerIndex: options.indexOf(answer),
      prompt: askThick ? '哪支铅笔最粗？' : '哪支铅笔最细？',
      hint1: askThick ? '看看哪支铅笔最胖' : '看看哪支铅笔最瘦',
      hint2: '胖胖的是粗的，瘦瘦的是细的',
      reveal: '对啦，就是它！',
      revealVoice: '真棒！',
    };
  }

  // ================= 哪条线最短（长度比较） =================
  // 直线 vs 波浪 vs 弯折，问最短/最长（L1：直线最短；L2：长短比较）
  function lineQuestion(round, level) {
    const lv = level || 0;
    // 三条线：直线（黑）、波浪（蓝）、弯折（红）
    const askShort = lv === 0 ? true : Math.random() < 0.5;
    if (askShort) {
      // 最短：总是直线（两点之间直线最短）
      const options = shuffle(['直线', '波浪线', '弯折线']);
      return {
        kind: 'line',
        askShort: true,
        answer: '直线',
        options: options,
        answerIndex: options.indexOf('直线'),
        prompt: '哪条线最短？',
        hint1: '直直的路是不是最近？',
        hint2: '弯弯绕绕的，要走更远的路',
        reveal: '直线最短，直直的路最近！',
        revealVoice: '直线最短！',
      };
    }
    // 最长：波浪与弯折随机其一更长（画不同长度）
    const longer = Math.random() < 0.5 ? '波浪线' : '弯折线';
    const options = shuffle(['直线', '波浪线', '弯折线']);
    const q = {
      kind: 'line',
      askShort: false,
      longer: longer,
      answer: longer,
      options: options,
      answerIndex: options.indexOf(longer),
      prompt: '哪条线最长？',
      hint1: '弯弯绕绕的路更长',
      hint2: '数一数，哪条绕得最多',
      reveal: longer + '最长，绕的路最多！',
      revealVoice: '它最长！',
    };
    return q;
  }

  // ================= 测量工具（L2） =================
  const TOOL_ITEMS = [
    { obj: '身高', emoji: '🧍', tool: '软尺', toolEmoji: '🧵', q: '量身高，用什么？', hint: '软软的尺子可以围一圈' },
    { obj: '桌子', emoji: '🪑', tool: '卷尺', toolEmoji: '📏', q: '量桌子，用什么？', hint: '长长的尺子拉出来量' },
    { obj: '体温', emoji: '🤒', tool: '体温计', toolEmoji: '🌡️', q: '量体温，用什么？', hint: '放在身上量温度' },
    { obj: '时间', emoji: '⏰', tool: '钟', toolEmoji: '⏱️', q: '量时间，用什么？', hint: '滴答滴答走着的' },
  ];
  const TOOL_OPTIONS = [
    { tool: '软尺', toolEmoji: '🧵' }, { tool: '卷尺', toolEmoji: '📏' },
    { tool: '体温计', toolEmoji: '🌡️' }, { tool: '钟', toolEmoji: '⏱️' },
  ];

  function toolQuestion() {
    const t = TOOL_ITEMS[randInt(0, TOOL_ITEMS.length - 1)];
    const options = shuffle(TOOL_OPTIONS.slice());
    const answerIdx = options.findIndex((o) => o.tool === t.tool);
    return {
      kind: 'tool',
      item: t,
      answer: t.tool,
      options: options.map((o) => o.tool),
      optionEmojis: options.map((o) => o.toolEmoji),
      answerIndex: answerIdx,
      prompt: t.q,
      hint1: t.hint,
      hint2: '想一想，它要怎么量',
      reveal: '用' + t.tool + '来量，真棒！',
      revealVoice: '真棒！',
    };
  }

  // ================= 面积比较与守恒（L2/L3） =================
  // L2: 两个方格图形数量不同，问哪个大；L3: 同格数不同形状，问一样大吗
  function areaQuestion(round, level) {
    const lv = level || 0;
    // 形状定义：格子坐标数组（4x4 网格内）
    const shapes = [
      [[0, 1, 2], [4, 5, 6], [8, 9, 10]],                       // 3x3 方块 9 格
      [[0, 1], [4, 5], [8, 9], [12, 13]],                       // 4x2 条 8 格
      [[0, 1, 2, 3], [4, 5, 6, 7]],                             // 2x4 条 8 格
      [[0, 1], [4, 5], [8, 9], [12, 13], [14, 15]],             // L 形 10 格
      [[0, 1, 2], [4, 5], [8]],                                 // 阶梯 6 格
      [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]],             // 3x4 块 12 格
    ];
    const same = lv >= 1 && Math.random() < 0.5;
    let shapeA, shapeB;
    if (same) {
      // 同格数不同形状（守恒）
      const pairs = [[0, 5], [1, 2], [3, 4]]; // (3x3 9格, 阶梯6格 不行——要同格数)
      const samePairs = [[[0, 1, 2, 3], [4, 5, 6, 7]], [[0, 1], [4, 5], [8, 9], [12, 13]]];
      const pick = samePairs[randInt(0, samePairs.length - 1)];
      shapeA = pick[0]; shapeB = pick[1];
    } else {
      shapeA = shapes[randInt(0, shapes.length - 1)];
      shapeB = shapes[randInt(0, shapes.length - 1)];
      let guard = 0;
      while (shapeA.length === shapeB.length && guard++ < 10) {
        shapeB = shapes[randInt(0, shapes.length - 1)];
      }
    }
    const nA = shapeA.length, nB = shapeB.length;
    if (same) {
      const options = shuffle(['一样大', 'A 大', 'B 大']);
      return {
        kind: 'area',
        same: true,
        shapeA: shapeA, shapeB: shapeB,
        answer: '一样大',
        options: options,
        answerIndex: options.indexOf('一样大'),
        prompt: '两个图形一样大吗？',
        hint1: '数一数，各有几个小方格',
        hint2: '格子一样多，就一样大',
        reveal: '格子一样多，它们一样大！',
        revealVoice: '它们一样大！',
      };
    }
    const bigger = nA > nB ? 'A 大' : 'B 大';
    const options = shuffle(['一样大', 'A 大', 'B 大']);
    return {
      kind: 'area',
      same: false,
      shapeA: shapeA, shapeB: shapeB,
      answer: bigger,
      options: options,
      answerIndex: options.indexOf(bigger),
      prompt: '哪个图形更大？',
      hint1: '数一数，各有几个小方格',
      hint2: '格子多的，就更大',
      reveal: (nA > nB ? 'A' : 'B') + ' 图形更大，格子更多！',
      revealVoice: '真棒！',
    };
  }

  // ================= 天平传递推理（L3） =================
  // A = x 个 B，B = y 个 C → 谁最重？谁最轻？（皮亚杰传递推理）
  function scaleQuestion() {
    const items = shuffle(MEASURE_ANIMALS.slice()).slice(0, 3);
    const [A, B, C] = items;
    const x = randInt(2, 3), y = randInt(2, 3);
    const askHeaviest = Math.random() < 0.5;
    const answer = askHeaviest ? A.name : C.name;
    const options = shuffle(items.map((a) => a.name));
    return {
      kind: 'scale',
      items: items,
      x: x, y: y,
      askHeaviest: askHeaviest,
      answer: answer,
      options: options,
      answerIndex: options.indexOf(answer),
      prompt: askHeaviest ? '想一想，谁最重？' : '想一想，谁最轻？',
      hint1: '1 个' + A.name + ' = ' + x + ' 个' + B.name + '，想想谁重',
      hint1Voice: '想一想，谁比谁更重',
      hint2: '把两个天平连起来想一想',
      reveal: (askHeaviest ? A.name : C.name) + (askHeaviest ? '最重' : '最轻') + '！',
      revealVoice: '真棒！',
    };
  }

  // ================= 水杯守恒（L3） =================
  // 同样多的水倒进不同形状的杯子，液面不同——守恒
  const WATER_CUPS = [
    { name: '高杯子', cls: 'tall' }, { name: '矮杯子', cls: 'short' }, { name: '圆杯子', cls: 'round' },
  ];

  function waterQuestion() {
    const options = shuffle(['都一样多'].concat(WATER_CUPS.map((c) => c.name)));
    return {
      kind: 'water',
      cups: WATER_CUPS,
      answer: '都一样多',
      options: options,
      answerIndex: options.indexOf('都一样多'),
      prompt: '哪杯水最多？',
      hint1: '水是从同一个杯子里倒出来的',
      hint2: '杯子不一样，水一样多哦',
      reveal: '水一样多，只是杯子不一样！',
      revealVoice: '水一样多！',
    };
  }

  // ================= 蛋糕等量代换（L3） =================
  // 1 圆蛋糕 = x 纸杯蛋糕，1 纸杯蛋糕 = y 方蛋糕 → 1 圆 = x*y 方
  function cakeQuestion() {
    const x = randInt(2, 3), y = randInt(2, 3);
    const ans = x * y;
    const pool = [];
    for (let n = 2; n <= 12; n++) pool.push(n);
    const options = shuffle([ans].concat(pickDistractors(ans, pool, 3)));
    return {
      kind: 'cake',
      x: x, y: y,
      answer: ans,
      options: options,
      answerIndex: options.indexOf(ans),
      prompt: '1 个圆蛋糕等于几块方蛋糕？',
      hint1: '1 个圆蛋糕 = ' + x + ' 个纸杯蛋糕',
      hint1Voice: '想想蛋糕能换几个',
      hint2: '1 个纸杯蛋糕 = ' + y + ' 块方蛋糕，数一数',
      hint2Voice: '数一数，换一换',
      reveal: '1 个圆蛋糕 = ' + ans + ' 块方蛋糕！',
      revealVoice: '真棒！',
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

  function buildSummary(st) {
    return { gold: st.gold, silver: st.silver, helped: st.helped, level: st.level };
  }

  // ================= 单测导出（浏览器中无副作用） =================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      heavyQuestion: heavyQuestion,
      thickQuestion: thickQuestion,
      lineQuestion: lineQuestion,
      toolQuestion: toolQuestion,
      areaQuestion: areaQuestion,
      scaleQuestion: scaleQuestion,
      waterQuestion: waterQuestion,
      cakeQuestion: cakeQuestion,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      MEASURE_ANIMALS: MEASURE_ANIMALS,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ================= 语音播报 =================
  const voice = global.__mtVoice;

  function speak(text, rate) {
    if (voice) voice.play(text, rate);
  }

  function stopSpeak() {
    if (voice) voice.stop();
  }

  // ================= 音效 =================
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

  // ================= 渲染辅助 =================
  function areaShapeHtml(cells) {
    // 4x4 网格，cells 里的格子填充
    let html = '<div class="ms-area-shape">';
    for (let i = 0; i < 16; i++) {
      html += `<span class="ms-area-cell${cells.indexOf(i) >= 0 ? ' ms-area-filled' : ''}"></span>`;
    }
    return html + '</div>';
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
    heavy: '船载重', thick: '一样粗细', line: '哪条线短', tool: '测量工具',
    area: '面积比较', scale: '天平推理', water: '水杯守恒', cake: '蛋糕推理',
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

    if (q.kind === 'heavy') {
      const [A, B] = q.animals;
      const deepA = q.heavyIsA;
      elArea.innerHTML =
        `<div class="ms-heavy">
           <div class="ms-boat${deepA ? ' ms-boat-heavy' : ''}"><span class="ms-boat-animal">${A.emoji}</span><span class="ms-boat-body">🛶</span><span class="ms-water${deepA ? ' ms-water-high' : ''}"></span><span class="ms-boat-name">${A.name}</span></div>
           <div class="ms-boat${deepA ? '' : ' ms-boat-heavy'}"><span class="ms-boat-animal">${B.emoji}</span><span class="ms-boat-body">🛶</span><span class="ms-water${deepA ? '' : ' ms-water-high'}"></span><span class="ms-boat-name">${B.name}</span></div>
         </div>`;
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn ms-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'thick') {
      elArea.innerHTML = '<div class="ms-pencils">' + q.pencils.map((p) =>
        `<div class="ms-pencil"><span class="ms-pencil-body ms-pencil-${p.cls}" style="width:${p.w}px"></span><span class="ms-pencil-name">${p.name}</span></div>`).join('') + '</div>';
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn ms-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'line') {
      const wave = `<path d="M10 80 Q 30 20 50 80 T 90 80 T 130 80 T 170 80" fill="none" stroke="#4a90d9" stroke-width="5" stroke-linecap="round"/>`;
      const zig = `<polyline points="10,80 50,30 90,80 130,30 170,80" fill="none" stroke="#e5484d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
      elArea.innerHTML =
        `<div class="ms-lines">
           <div class="ms-line-row"><svg viewBox="0 0 180 100" width="220" height="110"><line x1="10" y1="80" x2="170" y2="80" stroke="#333" stroke-width="5" stroke-linecap="round"/></svg><span class="ms-line-name">直线</span></div>
           <div class="ms-line-row"><svg viewBox="0 0 180 100" width="220" height="110">${wave}</svg><span class="ms-line-name">波浪线</span></div>
           <div class="ms-line-row"><svg viewBox="0 0 180 100" width="220" height="110">${zig}</svg><span class="ms-line-name">弯折线</span></div>
         </div>`;
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn ms-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'tool') {
      elArea.innerHTML = `<div class="ms-tool-obj"><span class="ms-tool-emoji">${q.item.emoji}</span><span class="ms-tool-objname">${q.item.obj}</span></div>`;
      $('options').innerHTML = q.options
        .map((t, i) => `<button class="opt-btn ms-opt ms-tool-opt" data-val="${t}">${q.optionEmojis[i]} ${t}</button>`)
        .join('');
    } else if (q.kind === 'area') {
      elArea.innerHTML =
        `<div class="ms-area"><div class="ms-area-label">A</div>${areaShapeHtml(q.shapeA)}<div class="ms-area-label">B</div>${areaShapeHtml(q.shapeB)}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn ms-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'scale') {
      const [A, B, C] = q.items;
      elArea.innerHTML =
        `<div class="ms-scale">
           <div class="ms-scale-row"><span class="ms-scale-emoji">${A.emoji}</span><span class="ms-scale-op">⚖️</span>${new Array(q.x).fill(`<span class="ms-scale-emoji ms-scale-small">${B.emoji}</span>`).join('')}</div>
           <div class="ms-scale-row"><span class="ms-scale-emoji">${B.emoji}</span><span class="ms-scale-op">⚖️</span>${new Array(q.y).fill(`<span class="ms-scale-emoji ms-scale-small">${C.emoji}</span>`).join('')}</div>
         </div>`;
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn ms-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'water') {
      elArea.innerHTML =
        `<div class="ms-water-cups">
           <div class="ms-cup ms-cup-tall"><div class="ms-cup-fill ms-fill-tall"></div><span class="ms-cup-name">高杯子</span></div>
           <div class="ms-cup ms-cup-short"><div class="ms-cup-fill ms-fill-short"></div><span class="ms-cup-name">矮杯子</span></div>
           <div class="ms-cup ms-cup-round"><div class="ms-cup-fill ms-fill-round"></div><span class="ms-cup-name">圆杯子</span></div>
         </div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn ms-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'cake') {
      elArea.innerHTML =
        `<div class="ms-cake">
           <div class="ms-cake-row"><span class="ms-cake-emoji ms-cake-big">🎂</span><span class="ms-cake-op">=</span>${new Array(q.x).fill('<span class="ms-cake-emoji">🧁</span>').join('')}</div>
           <div class="ms-cake-row"><span class="ms-cake-emoji">🧁</span><span class="ms-cake-op">=</span>${new Array(q.y).fill('<span class="ms-cake-emoji ms-cake-small">🍰</span>').join('')}</div>
         </div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn ms-opt" data-val="${v}">${v}块</button>`)
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
      case 'heavy': state.question = heavyQuestion(); break;
      case 'thick': state.question = thickQuestion(); break;
      case 'line': state.question = lineQuestion(state.round, state.level); break;
      case 'tool': state.question = toolQuestion(); break;
      case 'area': state.question = areaQuestion(state.round, state.level); break;
      case 'scale': state.question = scaleQuestion(); break;
      case 'water': state.question = waterQuestion(); break;
      default: state.question = cakeQuestion();
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
      speak(q.hint1Voice || q.hint1);
      setTimeout(() => { state.locked = false; }, 1300);
    } else if (state.attempts === 2) {
      showHint('再想想：' + q.hint2);
      speak(q.hint2Voice || q.hint2);
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
      const opt = e.target.closest('.ms-opt');
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
