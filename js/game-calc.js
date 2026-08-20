/* ============================================
   Mathematical Thinking · 计算游戏（幼儿学习科学版）
   加法（合起来一共有几个）/ 减法（拿走一些还剩几个）

   设计依据见 docs/设计说明-幼儿学习科学.md：
   - 皮亚杰具体形象思维：全部题目用具体图案呈现数量，直观可数
   - 布鲁纳表征层次：图案（图像层）→ 数字选项（符号层），同一数量两种表征同时出现
   - 计数策略（count-all → count-on）：加法先合起来数，再引导从大数接着数
   - 答错不批评：鼓励 → 提示 → 温柔揭晓（脚手架阶梯）
   - 金星（一次答对）/ 银星（重试答对）双轨奖励
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

  const TOTAL_ROUNDS = 10;

  // ================= 表扬与鼓励语库（过程导向 · 成长型思维） =================
  const PHRASES = {
    firstTry: [
      '太棒啦，一次就答对！',
      '你真认真！',
      '我看到了你的努力！',
      '算得又快又准！',
      '好厉害，继续加油！',
      '你越来越棒啦！',
      '小手一点就对啦！',
      '猫头鹰都看呆啦！',
      '口算小达人！',
      '算得真清楚！',
    ],
    retry: [
      '答对啦！再试一次就成功啦！',
      '坚持就是胜利！',
      '你看，多试就能做到！',
      '进步啦！',
    ],
    encourage: [
      '没关系，再算一次嘛',
      '没关系，再想想嘛',
      '别急，慢慢算',
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

  // ================= 题目图案池 =================
  const CALC_EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🍑', '🍉', '🍒', '🥕', '🌸', '🌈', '🐰', '🐱', '🦋', '⚽', '🎈', '⭐'];

  // 生成 2 个干扰项：候选 = 答案±1/±2（兜底向外扩展），剔除非法值、答案与题目可见数（加数/被减数/减数）
  function pickDistractors(answer, exclude) {
    const cands = [];
    const ex = exclude || [];
    const push = (x) => {
      if (x >= 1 && x <= 20 && x !== answer && ex.indexOf(x) < 0 && cands.indexOf(x) < 0) cands.push(x);
    };
    push(answer - 1); push(answer + 1); push(answer - 2); push(answer + 2);
    for (let i = 3; cands.length < 2; i++) push(answer + i); // 兜底：候选不足时向外扩展
    return shuffle(cands).slice(0, 2);
  }

  // ================= 加法（count-all → count-on） =================
  // lv0: 和 ≤ 5（两个加数 1..4）；lv1: 和 ≤ 10；lv2: 和 ≤ 15
  function addQuestion(round, level) {
    const lv = level || 0;
    const maxSum = lv === 0 ? 5 : lv === 1 ? 10 : 15;
    let a, b;
    // 低档时保证两个加数都不为 0（合起来数得清）
    if (lv === 0) {
      a = randInt(1, 4);
      b = randInt(1, Math.min(4, maxSum - a));
    } else {
      a = randInt(1, maxSum - 1);
      b = randInt(1, maxSum - a);
    }
    // 难度梯度：高阶题偶尔出现一个加数是 1 或 2（鼓励接着数，而不是从头数）
    const sum = a + b;
    const emojis = shuffle(CALC_EMOJIS.slice());
    const emojiA = emojis[0];
    const emojiB = emojis[1] === emojiA ? emojis[2] : emojis[1];
    const options = shuffle([sum].concat(pickDistractors(sum, [a, b])));
    return {
      kind: 'add',
      a: a,
      b: b,
      sum: sum,
      emojiA: emojiA,
      emojiB: emojiB,
      answer: sum,
      options: options,
      answerIndex: options.indexOf(sum),
      prompt: '一共有几个呀？',
      hint1: '把它们合起来，一起数一数',
      hint2: '从大的那边开始，接着往后数',
      reveal: '是 ' + sum + ' 个，我们一起记住它',
      revealVoice: '是 ' + sum + ' 个，我们一起记住它',
    };
  }

  // ================= 减法（拿走一部分，数剩下的） =================
  // lv0: 被减数 ≤ 5；lv1: ≤ 10；lv2: ≤ 15
  function subQuestion(round, level) {
    const lv = level || 0;
    const maxA = lv === 0 ? 5 : lv === 1 ? 10 : 15;
    const a = randInt(2, maxA);
    const b = randInt(1, a - 1);
    const diff = a - b;
    const emoji = CALC_EMOJIS[randInt(0, CALC_EMOJIS.length - 1)];
    // items: 前 (a-b) 个保留，后 b 个被划掉（拿走）
    const items = [];
    for (let i = 0; i < a; i++) items.push(emoji);
    const options = shuffle([diff].concat(pickDistractors(diff, [a, b])));
    return {
      kind: 'sub',
      a: a,
      b: b,
      diff: diff,
      emoji: emoji,
      items: items,
      removed: b,
      answer: diff,
      options: options,
      answerIndex: options.indexOf(diff),
      prompt: '还剩几个呀？',
      hint1: '数一数，没被划掉的还有几个',
      hint2: '划掉的不要数，只数剩下的',
      reveal: '还剩 ' + diff + ' 个，我们一起记住它',
      revealVoice: '还剩 ' + diff + ' 个，我们一起记住它',
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
      addQuestion: addQuestion,
      subQuestion: subQuestion,
      pickDistractors: pickDistractors,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      CALC_EMOJIS: CALC_EMOJIS,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ================= 语音播报（优先 base64 可爱语音包，缺失回退 Web Speech；见 js/voice.js） =================
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

  function soundCorrect() { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.18); tone(1046, 0.3, 0.28); } // 上行琶音 C-E-G-C
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

  const MODE_NAMES = { add: '加法', sub: '减法' };

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

    if (q.kind === 'add') {
      // 两组图案：左组 + 右组，中间 ➕ 分隔，支持"合起来数"
      // 注意：每个图案必须独立 span 包裹——连续 emoji 文本是不可断行"长单词"，
      // flex-wrap 无法在中间换行，数量多时会溢出虚线框（历史 bug，见 git log）
      const groupA = new Array(q.a).fill(`<span class="calc-item">${q.emojiA}</span>`).join('');
      const groupB = new Array(q.b).fill(`<span class="calc-item">${q.emojiB}</span>`).join('');
      elArea.innerHTML =
        `<div class="calc-groups">
           <div class="calc-group"><span class="calc-num">${q.a}</span>${groupA}</div>
           <span class="calc-plus">＋</span>
           <div class="calc-group"><span class="calc-num">${q.b}</span>${groupB}</div>
         </div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn calc-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else {
      // 减法：一排图案，后 b 个被划掉（拿走）
      const itemHtml = q.items
        .map((e, i) => `<span class="calc-item${i >= q.items.length - q.removed ? ' calc-removed' : ''}">${e}</span>`)
        .join('');
      elArea.innerHTML = `<div class="calc-row">${itemHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn calc-opt" data-val="${v}">${v}</button>`)
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
    $('mode-title').textContent = MODE_NAMES[mode] || mode;
    // 猫头鹰开场打招呼
    if (global.__mtOwl) {
      global.__mtOwl.flyIn('wave');
      global.__mtOwl.say('开始啦，我们一起玩吧！', 1600);
    }
    nextQuestion();
    showScreen('game');
  }

  function nextQuestion() {
    if (state.mode === 'add') {
      state.question = addQuestion(state.round, state.level);
    } else {
      state.question = subQuestion(state.round, state.level);
    }
    // 猫头鹰安静回到左下角（庆祝完不挡答题区）
    if (global.__mtOwl) global.__mtOwl.flyIn('idle');
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    const q = state.question;
    const correct = String(payload.val) === String(q.answer);

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
      // 第 1 次答错：提示，留在本题；猫头鹰偶尔出来陪着
      if (global.__mtOwl && Math.random() < 0.4) global.__mtOwl.flyIn('encourage');
      showHint('提示：' + q.hint1);
      speak(q.hint1);
      setTimeout(() => { state.locked = false; }, 1300);
    } else if (state.attempts === 2) {
      // 第 2 次答错：更强提示
      showHint('再想想：' + q.hint2);
      speak(q.hint2);
      setTimeout(() => { state.locked = false; }, 1600);
    } else {
      // 第 3 次答错：温柔揭晓，记入"一起完成"，不批评
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

  // 学习记录：仅存本机浏览器（与数感/几何/逻辑共用 mt_sessions）
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
      const opt = e.target.closest('.calc-opt');
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

  // 调试钩子：暴露内部状态供 E2E 断言（生产无害）
  global.__mtDebug = function () {
    const q = state.question || {};
    return {
      round: state.round,
      kind: q.kind || null,
      a: q.a !== undefined ? q.a : null,
      b: q.b !== undefined ? q.b : null,
      sum: q.sum !== undefined ? q.sum : null,
      diff: q.diff !== undefined ? q.diff : null,
      options: q.options || [],
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : null,
      answer: q.answer !== undefined ? q.answer : null,
      removed: q.removed !== undefined ? q.removed : null,
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
