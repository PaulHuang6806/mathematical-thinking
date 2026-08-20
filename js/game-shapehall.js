/* ============================================
   Mathematical Thinking · 形与集合馆（幼儿学习科学版）
   依据《幼小衔接数学游戏盒》蓝色牌设计（见 docs/数学游戏盒数字化设计方案.md）：
   立体图形 / 等分 / 图形分类（梯形）/ 集合包含（三角形水果）/ 拼合计数 / 填红方块（模式）

   设计原则：
   - L1 直观：立体图形辨认、二等分/四等分
   - L2 半抽象：图形分类、集合包含、拼合计数
   - L3 推理：填红方块（模式识别）
   - 全部 SVG/图形化呈现；答错不批评（阶梯提示）；金星银星双轨；自适应；语音播报
   纯函数部分可被 Node 单测复用。
   ============================================ */
(function (global) {
  'use strict';

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

  // ================= 立体图形（L1） =================
  const SOLIDS = [
    { name: '球体', emoji: '⚽', hint: '圆圆的，会滚来滚去' },
    { name: '正方体', emoji: '🎲', hint: '方方正正的，六个面' },
    { name: '圆柱体', emoji: '🥫', hint: '像柱子一样，上下一样粗' },
    { name: '圆锥体', emoji: '🎪', hint: '尖尖的，像小帐篷' },
  ];

  function solidQuestion() {
    const target = SOLIDS[randInt(0, SOLIDS.length - 1)];
    const options = shuffle(SOLIDS.map((s) => s.name));
    return {
      kind: 'solid',
      solid: target,
      answer: target.name,
      options: options,
      answerIndex: options.indexOf(target.name),
      prompt: '这是什么立体图形呀？',
      hint1: target.hint,
      hint2: '摸摸它的样子，想一想',
      reveal: '这是' + target.name + '，我们一起记住它',
      revealVoice: '这是' + target.name + '，我们一起记住它',
    };
  }

  // ================= 等分（L1/L2） =================
  // 显示图形被平均分成 2/3/4 份，问分成了几份
  function equalQuestion() {
    const parts = randInt(2, 4);
    const shape = ['圆形', '长方形', '三角形'][randInt(0, 2)];
    const pool = [2, 3, 4];
    const options = shuffle(pool);
    return {
      kind: 'equal',
      parts: parts,
      shape: shape,
      answer: parts,
      options: options,
      answerIndex: options.indexOf(parts),
      prompt: '分成了几份呀？',
      hint1: '数一数，有几份',
      hint2: '每份一样多，是平均分',
      reveal: '分成了 ' + parts + ' 份，每份一样多！',
      revealVoice: '分成了 ' + parts + ' 份，真棒！',
    };
  }

  // ================= 图形分类：哪个不是梯形（L2） =================
  // 4 个四边形：3 个梯形 + 1 个非梯形（平行四边形），问哪个不是
  function classifyQuestion() {
    const notTrap = ['平行四边形', '不规则四边形'][randInt(0, 1)];
    const idx = randInt(0, 3);
    const items = [];
    for (let i = 0; i < 4; i++) {
      items.push({ isTrap: i !== idx, label: i !== idx ? '梯形' : notTrap });
    }
    const options = shuffle(['第1个', '第2个', '第3个', '第4个']);
    const answer = ['第1个', '第2个', '第3个', '第4个'][idx];
    return {
      kind: 'classify',
      items: items,
      notTrap: notTrap,
      oddIdx: idx,
      answer: answer,
      options: options,
      answerIndex: options.indexOf(answer),
      prompt: '哪个不是梯形呀？',
      hint1: '找找哪一个不一样',
      hint2: '梯形有两条平平的边',
      reveal: '第' + (idx + 1) + '个不是梯形，它是' + notTrap + '！',
      revealVoice: '它不是梯形，真棒！',
    };
  }

  // ================= 集合包含：三角形里的水果（L2） =================
  // 大三角形套小三角形（重叠区域），小三角形里有几个水果
  function includeQuestion() {
    const n = randInt(2, 6);
    const pool = [];
    for (let i = 1; i <= 8; i++) pool.push(i);
    const options = shuffle([n].concat(pickDistractors(n, pool, 3)));
    return {
      kind: 'include',
      n: n,
      answer: n,
      options: options,
      answerIndex: options.indexOf(n),
      prompt: '小三角形里有几个水果呀？',
      hint1: '数一数，小三角形里面的',
      hint2: '只看小三角形里面的，外面的不算',
      reveal: '小三角形里有 ' + n + ' 个水果！',
      revealVoice: '有 ' + n + ' 个，真棒！',
    };
  }

  // ================= 拼合计数（L2） =================
  // 箭头由 3 块三角形 + 1 块长方形拼成，问用了几块三角形
  function puzzleQuestion() {
    const tri = randInt(2, 5);
    const sq = randInt(1, 3);
    const pool = [];
    for (let i = 1; i <= 8; i++) pool.push(i);
    const options = shuffle([tri].concat(pickDistractors(tri, pool, 3)));
    return {
      kind: 'puzzle',
      tri: tri,
      sq: sq,
      answer: tri,
      options: options,
      answerIndex: options.indexOf(tri),
      prompt: '用了几块三角形呀？',
      hint1: '数一数，三角形有几块',
      hint2: '拼在一起，一块一块数',
      reveal: '用了 ' + tri + ' 块三角形！',
      revealVoice: '用了 ' + tri + ' 块，真棒！',
    };
  }

  // ================= 填红方块（L3 模式） =================
  // 3x3 网格，红色方块按规律（每行递增/对角线），缺 1 个，问填在哪
  function redGridQuestion() {
    // 模式：已填红的格子 + 缺失格（缺失格不在已填列表里）
    const patterns = [
      { cells: [0, 3, 6, 7, 8], missing: 4, desc: '第2排第2号' },   // 行递增 1/2/3，缺(1,1)
      { cells: [0, 8], missing: 4, desc: '第2排第2号' },             // 主对角线，缺中间
      { cells: [0, 3, 1, 4, 7], missing: 6, desc: '第3排第1号' },    // 列递增 3/2/1，缺(2,0)
    ];
    const p = patterns[randInt(0, 2)];
    // 生成候选坐标（第X排第Y号）
    const coords = [];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) coords.push('第' + r + '排第' + c + '号');
    const options = shuffle([p.desc].concat(pickDistractors(p.desc, coords, 3)));
    return {
      kind: 'redGrid',
      cells: p.cells,
      missing: p.missing,
      answer: p.desc,
      options: options,
      answerIndex: options.indexOf(p.desc),
      prompt: '红色方块该填在哪里呀？',
      hint1: '看看红色方块的规律',
      hint2: '一排比一排多，找一找',
      reveal: '填在' + p.desc + '，规律找到啦！',
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

  // ================= 单测导出 =================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      solidQuestion: solidQuestion,
      equalQuestion: equalQuestion,
      classifyQuestion: classifyQuestion,
      includeQuestion: includeQuestion,
      puzzleQuestion: puzzleQuestion,
      redGridQuestion: redGridQuestion,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      SOLIDS: SOLIDS,
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

  // ================= 渲染辅助（SVG） =================
  function equalSvg(parts, shape) {
    let body = '';
    const cx = 60, cy = 60;
    if (shape === '圆形') {
      body = `<circle cx="${cx}" cy="${cy}" r="50" fill="#ffd9a0" stroke="#ff8a3d" stroke-width="3"/>`;
      for (let i = 0; i < parts; i++) {
        const a1 = (i * 360 / parts - 90) * Math.PI / 180;
        const a2 = ((i + 1) * 360 / parts - 90) * Math.PI / 180;
        body += `<line x1="${cx}" y1="${cy}" x2="${(cx + 50 * Math.cos(a1)).toFixed(1)}" y2="${(cy + 50 * Math.sin(a1)).toFixed(1)}" stroke="#ff8a3d" stroke-width="2" stroke-dasharray="4 3"/>`;
        body += `<line x1="${cx}" y1="${cy}" x2="${(cx + 50 * Math.cos(a2)).toFixed(1)}" y2="${(cy + 50 * Math.sin(a2)).toFixed(1)}" stroke="#ff8a3d" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
    } else if (shape === '长方形') {
      body = `<rect x="10" y="30" width="100" height="60" fill="#bfe3ff" stroke="#4a90d9" stroke-width="3"/>`;
      for (let i = 1; i < parts; i++) {
        body += `<line x1="${(10 + 100 * i / parts).toFixed(1)}" y1="30" x2="${(10 + 100 * i / parts).toFixed(1)}" y2="90" stroke="#4a90d9" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
    } else {
      body = `<polygon points="60,10 110,110 10,110" fill="#c9f0d5" stroke="#46a758" stroke-width="3"/>`;
      for (let i = 1; i < parts; i++) {
        const y = 10 + 100 * i / parts;
        body += `<line x1="${(110 - (110 - 10) * (y - 10) / 100).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(10 + (110 - 10) * (y - 10) / 100).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#46a758" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
    }
    return `<svg viewBox="0 0 120 120" width="150" height="150">${body}</svg>`;
  }

  function trapezoidSvg(w1, w2, h, fill, stroke) {
    return `<svg viewBox="0 0 120 80" width="110" height="74">
      <polygon points="${30 - w1 / 2},70 ${30 + w1 / 2},70 ${30 + w2 / 2},10 ${30 - w2 / 2},10"
        fill="${fill}" stroke="${stroke}" stroke-width="2.5"/></svg>`;
  }

  function notTrapezoidSvg(kind) {
    if (kind === '平行四边形') {
      return `<svg viewBox="0 0 120 80" width="110" height="74"><polygon points="20,70 100,70 80,10 0,10" fill="#fde2e2" stroke="#e5484d" stroke-width="2.5"/></svg>`;
    }
    return `<svg viewBox="0 0 120 80" width="110" height="74"><polygon points="15,70 105,70 95,10 25,10 45,40" fill="#fde2e2" stroke="#e5484d" stroke-width="2.5"/></svg>`;
  }

  function includeSvg(n) {
    // 预留：SVG 版集合包含（当前渲染用 CSS 布局）
    return '';
  }

  // ================= 游戏状态与 UI =================
  if (typeof document === 'undefined') return;

  const state = {
    mode: null, round: 0, gold: 0, silver: 0, helped: 0,
    attempts: 0, level: 0, locked: false, question: null,
    results: [], streak: 0, startTs: 0,
  };

  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    game: $('screen-game'),
    end: $('screen-end'),
  };

  const MODE_NAMES = {
    solid: '立体图形', equal: '等分', classify: '谁是梯形',
    include: '三角水果', puzzle: '拼合计数', redGrid: '填红方块',
  };

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

    if (q.kind === 'solid') {
      elArea.innerHTML = `<div class="sh-solid"><span class="sh-solid-emoji">${q.solid.emoji}</span><span class="sh-solid-name">？</span></div>`;
      $('options').innerHTML = q.options
        .map((n) => `<button class="opt-btn sh-opt" data-val="${n}">${n}</button>`)
        .join('');
    } else if (q.kind === 'equal') {
      elArea.innerHTML = `<div class="sh-equal">${equalSvg(q.parts, q.shape)}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn sh-opt" data-val="${v}">${v}份</button>`)
        .join('');
    } else if (q.kind === 'classify') {
      let itemsHtml = '';
      q.items.forEach((it, i) => {
        const svg = it.isTrap
          ? trapezoidSvg(70, 40, 60, '#e6f4ff', '#4a90d9')
          : notTrapezoidSvg(q.notTrap);
        itemsHtml += `<button class="sh-quad" data-idx="${i}">${svg}<span class="sh-quad-label">第${i + 1}个</span></button>`;
      });
      elArea.innerHTML = `<div class="sh-quads">${itemsHtml}</div>`;
      $('options').innerHTML = '';
      // 点击图形作答：由 document 级监听统一处理（见 bind()）
    } else if (q.kind === 'include') {
      // 用 emoji 布局代替 SVG 文本（SVG 文本 emoji 兼容性差）
      const inner = new Array(q.n).fill('<span class="sh-fruit">🍎</span>').join('');
      elArea.innerHTML = `
        <div class="sh-include">
          <div class="sh-big-tri">
            <div class="sh-mid-tri"><div class="sh-fruits">${inner}</div></div>
          </div>
        </div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn sh-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'puzzle') {
      // 拼合：几块三角形 + 几块长方形 emoji
      const tris = new Array(q.tri).fill('<span class="sh-pz-tri">🔺</span>').join('');
      const sqs = new Array(q.sq).fill('<span class="sh-pz-sq">🟦</span>').join('');
      elArea.innerHTML = `<div class="sh-puzzle"><div class="sh-pz-arrow">${tris}${sqs}</div></div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn sh-opt" data-val="${v}">${v}块</button>`)
        .join('');
    } else if (q.kind === 'redGrid') {
      let cells = '';
      for (let i = 0; i < 9; i++) {
        const isRed = q.cells.indexOf(i) >= 0;
        const isMissing = i === q.missing;
        cells += `<span class="sh-red-cell${isRed ? ' sh-red-on' : ''}${isMissing ? ' sh-red-ask' : ''}"></span>`;
      }
      elArea.innerHTML = `<div class="sh-red-grid">${cells}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn sh-opt" data-val="${v}">${v}</button>`)
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
      case 'solid': state.question = solidQuestion(); break;
      case 'equal': state.question = equalQuestion(); break;
      case 'classify': state.question = classifyQuestion(); break;
      case 'include': state.question = includeQuestion(); break;
      case 'puzzle': state.question = puzzleQuestion(); break;
      default: state.question = redGridQuestion();
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
      const opt = e.target.closest('.sh-opt');
      if (opt) return answer({ val: opt.dataset.val });
      // classify 模式点击图形
      const quad = e.target.closest('.sh-quad');
      if (quad && state.mode === 'classify') {
        const val = '第' + (Number(quad.dataset.idx) + 1) + '个';
        if (!state.locked) {
          if (val === state.question.answer) resolveCorrect(); else resolveWrong();
        }
      }
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
