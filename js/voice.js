/* ============================================
   Mathematical Thinking · 语音播放器
   优先播放 voice-data.js 里的 base64 可爱语音包（任何协议可播、断网可用），
   缺失文本回退 Web Speech（系统 TTS）。
   API: window.__mtVoice = { play(text, rate), stop(), setSound(on), isSoundOn() }
   ============================================ */
(function (global) {
  'use strict';

  const DATA = global.__VOICE_DATA__ || {};

  let soundOn = true;
  try { soundOn = localStorage.getItem('mt_sound') !== '0'; } catch (e) { /* 忽略 */ }

  let curAudio = null;

  // ---------- Web Speech 回退 ----------
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

  function speakFallback(text, rate) {
    if (!('speechSynthesis' in global)) return;
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

  // ---------- 主入口 ----------
  function play(text, rate) {
    if (!soundOn || !text) return;
    const uri = DATA[text];
    if (uri) {
      try {
        if (curAudio) { curAudio.pause(); curAudio = null; }
        const a = new Audio(uri);
        const p = a.play();
        if (p && p.catch) p.catch(() => speakFallback(text, rate));
        curAudio = a;
        a.onended = function () { if (curAudio === a) curAudio = null; };
        return;
      } catch (e) { /* 回退到 Web Speech */ }
    }
    speakFallback(text, rate);
  }

  function stop() {
    try { if (curAudio) { curAudio.pause(); curAudio = null; } } catch (e) { /* 忽略 */ }
    try { if ('speechSynthesis' in global) global.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
  }

  function setSound(on) {
    soundOn = !!on;
    if (!soundOn) stop();
  }

  function isSoundOn() {
    return soundOn;
  }

  global.__mtVoice = {
    play: play,
    stop: stop,
    setSound: setSound,
    isSoundOn: isSoundOn,
  };
})(typeof window !== 'undefined' ? window : globalThis);
