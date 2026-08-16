/* ============================================
   Mathematical Thinking · 数与运算馆（幼儿学习科学版）
   依据《幼小衔接数学游戏盒》绿色牌 L2/L3 设计（见 docs/数学游戏盒数字化设计方案.md）：
   相邻数 / 单数双数 / 凑十（清十）/ 群数 / 认识人民币 / 缺了几（数序）/ 代数推理

   设计原则：
   - L2 半抽象：相邻数、奇偶、凑十（十格阵）、群数、数序填空
   - L3 抽象推理：人民币换算、等量代换（水果等式）
   - 具体形象：十格阵/圆点/纸币卡片全部图形化
   - 答错不批评：鼓励 → 提示 → 温柔揭晓（脚手架阶梯）
   - 金星银星双轨 + 难度自适应 + 语音播报 + 学习记录本地保存
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
      '算得真清楚！',
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

  // ================= 相邻数（L2） =================
  function neighborQuestion() {
    const n = randInt(2, 19);
    const askBefore = Math.random() < 0.5;
    const answer = askBefore ? n - 1 : n + 1;
    const pool = [];
    for (let i = 1; i <= 20; i++) pool.push(i);
    const options = shuffle([answer].concat(pickDistractors(answer, pool, 3)));
    return {
      kind: 'neighbor',
      num: n,
      askBefore: askBefore,
      answer: answer,
      options: options,
      answerIndex: options.indexOf(answer),
      prompt: n + ' 的邻居，' + (askBefore ? '前面' : '后面') + '是几？',
      promptVoice: '想一想，它的邻居是几？',
      hint1: '比它小 1 的是前面的邻居',
      hint2: '按顺序数一数，它旁边是谁',
      reveal: (askBefore ? '前面' : '后面') + '是 ' + answer + '，它们是邻居！',
      revealVoice: '真棒！',
    };
  }

  // ================= 单数双数（L2） =================
  function oddEvenQuestion() {
    const n = randInt(1, 20);
    const isOdd = n % 2 === 1;
    const options = shuffle(['单数', '双数']);
    return {
      kind: 'oddEven',
      num: n,
      answer: isOdd ? '单数' : '双数',
      options: options,
      answerIndex: options.indexOf(isOdd ? '单数' : '双数'),
      prompt: n + ' 是单数还是双数？',
      promptVoice: '是单数还是双数？',
      hint1: '两个两个配成对，配得完的是双数',
      hint2: '剩下一个，孤零零的是单数',
      reveal: n + ' 是' + (isOdd ? '单数' : '双数') + '，我们一起记住它',
      revealVoice: (isOdd ? '单数' : '双数') + '，真棒！',
    };
  }

  // ================= 凑十 / 清十（L2） =================
  function makeTenQuestion() {
    const n = randInt(3, 9);
    const need = 10 - n;
    const pool = [];
    for (let i = 1; i <= 9; i++) pool.push(i);
    const options = shuffle([need].concat(pickDistractors(need, pool, 3)));
    return {
      kind: 'makeTen',
      num: n,
      need: need,
      answer: need,
      options: options,
      answerIndex: options.indexOf(need),
      prompt: '还需要几个，凑成 10？',
      hint1: '看看十格阵，空着几格',
      hint2: '一格一格数空着的格子',
      reveal: '再放 ' + need + ' 个，就是 10 个啦！',
      revealVoice: '再放 ' + need + ' 个，就是 10 个啦！',
    };
  }

  // ================= 群数（L2） =================
  // 2-3 组，每组 5 个（或 10 个），按群计数
  const GROUP_EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🐰', '⭐', '🌸', '🎈'];

  function groupCountQuestion() {
    const groupSize = Math.random() < 0.5 ? 5 : 10;
    const groups = randInt(2, 3);
    const emoji = GROUP_EMOJIS[randInt(0, GROUP_EMOJIS.length - 1)];
    const total = groupSize * groups;
    const pool = [];
    for (let i = 1; i <= 30; i++) pool.push(i);
    const options = shuffle([total].concat(pickDistractors(total, pool, 3)));
    return {
      kind: 'groupCount',
      groupSize: groupSize,
      groups: groups,
      emoji: emoji,
      total: total,
      answer: total,
      options: options,
      answerIndex: options.indexOf(total),
      prompt: '数一数，一共有几个？',
      promptVoice: '按群数一数，一共有几个？',
      hint1: groupSize + ' 个一组，数一数有几组',
      hint2: '一组 ' + groupSize + ' 个，' + groups + ' 组就是 ' + groupSize + '、' + (groupSize * 2) + '…',
      hint2Voice: '一组一组接着数',
      reveal: '一共有 ' + total + ' 个，按群数真快！',
      revealVoice: '一共有 ' + total + ' 个，真棒！',
    };
  }

  // ================= 认识人民币（L3） =================
  // 纸币面额：1 元 / 5 元 / 10 元，问一共多少钱
  function moneyQuestion() {
    const bills = [];
    const n10 = randInt(0, 2), n5 = randInt(0, 2), n1 = randInt(0, 4);
    if (n10) bills.push({ v: 10, cls: 'ten', n: n10 });
    if (n5) bills.push({ v: 5, cls: 'five', n: n5 });
    if (n1) bills.push({ v: 1, cls: 'one', n: n1 });
    // 保证至少 2 张纸币且总和 2-20
    const total = n10 * 10 + n5 * 5 + n1;
    if (bills.length < 2 || total < 3 || total > 20) return moneyQuestion();
    const pool = [];
    for (let i = 2; i <= 20; i++) pool.push(i);
    const options = shuffle([total].concat(pickDistractors(total, pool, 3)));
    return {
      kind: 'money',
      bills: bills,
      total: total,
      answer: total,
      options: options,
      answerIndex: options.indexOf(total),
      prompt: '一共多少钱？',
      hint1: '把纸币加起来数一数',
      hint2: '10 元、5 元、1 元，加在一起',
      reveal: '一共 ' + total + ' 元！',
      revealVoice: '一共 ' + total + ' 元，真棒！',
    };
  }

  // ================= 缺了几（数序填空 L2） =================
  // 3x3 数字表（连续数字），缺 1 个
  function missingQuestion() {
    const start = randInt(1, 10); // 起始数字
    const cells = [];
    for (let i = 0; i < 9; i++) cells.push(start + i);
    const missingIdx = randInt(0, 8);
    const missingVal = cells[missingIdx];
    const pool = [];
    for (let i = 1; i <= 20; i++) pool.push(i);
    const options = shuffle([missingVal].concat(pickDistractors(missingVal, pool, 3)));
    return {
      kind: 'missing',
      start: start,
      cells: cells,
      missingIdx: missingIdx,
      missingVal: missingVal,
      answer: missingVal,
      options: options,
      answerIndex: options.indexOf(missingVal),
      prompt: '缺了哪个数字？',
      hint1: '按顺序数一数',
      hint2: '看看哪一行断开了',
      reveal: '缺了 ' + missingVal + '，数数要按顺序哦！',
      revealVoice: '缺了 ' + missingVal + '，真棒！',
    };
  }

  // ================= 代数推理（L3） =================
  // 🍎 + 🍎 = 6，🍎 = 几？（等量代换）
  const ALG_EMOJIS = ['🍎', '🍊', '🍇', '⭐'];

  function algebraQuestion() {
    const val = randInt(2, 6);
    const double = val * 2;
    const emoji = ALG_EMOJIS[randInt(0, ALG_EMOJIS.length - 1)];
    const pool = [];
    for (let i = 1; i <= 10; i++) pool.push(i);
    const options = shuffle([val].concat(pickDistractors(val, pool, 3)));
    return {
      kind: 'algebra',
      val: val,
      double: double,
      emoji: emoji,
      answer: val,
      options: options,
      answerIndex: options.indexOf(val),
      prompt: emoji + ' + ' + emoji + ' = ' + double + '，' + emoji + ' = 几？',
      promptVoice: '想一想，它等于几？',
      hint1: '两个一样的合起来是 ' + double,
      hint1Voice: '两个一样的合起来是几',
      hint2: '把它分成两份，每份是几',
      reveal: emoji + ' = ' + val + '，两个合起来正好是 ' + double + '！',
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
      neighborQuestion: neighborQuestion,
      oddEvenQuestion: oddEvenQuestion,
      makeTenQuestion: makeTenQuestion,
      groupCountQuestion: groupCountQuestion,
      moneyQuestion: moneyQuestion,
      missingQuestion: missingQuestion,
      algebraQuestion: algebraQuestion,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
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
  function tenFrameHtml(filled) {
    let html = '<div class="nh-frame">';
    for (let i = 0; i < 10; i++) {
      html += `<span class="nh-cell${i < filled ? ' nh-filled' : ''}"></span>`;
    }
    return html + '</div>';
  }

  function dotsHtml(n) {
    let html = '<div class="nh-dots">';
    for (let i = 0; i < n; i++) html += '<span class="nh-dot">●</span>';
    return html + '</div>';
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
    neighbor: '相邻数', oddEven: '单数双数', makeTen: '凑成 10',
    groupCount: '按群数', money: '认识人民币', missing: '缺了几', algebra: '代数推理',
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

    if (q.kind === 'neighbor') {
      elArea.innerHTML = `<div class="nh-bignum">${q.num}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'oddEven') {
      elArea.innerHTML = `<div class="nh-bignum">${q.num}</div>${dotsHtml(q.num)}`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'makeTen') {
      elArea.innerHTML = tenFrameHtml(q.num);
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}个</button>`)
        .join('');
    } else if (q.kind === 'groupCount') {
      const groupHtml = new Array(q.groups).fill(
        `<div class="nh-group"><span class="nh-group-tag">${q.groupSize} 个一组</span>${new Array(q.groupSize).fill(`<span class="nh-group-emoji">${q.emoji}</span>`).join('')}</div>`
      ).join('');
      elArea.innerHTML = `<div class="nh-groups">${groupHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'money') {
      let billsHtml = '';
      q.bills.forEach((b) => {
        for (let i = 0; i < b.n; i++) {
          billsHtml += `<span class="nh-bill nh-bill-${b.cls}">${b.v}元</span>`;
        }
      });
      elArea.innerHTML = `<div class="nh-bills">${billsHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}元</button>`)
        .join('');
    } else if (q.kind === 'missing') {
      let gridHtml = '';
      for (let i = 0; i < 9; i++) {
        gridHtml += `<span class="nh-mcell${i === q.missingIdx ? ' nh-missing' : ''}">${i === q.missingIdx ? '❓' : q.cells[i]}</span>`;
      }
      elArea.innerHTML = `<div class="nh-mgrid">${gridHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'algebra') {
      elArea.innerHTML =
        `<div class="nh-algebra"><span class="nh-alg-emoji">${q.emoji}</span><span class="nh-alg-op">+</span><span class="nh-alg-emoji">${q.emoji}</span><span class="nh-alg-op">=</span><span class="nh-alg-num">${q.double}</span></div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn nh-opt" data-val="${v}">${v}</button>`)
        .join('');
    }

    $('round-info').textContent = '第 ' + state.round + ' / ' + TOTAL_ROUNDS + ' 题';
    $('score-info').textContent = '⭐ ' + state.gold;
    $('progress-fill').style.width = ((state.round - 1) / TOTAL_ROUNDS) * 100 + '%';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';

    speak(q.promptVoice || q.prompt);
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
      case 'neighbor': state.question = neighborQuestion(); break;
      case 'oddEven': state.question = oddEvenQuestion(); break;
      case 'makeTen': state.question = makeTenQuestion(); break;
      case 'groupCount': state.question = groupCountQuestion(); break;
      case 'money': state.question = moneyQuestion(); break;
      case 'missing': state.question = missingQuestion(); break;
      default: state.question = algebraQuestion();
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
      const opt = e.target.closest('.nh-opt');
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
