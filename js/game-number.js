/* ============================================
   Mathematical Thinking · 数感游戏（v2 · 幼儿学习科学版）
   数一数 / 比一比

   设计依据见 docs/设计说明-幼儿学习科学.md：
   - 十格阵（5 结构分组）辅助数感
   - 答错不批评：鼓励 → 提示 → 共同数 → 温柔揭晓（脚手架阶梯）
   - 金星（一次答对）/ 银星（重试答对）双轨奖励
   - 过程性表扬语库（成长型思维）
   - 难度自适应（最近发展区）：最近 5 题一次答对率驱动 0-2 档
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

  const EMOJIS = ['🍎', '⭐', '🍓', '🐰', '🌸', '🚗', '🐟', '🌈'];
  const TOTAL_ROUNDS = 10;

  // ================= 表扬与鼓励语库（过程导向 · 成长型思维） =================
  const PHRASES = {
    firstTry: [
      '太棒啦，一次就答对！',
      '你真认真！',
      '我看到了你的努力！',
      '数得又快又准！',
      '好厉害，继续加油！',
      '你越来越棒啦！',
      '哇，数得真清楚！',
      '小手一点就对啦！',
      '猫头鹰都看呆啦！',
      '一个都没数错！',
    ],
    retry: [
      '答对啦！再试一次就成功啦！',
      '坚持就是胜利！',
      '你看，多试就能做到！',
      '进步啦！',
    ],
    encourage: [
      '没关系，再数一次嘛',
      '别急，慢慢来',
      '再仔细看看哦',
      '你可以的，再试试',
    ],
    // 连对庆祝（连续 3 个金星）
    streak: [
      '哇哇哇！连对啦，太厉害啦！',
      '猫头鹰飞过来给你鼓掌！',
      '太棒啦！我们继续！',
      '你好厉害，像小超人一样！',
      '哇！我都想跟你学啦！',
      '连对啦连对啦！继续冲！',
      '哗——！又答对啦！',
    ],
    // 大庆祝（连续 5 个金星）
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

  // ================= 题目生成（纯函数，供单测） =================
  // level: 自适应难度档 0..2，叠加在轮次基础难度上
  function countQuestion(round, level) {
    const lv = level || 0;
    const n = clamp(3 + Math.floor((round - 1) * 0.9) + randInt(0, 1) + lv, 3, 12);
    const cands = [n - 1, n + 1, n - 2, n + 2].filter((x) => x !== n && x >= 1 && x <= 15);
    const distractors = shuffle(cands).slice(0, 2);
    const options = shuffle([n, distractors[0], distractors[1]]);
    return {
      kind: 'count',
      items: n,
      frame: makeTenFrame(n),
      emoji: EMOJIS[randInt(0, EMOJIS.length - 1)],
      options: options,
      answerIndex: options.indexOf(n),
      prompt: '数一数，有几个？',
    };
  }

  function compareQuestion(round, level) {
    const lv = level || 0;
    const maxVal = clamp((round <= 3 ? 5 : round <= 7 ? 10 : 15) + lv * 3, 3, 18);
    let a = randInt(1, maxVal);
    let b = randInt(1, maxVal);
    while (b === a) b = randInt(1, maxVal);
    const askBigger = round <= 5;
    const answerKey = askBigger ? (a > b ? 'left' : 'right') : (a < b ? 'left' : 'right');
    return {
      kind: 'compare',
      a: a,
      b: b,
      askBigger: askBigger,
      answerKey: answerKey,
      prompt: askBigger ? '哪个更大？' : '哪个更小？',
    };
  }

  // 十格阵：5 个一行、最多 10 个；n<=5 一行，n>5 两行（支持"5 加几"策略）
  function makeTenFrame(n) {
    const cells = [];
    for (let i = 0; i < 10; i++) cells.push(i < n);
    return { filled: n, cells: cells };
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
      countQuestion: countQuestion,
      compareQuestion: compareQuestion,
      makeTenFrame: makeTenFrame,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ================= 语音播报（优先 base64 可爱语音包，缺失回退 Web Speech；见 js/voice.js） =================
  const voice = global.__mtVoice;

  // 逐个数 1..n（"共同数"脚手架）
  function speakCount(n) {
    if (!voice || !voice.isSoundOn()) return;
    for (let i = 1; i <= n; i++) {
      setTimeout(() => voice.play(String(i), 0.8), (i - 1) * 700);
    }
  }

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

  function soundCorrect() { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.18); tone(1046, 0.3, 0.28); } // 上行琶音 C-E-G-C，更欢快
  function soundWrong() { tone(220, 0, 0.25); }

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
    streak: 0, // 连续一次答对次数（猫头鹰分级庆祝）
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

    if (q.kind === 'count') {
      const cellsHtml = q.frame.cells
        .map((filled) => `<span class="tf-cell${filled ? '' : ' tf-empty'}">${filled ? q.emoji : ''}</span>`)
        .join('');
      elArea.innerHTML = `<div class="tf-grid">${cellsHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn" data-val="${v}">${v}</button>`)
        .join('');
    } else {
      const mkCard = (val, side) => `
        <button class="cmp-card" data-side="${side}">
          <span class="cmp-num">${val}</span>
          <span class="cmp-dots">${'●'.repeat(val)}</span>
        </button>`;
      elArea.innerHTML = `<div class="cmp-row">${mkCard(q.a, 'left')}${mkCard(q.b, 'right')}</div>`;
      $('options').innerHTML = '';
    }

    $('round-info').textContent = `第 ${state.round} / ${TOTAL_ROUNDS} 题`;
    $('score-info').textContent = `⭐ ${state.gold}`;
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
      $('score-info').textContent = `⭐ ${state.gold}`;
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
    state.streak = 0;
    state.startTs = Date.now();
    $('mode-title').textContent = mode === 'count' ? '数一数' : '比一比';
    // 猫头鹰开场打招呼
    if (global.__mtOwl) {
      global.__mtOwl.flyIn('wave');
      global.__mtOwl.say('开始啦，我们一起玩吧！', 1600);
    }
    nextQuestion();
    showScreen('game');
  }

  function nextQuestion() {
    state.question = state.mode === 'count'
      ? countQuestion(state.round, state.level)
      : compareQuestion(state.round, state.level);
    // 猫头鹰安静回到左下角（庆祝完不挡答题区）
    if (global.__mtOwl) global.__mtOwl.flyIn('idle');
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    const q = state.question;
    const correct = q.kind === 'count'
      ? payload.val === q.items
      : payload.side === q.answerKey;

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
    if (firstTry) { state.gold++; state.streak++; } else { state.silver++; state.streak = 0; }
    state.results.push(firstTry);

    // 表扬语按连对级别升级：连对 5+ 大庆祝 → 连对 3+ 惊喜 → 普通
    const phrase = !firstTry ? pickPhrase(PHRASES.retry)
      : state.streak >= 5 ? pickPhrase(PHRASES.huge)
      : state.streak >= 3 ? pickPhrase(PHRASES.streak)
      : pickPhrase(PHRASES.firstTry);
    showFeedback(true, phrase);
    speak(phrase);
    soundCorrect();
    // 猫头鹰按表现分级活动：连对 5+ 飞到屏幕中间撒星星，连对 3+ 飞到中间，其余攒 3 金星角落庆祝
    let celebrate = false;
    if (global.__mtOwl) {
      if (state.streak >= 5) { global.__mtOwl.flyIn('huge'); celebrate = true; }
      else if (state.streak >= 3) { global.__mtOwl.flyIn('big'); celebrate = true; }
      else if (state.gold >= 3 && state.gold % 3 === 0) global.__mtOwl.flyIn('cheer');
    }
    // 连对庆祝时放慢节奏，等猫头鹰扑腾飞完、表扬语音播完再进下一题
    setTimeout(advance, celebrate ? 2200 : 1100);
  }

  function resolveWrong() {
    state.locked = true;
    stopSpeak();
    state.attempts++;
    state.streak = 0; // 连对中断
    const q = state.question;
    showFeedback(false, pickPhrase(PHRASES.encourage));
    soundWrong();

    if (state.attempts === 1) {
      // 第 1 次答错：给提示，留在本题；猫头鹰偶尔出来陪着
      if (global.__mtOwl && Math.random() < 0.4) global.__mtOwl.flyIn('encourage');
      showHint(q.kind === 'count'
        ? '提示：从左边开始，一个一个慢慢数'
        : '提示：数一数每边的圆点，哪边多？');
      setTimeout(() => { state.locked = false; }, 900);
    } else if (state.attempts === 2) {
      // 第 2 次答错：共同数（语音逐个数）或再提示
      if (q.kind === 'count') {
        showHint('跟着我一起数：');
        speakCount(q.items);
      } else {
        showHint('再数一次圆点，比比看');
        speak('再数一次，比比看');
      }
      setTimeout(() => { state.locked = false; }, 1600);
    } else {
      // 第 3 次答错：温柔揭晓，记入"一起完成"，不批评
      state.helped++;
      state.results.push(false);
      const revealText = q.kind === 'count'
        ? `是 ${q.items} 个，我们一起记住它`
        : `答案是 ${q.answerKey === 'left' ? q.a : q.b}，记住它的样子`;
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
    // 猫头鹰结算登场：全对星星雨大庆祝，其余鼓劲
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

  // 学习记录：仅存本机浏览器
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
      const opt = e.target.closest('.opt-btn');
      if (opt) return answer({ val: Number(opt.dataset.val) });
      const card = e.target.closest('.cmp-card');
      if (card) return answer({ side: card.dataset.side });
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

  // 调试钩子：暴露内部状态供 E2E 断言（生产无害）
  global.__mtDebug = function () {
    const q = state.question || {};
    return {
      round: state.round,
      items: typeof q.items === 'number' ? q.items : null,
      a: typeof q.a === 'number' ? q.a : null,
      b: typeof q.b === 'number' ? q.b : null,
      askBigger: typeof q.askBigger === 'boolean' ? q.askBigger : null,
      answerKey: q.answerKey || null,
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
