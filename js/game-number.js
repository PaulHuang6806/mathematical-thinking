/* ============================================
   Mathematical Thinking · 数感游戏
   数一数 / 比一比
   题目生成器为纯函数（可被 Node 单测复用），
   浏览器环境通过 DOM 事件驱动游戏循环。
   ============================================ */
(function (global) {
  'use strict';

  // ---------- 工具 ----------
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

  // ---------- 题目生成（纯函数，供测试） ----------
  // 数一数：随机 3-12 个图案，3 个选项中挑出正确数量
  function countQuestion(round) {
    const n = clamp(3 + Math.floor((round - 1) * 0.9) + randInt(0, 1), 3, 12);
    const cands = [n - 1, n + 1, n - 2, n + 2].filter(
      (x) => x !== n && x >= 1 && x <= 15
    );
    const distractors = shuffle(cands).slice(0, 2);
    const options = shuffle([n, distractors[0], distractors[1]]);
    return {
      kind: 'count',
      items: n,
      emoji: EMOJIS[randInt(0, EMOJIS.length - 1)],
      options: options,
      answerIndex: options.indexOf(n),
      prompt: '数一数，有几个？',
    };
  }

  // 比一比：两数比大小，前 5 题问"更大"，后 5 题问"更小"
  function compareQuestion(round) {
    const maxVal = round <= 3 ? 5 : round <= 7 ? 10 : 15;
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

  // 供 Node 单测复用（浏览器中 module 不存在，无副作用）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      countQuestion: countQuestion,
      compareQuestion: compareQuestion,
      shuffle: shuffle,
      TOTAL_ROUNDS: TOTAL_ROUNDS,
    };
  }

  // ---------- 音效（WebAudio 合成，无需音频文件） ----------
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
    } catch (e) {
      /* 音效失败不影响游戏 */
    }
  }

  function soundCorrect() { tone(660, 0, 0.15); tone(880, 0.12, 0.2); }
  function soundWrong() { tone(220, 0, 0.25); }

  // ---------- 游戏状态与 UI（仅浏览器环境；Node 单测到此返回） ----------
  if (typeof document === 'undefined') return;

  const state = {
    mode: null,     // 'count' | 'compare'
    round: 0,
    score: 0,
    locked: false,
    question: null,
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    game: $('screen-game'),
    end: $('screen-end'),
  };

  // ---------- 渲染 ----------
  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
      screens[k].style.display = k === name ? 'block' : 'none';
    });
  }

  function renderQuestion() {
    const q = state.question;
    const elArea = $('question-area');
    $('q-prompt').textContent = q.prompt;

    if (q.kind === 'count') {
      const itemsHtml = Array.from({ length: q.items }, () => `<span class="item">${q.emoji}</span>`).join('');
      elArea.innerHTML = `<div class="items-grid">${itemsHtml}</div>`;
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
    $('score-info').textContent = `⭐ ${state.score}`;
    $('progress-fill').style.width = ((state.round - 1) / TOTAL_ROUNDS) * 100 + '%';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
  }

  function showFeedback(correct, detail) {
    const fb = $('feedback');
    if (correct) {
      state.score++;
      fb.textContent = '✅ ' + detail;
      fb.className = 'feedback fb-ok';
      $('score-info').textContent = `⭐ ${state.score}`;
    } else {
      fb.textContent = '❌ ' + detail;
      fb.className = 'feedback fb-err';
      const area = $('question-area');
      area.classList.add('shake');
      setTimeout(() => area.classList.remove('shake'), 400);
    }
  }

  function renderEnd() {
    const s = state.score;
    $('end-stars').textContent = '⭐'.repeat(s) + '☆'.repeat(TOTAL_ROUNDS - s);
    const msg =
      s === TOTAL_ROUNDS ? '完美！全部答对！🎉' :
      s >= 8 ? '太棒了！继续加油！' :
      s >= 6 ? '不错哦，再练练！' :
      '别灰心，再来一次！';
    $('end-msg').textContent = `得分 ${s} / ${TOTAL_ROUNDS}，${msg}`;
    showScreen('end');
  }

  // ---------- 流程 ----------
  function startMode(mode) {
    state.mode = mode;
    state.round = 1;
    state.score = 0;
    state.locked = false;
    $('mode-title').textContent = mode === 'count' ? '数一数' : '比一比';
    nextQuestion();
    showScreen('game');
  }

  function nextQuestion() {
    state.question =
      state.mode === 'count' ? countQuestion(state.round) : compareQuestion(state.round);
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    state.locked = true;
    const q = state.question;
    let correct = false;

    if (q.kind === 'count') {
      correct = payload.val === q.items;
      if (correct) soundCorrect(); else soundWrong();
      showFeedback(correct, correct ? `是 ${q.items} 个！` : `是 ${q.items} 个，再数一次`);
    } else {
      correct = payload.side === q.answerKey;
      if (correct) soundCorrect(); else soundWrong();
      const rightVal = q.answerKey === 'left' ? q.a : q.b;
      showFeedback(correct, correct ? '答对啦！' : `答案是 ${rightVal}`);
    }

    setTimeout(() => {
      state.locked = false;
      state.round++;
      if (state.round > TOTAL_ROUNDS) {
        renderEnd();
      } else {
        nextQuestion();
      }
    }, correct ? 900 : 1400);
  }

  // ---------- 事件绑定 ----------
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

    $('btn-again').addEventListener('click', () => startMode(state.mode));
    $('btn-menu').addEventListener('click', () => showScreen('start'));
  }

  // ---------- 启动 ----------
  document.addEventListener('DOMContentLoaded', () => {
    bind();
    showScreen('start');
  });

})(typeof window !== 'undefined' ? window : globalThis);
