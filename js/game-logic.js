/* ============================================
   Mathematical Thinking · 逻辑游戏（幼儿学习科学版）
   找规律 / 找不同 / 谁最高（推理）

   设计依据见 docs/设计说明-幼儿学习科学.md：
   - 找规律：模式识别（pattern recognition）是早期数学推理的核心能力
   - 找不同：分类（classification）——按类别/属性辨认异类
   - 谁最高：传递推理（transitive inference），皮亚杰经典任务，前运算期后期可完成
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
      '好厉害，继续加油！',
      '你越来越棒啦！',
      '小手一点就对啦！',
      '猫头鹰都看呆啦！',
      '规律被你发现啦！',
      '眼睛真尖！',
      '推理小能手！',
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

  // ================= 找规律（pattern recognition） =================
  const PATTERN_EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🐰', '🐱', '🌸', '🌈'];

  // 图案规律：ABAB / AABB（lv0）、ABC 循环（lv1+）
  // 显示 5 项，问第 6 项
  function patternEmojiQuestion(level) {
    const pool = shuffle(PATTERN_EMOJIS.slice());
    let seq;
    let answer;
    let hint2;
    if ((level || 0) === 0) {
      if (Math.random() < 0.5) {
        // ABAB: a b a b a -> b
        seq = [pool[0], pool[1], pool[0], pool[1], pool[0]];
        answer = pool[1];
        hint2 = '两个两个一组，跟着排';
      } else {
        // AABB: a a b b a -> a
        seq = [pool[0], pool[0], pool[1], pool[1], pool[0]];
        answer = pool[0];
        hint2 = '两个两个一组，跟着排';
      }
    } else {
      // ABC: a b c a b -> c
      seq = [pool[0], pool[1], pool[2], pool[0], pool[1]];
      answer = pool[2];
      hint2 = '三个一组，轮流排';
    }
    const distractors = pool.filter((e) => e !== answer).slice(0, 2);
    const options = shuffle([answer].concat(distractors));
    return {
      kind: 'pattern',
      sub: 'emoji',
      seq: seq,
      answer: answer,
      options: options,
      answerIndex: options.indexOf(answer),
      prompt: '找规律，下一个是什么？',
      hint1: '看看前面是怎么排的',
      hint2: hint2,
      reveal: '是' + answer + '，规律被你发现啦！',
      revealVoice: '是它，规律被你发现啦！',
    };
  }

  // 数字规律：等差递增 +1（lv0/1）、+2/+3（lv2）、递减 -2（lv2 部分）
  function patternNumQuestion(level) {
    const lv = level || 0;
    let seq;
    let ans;
    let step;
    let hint2;
    if (lv >= 2 && Math.random() < 0.4) {
      // 递减：10 8 6 4 -> 2
      seq = [10, 8, 6, 4];
      ans = 2;
      step = -2;
      hint2 = '每次都少两个，想一想';
    } else if (lv >= 2 && Math.random() < 0.6) {
      step = 3; seq = [randInt(1, 2), 0, 0, 0]; ans = 0;
      seq = [seq[0], seq[0] + step, seq[0] + 2 * step, seq[0] + 3 * step];
      ans = seq[0] + 4 * step;
      hint2 = '每次都加三，想一想';
    } else if (lv >= 1 && Math.random() < 0.6) {
      step = 2; seq = [randInt(1, 3), 0, 0, 0]; ans = 0;
      seq = [seq[0], seq[0] + step, seq[0] + 2 * step, seq[0] + 3 * step];
      ans = seq[0] + 4 * step;
      hint2 = '每次都加二，想一想';
    } else {
      step = 1; seq = [randInt(1, 4), 0, 0, 0]; ans = 0;
      seq = [seq[0], seq[0] + step, seq[0] + 2 * step, seq[0] + 3 * step];
      ans = seq[0] + 4 * step;
      hint2 = '每次都加一，想一想';
    }
    const cands = [...new Set([ans + step, ans - step, ans + 1, ans - 1])].filter((x) => x !== ans && x > 0 && x <= 15);
    const distractors = shuffle(cands).slice(0, 2);
    const options = shuffle([ans].concat(distractors));
    return {
      kind: 'pattern',
      sub: 'num',
      seq: seq,
      answer: ans,
      options: options,
      answerIndex: options.indexOf(ans),
      prompt: '找规律，下一个是什么？',
      hint1: '每个都比前面多几个？',
      hint2: hint2,
      reveal: '是 ' + ans + '，规律被你发现啦！',
    };
  }

  function patternQuestion(round, level) {
    const lv = level || 0;
    // lv0 纯图案；lv1 图案为主、数字渐入；lv2 图案/数字混合
    if (lv === 0) return patternEmojiQuestion(0);
    if (lv === 1) return Math.random() < 0.7 ? patternEmojiQuestion(1) : patternNumQuestion(1);
    return Math.random() < 0.4 ? patternEmojiQuestion(1) : patternNumQuestion(2);
  }

  // ================= 找不同（classification） =================
  const ODD_GROUPS = {
    fruit: ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒'],
    veg: ['🥕', '🥦', '🌽', '🍅'],
    animal: ['🐰', '🐱', '🐶', '🐷'],
    bird: ['🐦', '🐤', '🦆', '🐔'],
    water: ['🐟', '🐬', '🦈', '🐙'],
    bug: ['🐝', '🦋', '🐞', '🐜'],
    vehicle: ['🚗', '🚌', '🚜', '🚓'],
  };
  const ODD_ALL = Object.values(ODD_GROUPS).flat();

  // 取某组 3 个不同图案
  function pickThree(group) {
    return shuffle(group.slice()).slice(0, 3);
  }

  function oddQuestion(level) {
    const lv = level || 0;
    let items;

    if (lv >= 2 && Math.random() < 0.5) {
      // 同种找不同：3 个彩色 + 1 个灰色（属性分类，训练颜色观察）
      const emoji = ODD_ALL[randInt(0, ODD_ALL.length - 1)];
      items = [0, 1, 2, 3].map((i) => ({ emoji: emoji, gray: i === 3 }));
      const grayShuffled = shuffle(items);
      const grayIdx = grayShuffled.findIndex((x) => x.gray);
      return {
        kind: 'odd',
        sub: 'gray',
        items: grayShuffled,
        answerIndex: grayIdx,
        prompt: '哪一个不一样？',
        hint1: '找找哪一个和别的不一样',
        hint2: '看看它们的颜色',
        reveal: '它和别的不一样，我们一起记住它',
      };
    }

    // 跨类（lv0）：水果 vs 车/动物；近类（lv1）：水果 vs 蔬菜、动物 vs 虫子、鸟 vs 水里
    let main;
    let oddGroup;
    if (lv === 0) {
      const pair = [
        ['fruit', 'vehicle'], ['fruit', 'animal'], ['animal', 'vehicle'],
      ][randInt(0, 2)];
      main = pair[0];
      oddGroup = pair[1];
    } else {
      const pair = [
        ['fruit', 'veg'], ['animal', 'bug'], ['bird', 'water'],
      ][randInt(0, 2)];
      main = pair[0];
      oddGroup = pair[1];
    }
    const mainItems = pickThree(ODD_GROUPS[main]);
    const oddItem = ODD_GROUPS[oddGroup][randInt(0, ODD_GROUPS[oddGroup].length - 1)];
    items = mainItems.map((e) => ({ emoji: e, gray: false })).concat({ emoji: oddItem, gray: false });
    const shuffled = shuffle(items);
    const answerIndex = shuffled.findIndex((it) => it.emoji === oddItem);
    return {
      kind: 'odd',
      sub: 'group',
      category: main,
      oddCategory: oddGroup,
      items: shuffled,
      answerIndex: answerIndex,
      prompt: '哪一个不一样？',
      hint1: '找找哪一个和别的不一样',
      hint2: '它们是一家的吗？',
      reveal: '是' + oddItem + '，它和别的不一样，我们一起记住它',
      revealVoice: '它和别的不一样，我们一起记住它',
    };
  }

  // ================= 谁最高（transitive inference） =================
  // 固定句库：与 gen_voice.py 的 VOICES 生成逻辑完全一致（语音预合成，查表命中）
  // 每组 3 只动物 + 属性；轮转排列 [0,1,2]/[1,2,0]/[2,0,1] 让"最高者"轮流
  const INFER_GROUPS = [
    {
      attr: '高', maxWord: '高', minWord: '矮', qMax: '谁最高？', qMin: '谁最矮？', qMid: '谁在中间？',
      animals: [['小熊', '🐻'], ['小兔', '🐰'], ['小鸡', '🐔']],
    },
    {
      attr: '高', maxWord: '高', minWord: '矮', qMax: '谁最高？', qMin: '谁最矮？', qMid: '谁在中间？',
      animals: [['长颈鹿', '🦒'], ['大象', '🐘'], ['小猴', '🐵']],
    },
    {
      attr: '跑得快', maxWord: '快', minWord: '慢', qMax: '谁最快？', qMin: '谁最慢？', qMid: '谁在中间？',
      animals: [['小兔', '🐇'], ['乌龟', '🐢'], ['蜗牛', '🐌']],
    },
    {
      attr: '大', maxWord: '大', minWord: '小', qMax: '谁最大？', qMin: '谁最小？', qMid: '谁在中间？',
      animals: [['大象', '🐘'], ['小猪', '🐷'], ['小鸡', '🐔']],
    },
    {
      attr: '重', maxWord: '重', minWord: '轻', qMax: '谁最重？', qMin: '谁最轻？', qMid: '谁在中间？',
      animals: [['大象', '🐘'], ['奶牛', '🐮'], ['小猪', '🐷']],
    },
    {
      attr: '跑得快', maxWord: '快', minWord: '慢', qMax: '谁最快？', qMin: '谁最慢？', qMid: '谁在中间？',
      animals: [['小猫', '🐱'], ['小狗', '🐶'], ['小鸭', '🦆']],
    },
  ];
  const INFER_ROTATIONS = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];

  // 生成与语音包一致的句子文本（供单测交叉验证）
  function inferSentence(group, permIdx, ask) {
    const perm = INFER_ROTATIONS[permIdx];
    const [A, B, C] = perm.map((i) => group.animals[i]);
    const question = ask === 0 ? group.qMax : ask === 1 ? group.qMin : group.qMid;
    return A[0] + '比' + B[0] + group.attr + '，' + B[0] + '比' + C[0] + group.attr + '，' + question;
  }

  // 语音包里的完整句子集合（供单测：出题器生成的句子必须全部命中）
  function inferVoiceSet() {
    const set = [];
    INFER_GROUPS.forEach((g) => {
      for (let p = 0; p < 3; p++) {
        for (let a = 0; a < 3; a++) {
          set.push(inferSentence(g, p, a));
        }
      }
    });
    return set;
  }

  function inferQuestion(round, level) {
    const lv = level || 0;
    const group = INFER_GROUPS[randInt(0, INFER_GROUPS.length - 1)];
    const permIdx = randInt(0, 2);
    // lv0 正向（谁最高/最快）；lv1 反向（谁最矮/最慢）；lv2 混合含"谁在中间"
    const ask = lv === 0 ? 0 : lv === 1 ? 1 : randInt(0, 2);
    const perm = INFER_ROTATIONS[permIdx];
    const [A, B, C] = perm.map((i) => group.animals[i]);
    const question = ask === 0 ? group.qMax : ask === 1 ? group.qMin : group.qMid;
    const sentence = A[0] + '比' + B[0] + group.attr + '，' + B[0] + '比' + C[0] + group.attr + '，' + question;
    const answerName = ask === 0 ? A[0] : ask === 1 ? C[0] : B[0];
    const answerEmoji = ask === 0 ? A[1] : ask === 1 ? C[1] : B[1];
    const animals = group.animals.map((a) => a[1]);
    const options = shuffle(animals);
    return {
      kind: 'infer',
      sentence: sentence,
      animals: animals,
      options: options,
      answerIndex: options.indexOf(answerEmoji),
      answerName: answerName,
      prompt: '仔细听，想一想',
      hint1: '想想谁比谁' + (group.attr === '跑得快' ? '快' : group.attr),
      hint2: '再听一遍条件，慢慢想',
      reveal: ask === 0 ? '答案是' + answerName + '，' + answerName + '最' + group.maxWord + '！'
        : ask === 1 ? '答案是' + answerName + '，' + answerName + '最' + group.minWord + '！'
        : '答案是' + answerName + '，' + answerName + '在中间！',
      // 揭晓语音走 reveal_infer_<动物名>（"答案是小熊"），文字补全
      revealVoice: '答案是' + answerName,
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
      patternEmojiQuestion: patternEmojiQuestion,
      patternNumQuestion: patternNumQuestion,
      patternQuestion: patternQuestion,
      oddQuestion: oddQuestion,
      inferQuestion: inferQuestion,
      inferSentence: inferSentence,
      inferVoiceSet: inferVoiceSet,
      pickPhrase: pickPhrase,
      adjustLevel: adjustLevel,
      buildSummary: buildSummary,
      PHRASES: PHRASES,
      INFER_GROUPS: INFER_GROUPS,
      ODD_GROUPS: ODD_GROUPS,
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

  const MODE_NAMES = { pattern: '找规律', odd: '找不同', infer: '谁最高' };

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

    if (q.kind === 'pattern') {
      // 序列格：已给出的项 + 问号格
      const cellsHtml = q.seq
        .map((v) => `<span class="pat-cell">${v}</span>`)
        .join('') + '<span class="pat-cell pat-cell-ask">❓</span>';
      elArea.innerHTML = `<div class="pat-seq">${cellsHtml}</div>`;
      $('options').innerHTML = q.options
        .map((v) => `<button class="opt-btn pat-opt" data-val="${v}">${v}</button>`)
        .join('');
    } else if (q.kind === 'odd') {
      // 4 个物品卡片（2×2），直接点
      elArea.innerHTML = '<div class="odd-grid">' + q.items
        .map((it, i) => `<button class="odd-btn${it.gray ? ' odd-gray' : ''}" data-idx="${i}">
          <span class="odd-emoji">${it.emoji}</span></button>`)
        .join('') + '</div>';
      $('options').innerHTML = '';
    } else {
      // infer：条件句 + 3 个动物按钮
      elArea.innerHTML = `<div class="inf-sentence">${q.sentence}</div>`;
      $('options').innerHTML = q.options
        .map((emoji) => `<button class="inf-animal-btn" data-emoji="${emoji}">
          <span class="inf-emoji">${emoji}</span></button>`)
        .join('');
      // 条件句播放语音（可爱语音包预合成）
      speak(q.sentence);
    }

    $('round-info').textContent = '第 ' + state.round + ' / ' + TOTAL_ROUNDS + ' 题';
    $('score-info').textContent = '⭐ ' + state.gold;
    $('progress-fill').style.width = ((state.round - 1) / TOTAL_ROUNDS) * 100 + '%';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';

    if (q.kind !== 'infer') speak(q.prompt);
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
    if (state.mode === 'pattern') {
      state.question = patternQuestion(state.round, state.level);
    } else if (state.mode === 'odd') {
      state.question = oddQuestion(state.level);
    } else {
      state.question = inferQuestion(state.round, state.level);
    }
    // 猫头鹰安静回到左下角（庆祝完不挡答题区）
    if (global.__mtOwl) global.__mtOwl.flyIn('idle');
    renderQuestion();
  }

  function answer(payload) {
    if (state.locked) return;
    const q = state.question;
    let correct;
    if (q.kind === 'pattern') {
      correct = String(payload.val) === String(q.answer);
    } else if (q.kind === 'odd') {
      correct = payload.idx === q.answerIndex;
    } else {
      correct = payload.emoji === q.options[q.answerIndex];
    }

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

  // 学习记录：仅存本机浏览器（与数感/几何共用 mt_sessions）
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
      const pat = e.target.closest('.pat-opt');
      if (pat) return answer({ val: pat.dataset.val });
      const odd = e.target.closest('.odd-btn');
      if (odd) return answer({ idx: Number(odd.dataset.idx) });
      const inf = e.target.closest('.inf-animal-btn');
      if (inf) return answer({ emoji: inf.dataset.emoji });
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
      sub: q.sub || null,
      seq: q.seq || null,
      options: q.options || [],
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : null,
      answer: q.answer !== undefined ? q.answer : (q.answerName || null),
      sentence: q.sentence || null,
      items: q.items || null,
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
