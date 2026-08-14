/* ============================================
   Mathematical Thinking · 几何游戏（幼儿学习科学版）
   认图形 / 找图形

   与数感游戏共用同一脚手架框架（见 docs/设计说明-幼儿学习科学.md）：
   - 具体形象：内联 SVG 图形（圆/三角/正方 → 星/心/椭圆/菱形/六边形/月牙）
   - 答错不批评：鼓励 → 提示（图形特征）→ 温柔揭晓（脚手架阶梯）
   - 金星（一次答对）/ 银星（重试答对）双轨奖励
   - 过程性表扬语库（成长型思维）
   - 难度自适应（最近发展区）：图形池按档位扩增 3 → 6 → 10 种
   - 语音播报（视觉+听觉双通道，可一键静音）
   - 学习记录本地保存（家长参与）
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

  // ================= 图形库 =================
  // 每个图形：名字、特征提示（脚手架用）、糖果色、相似组（后半局提高难度）、SVG 绘制
  const SHAPES = {
    circle: {
      id: 'circle', name: '圆形', hint: '圆圆的，没有角', color: '#FF6B6B',
      similar: ['ellipse', 'crescent'],
      svg: '<circle cx="50" cy="50" r="40"/>',
    },
    triangle: {
      id: 'triangle', name: '三角形', hint: '有三个尖尖的角', color: '#4ECDC4',
      similar: ['diamond'],
      svg: '<polygon points="50,8 92,88 8,88"/>',
    },
    square: {
      id: 'square', name: '正方形', hint: '四条一样长的边', color: '#FFD93D',
      similar: ['rectangle', 'hexagon'],
      svg: '<rect x="12" y="12" width="76" height="76"/>',
    },
    rectangle: {
      id: 'rectangle', name: '长方形', hint: '四条边，两条长两条短', color: '#6BCB77',
      similar: ['square', 'hexagon'],
      svg: '<rect x="6" y="26" width="88" height="48"/>',
    },
    star: {
      id: 'star', name: '五角星', hint: '有五个尖尖的角', color: '#FF9F43',
      similar: ['heart'],
      svg: '<polygon points="' + starPoints(50, 50, 42, 17, 5).map(p => p[0] + ',' + p[1]).join(' ') + '"/>',
    },
    heart: {
      id: 'heart', name: '心形', hint: '像一颗爱心', color: '#FF5E8A',
      similar: ['star'],
      svg: '<path d="M50 88 C 20 64, 8 46, 8 32 C 8 16, 21 8, 33 8 C 41 8, 48 13, 50 19 C 52 13, 59 8, 67 8 C 79 8, 92 16, 92 32 C 92 46, 80 64, 50 88 Z"/>',
    },
    ellipse: {
      id: 'ellipse', name: '椭圆形', hint: '像鸡蛋一样，长长的圆', color: '#9B59B6',
      similar: ['circle', 'crescent'],
      svg: '<ellipse cx="50" cy="50" rx="42" ry="27"/>',
    },
    diamond: {
      id: 'diamond', name: '菱形', hint: '像风筝一样，四个角', color: '#54A0FF',
      similar: ['triangle'],
      svg: '<polygon points="50,6 94,50 50,94 6,50"/>',
    },
    hexagon: {
      id: 'hexagon', name: '六边形', hint: '有六条边', color: '#5F27CD',
      similar: ['square', 'rectangle'],
      svg: '<polygon points="' + starPoints(50, 50, 44, 44, 6).map(p => p[0] + ',' + p[1]).join(' ') + '"/>',
    },
    crescent: {
      id: 'crescent', name: '月牙形', hint: '像弯弯的月亮', color: '#F8C471',
      similar: ['circle', 'ellipse'],
      svg: '<path d="M62 8 A42 42 0 1 0 62 92 A36 36 0 1 1 62 8 Z"/>',
    },
  };

  // 正多边形顶点（供五角星/六边形复用）
  function starPoints(cx, cy, rOut, rIn, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  // 档位 → 图形池：档位越高，可选图形越多（最近发展区）
  const LEVEL_POOLS = [
    ['circle', 'triangle', 'square'],
    ['circle', 'triangle', 'square', 'rectangle', 'star', 'heart'],
    ['circle', 'triangle', 'square', 'rectangle', 'star', 'heart', 'ellipse', 'diamond', 'hexagon', 'crescent'],
  ];

  function levelPool(level) {
    return LEVEL_POOLS[clamp(level || 0, 0, 2)].slice();
  }

  // ================= 表扬与鼓励语库（过程导向 · 成长型思维） =================
  const PHRASES = {
    firstTry: [
      '太棒了，一次就答对！',
      '你真认真！',
      '我看到了你的努力！',
      '认得又快又准！',
      '好厉害，继续加油！',
      '你越来越棒了！',
    ],
    retry: [
      '答对啦！再试一次就成功了！',
      '坚持就是胜利！',
      '你看，多试就能做到！',
      '进步啦！',
    ],
    encourage: [
      '没关系，再找一次',
      '别急，慢慢看',
      '再仔细看看',
      '你可以的，再试试',
    ],
  };

  function pickPhrase(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  // ================= 题目生成（纯函数，供单测） =================
  // 从池中取 answerId 之外的 n 个干扰项；round 越靠后越优先选"相似图形"（提高难度）
  function pickDistractors(pool, answerId, n, round) {
    const others = pool.filter((s) => s !== answerId);
    const sim = SHAPES[answerId].similar.filter((s) => others.includes(s));
    const useSim = round >= 8 && sim.length > 0;
    const chosen = [];
    if (useSim) {
      for (const s of shuffle(sim)) {
        if (chosen.length >= n) break;
        chosen.push(s);
      }
    }
    for (const s of shuffle(others)) {
      if (chosen.length >= n) break;
      if (!chosen.includes(s)) chosen.push(s);
    }
    return chosen;
  }

  // 认图形：显示一个大图形，从 3 个名字里选
  function shapeQuestion(round, level) {
    const pool = levelPool(level);
    const answerId = pool[randInt(0, pool.length - 1)];
    const distractors = pickDistractors(pool, answerId, 2, round);
    const options = shuffle([answerId, distractors[0], distractors[1]]);
    return {
      kind: 'shape',
      shapeId: answerId,
      options: options, // 图形 id 数组
      answerIndex: options.indexOf(answerId),
      prompt: '这是什么图形？',
    };
  }

  // 找图形：听名字，点出目标图形。
  // 低档位 3 选 1（选项更少、认知负荷更低，符合斯韦勒理论），高档位 4 选 1
  function findQuestion(round, level) {
    const pool = levelPool(level);
    const targetId = pool[randInt(0, pool.length - 1)];
    const nOpt = (level || 0) === 0 ? 3 : 4;
    const distractors = pickDistractors(pool, targetId, nOpt - 1, round);
    const options = shuffle([targetId].concat(distractors));
    return {
      kind: 'find',
      targetId: targetId,
      options: options, // 图形 id 数组
      answerIndex: options.indexOf(targetId),
      prompt: '找出' + SHAPES[targetId].name,
    };
  }

  // 自适应难度：最近 5 题全部一次答对 → +1；≤2 题一次答对 → -1；否则 0
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
      shapeQuestion: shapeQuestion,
      findQuestion: findQuestion,
      levelPool: levelPool,
      pickDistractors: pickDistractors,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      SHAPES: SHAPES,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ================= 语音播报（Web Speech API，离线可用，无中文语音则跳过） =================
  let soundOn = true;
  try { soundOn = localStorage.getItem('mt_sound') !== '0'; } catch (e) { /* 忽略 */ }

  let voices = [];
  function loadVoices() {
    try {
      if (!('speechSynthesis' in global)) return;
      voices = global.speechSynthesis.getVoices();
      if (!voices.length) {
        global.speechSynthesis.onvoiceschanged = function () {
          voices = global.speechSynthesis.getVoices();
        };
      }
    } catch (e) { /* 忽略 */ }
  }
  loadVoices();

  function zhVoice() {
    return voices.find((v) => /zh[-_]CN/i.test(v.lang)) ||
      voices.find((v) => /^zh/i.test(v.lang)) || null;
  }

  function speak(text, rate) {
    if (!soundOn || !('speechSynthesis' in global)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = zhVoice();
      if (v) u.voice = v;
      u.lang = 'zh-CN';
      u.rate = rate || 0.9;
      global.speechSynthesis.cancel();
      global.speechSynthesis.speak(u);
    } catch (e) { /* 语音失败不影响游戏 */ }
  }

  function stopSpeak() {
    try {
      if ('speechSynthesis' in global) global.speechSynthesis.cancel();
    } catch (e) { /* 忽略 */ }
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

  function soundCorrect() { tone(660, 0, 0.15); tone(880, 0.12, 0.2); }
  function soundWrong() { tone(220, 0, 0.25); }

  // ================= SVG 渲染 =================
  // 图形卡片：统一尺寸的内联 SVG
  function shapeSvg(id, size) {
    const s = SHAPES[id];
    if (!s) return '';
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + s.name + '"><g fill="' + s.color + '">' + s.svg + '</g></svg>';
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
    startTs: 0,
  };

  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    game: $('screen-game'),
    end: $('screen-end'),
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

    if (q.kind === 'shape') {
      // 认图形：大图形 + 3 个名字按钮（文字 + 小图形图标，双重表征）
      elArea.innerHTML = '<div class="geo-big" data-geo="' + q.shapeId + '">' +
        shapeSvg(q.shapeId, 150) + '</div>';
      $('options').innerHTML = q.options
        .map((id) => '<button class="geo-name-btn" data-id="' + id + '">' +
          '<span class="geo-name-icon">' + shapeSvg(id, 34) + '</span>' +
          '<span class="geo-name-text">' + SHAPES[id].name + '</span></button>')
        .join('');
    } else {
      // 找图形：4 个图形卡片
      elArea.innerHTML = '<div class="geo-pick-grid">' + q.options
        .map((id) => '<button class="geo-pick-btn" data-id="' + id + '">' +
          shapeSvg(id, 84) + '</button>')
        .join('') + '</div>';
      $('options').innerHTML = '';
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

  // ================= 流程 =================
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
    state.startTs = Date.now();
    $('mode-title').textContent = mode === 'shape' ? '认图形' : '找图形';
    nextQuestion();
    showScreen('game');
  }

  function nextQuestion() {
    state.question = state.mode === 'shape'
      ? shapeQuestion(state.round, state.level)
      : findQuestion(state.round, state.level);
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    const q = state.question;
    const correct = q.kind === 'shape'
      ? payload.id === q.shapeId
      : payload.id === q.targetId;

    if (correct) {
      resolveCorrect();
    } else {
      resolveWrong();
    }
  }

  function resolveCorrect() {
    state.locked = true;
    stopSpeak();
    const firstTry = state.attempts === 0;
    if (firstTry) state.gold++; else state.silver++;
    state.results.push(firstTry);

    const phrase = firstTry ? pickPhrase(PHRASES.firstTry) : pickPhrase(PHRASES.retry);
    showFeedback(true, phrase);
    speak(phrase);
    soundCorrect();

    setTimeout(advance, 1100);
  }

  function resolveWrong() {
    state.locked = true;
    stopSpeak();
    state.attempts++;
    const q = state.question;
    showFeedback(false, pickPhrase(PHRASES.encourage));
    soundWrong();

    const shapeId = q.kind === 'shape' ? q.shapeId : q.targetId;
    const name = SHAPES[shapeId].name;

    if (state.attempts === 1) {
      // 第 1 次答错：图形特征提示，留在本题
      showHint('提示：' + SHAPES[shapeId].hint);
      setTimeout(() => { state.locked = false; }, 900);
    } else if (state.attempts === 2) {
      // 第 2 次答错：再提示 + 语音念名字
      showHint('再仔细看看，' + name + ' 的样子');
      speak(name + '，' + SHAPES[shapeId].hint);
      setTimeout(() => { state.locked = false; }, 1600);
    } else {
      // 第 3 次答错：温柔揭晓，记入"一起完成"，不批评
      state.helped++;
      state.results.push(false);
      const revealText = '这是' + name + '，我们一起记住它';
      showFeedback(false, revealText);
      speak(revealText);
      setTimeout(advance, 1600);
    }
  }

  function advance() {
    state.locked = false;
    state.round++;
    // 难度自适应（最近发展区）：基于最近 5 题的一次答对率
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
  }

  // 学习记录：仅存本机浏览器（与数感共用 mt_sessions）
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
      const nameBtn = e.target.closest('.geo-name-btn');
      if (nameBtn) return answer({ id: nameBtn.dataset.id });
      const pickBtn = e.target.closest('.geo-pick-btn');
      if (pickBtn) return answer({ id: pickBtn.dataset.id });
    });

    const btnSound = $('btn-sound');
    if (btnSound) {
      btnSound.textContent = soundOn ? '🔊' : '🔇';
      btnSound.addEventListener('click', () => {
        soundOn = !soundOn;
        try { localStorage.setItem('mt_sound', soundOn ? '1' : '0'); } catch (e) { /* 忽略 */ }
        btnSound.textContent = soundOn ? '🔊' : '🔇';
        if (soundOn) speak('声音已打开');
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

  // 调试钩子：暴露内部状态供 E2E 断言（生产无害）
  global.__mtDebug = function () {
    const q = state.question || {};
    const shapeId = q.shapeId || q.targetId || null;
    return {
      round: state.round,
      kind: q.kind || null,
      shapeId: shapeId,
      options: q.options || [],
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : null,
      attempts: state.attempts,
      gold: state.gold,
      silver: state.silver,
      helped: state.helped,
      locked: state.locked,
      level: state.level,
      results: state.results.slice(-8),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
