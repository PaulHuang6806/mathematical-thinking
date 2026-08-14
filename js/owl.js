/* ============================================
   Mathematical Thinking · 猫头鹰吉祥物
   纯 SVG 手绘 + CSS 动画，零图片零依赖。
   时机由游戏 JS 显式调用：
     flyIn('wave')      开局打招呼（左侧飞入，挥翅膀）
     flyIn('cheer')     答对庆祝（飞入+落地弹跳+扇翅）
     flyIn('encourage') 答错陪伴（角落出现，歪头，不打扰）
     flyIn('perfect')   全对大庆祝（飞入+星星雨+语音）
     flyIn('end')       结算登场（飞入+弹跳）
     say(text, delayMs) 延迟后播语音（复用 voice.js 语音包）
   API: window.__mtOwl
   ============================================ */
(function (global) {
  'use strict';

  // ---------- 猫头鹰 SVG（手绘可爱风） ----------
  function owlSvg() {
    return `
    <svg viewBox="0 0 120 130" width="110" height="119" aria-hidden="true">
      <g>
        <path class="owl-wing-back" d="M18 62 Q2 78 14 98 Q28 84 34 72 Z" fill="#7A5C40"/>
        <ellipse cx="60" cy="76" rx="40" ry="44" fill="#A9825F"/>
        <ellipse cx="60" cy="90" rx="27" ry="30" fill="#F5E9D7"/>
        <path d="M46 116 L54 130 L66 116 Z" fill="#7A5C40"/>
        <ellipse cx="60" cy="50" rx="27" ry="23" fill="#FDF6EC"/>
        <g class="owl-eye">
          <circle cx="47" cy="50" r="11" fill="#fff" stroke="#4A3628" stroke-width="2.5"/>
          <circle cx="49" cy="51" r="5.5" fill="#3A2A1C"/>
          <circle cx="51" cy="48" r="2" fill="#fff"/>
        </g>
        <g class="owl-eye">
          <circle cx="73" cy="50" r="11" fill="#fff" stroke="#4A3628" stroke-width="2.5"/>
          <circle cx="75" cy="51" r="5.5" fill="#3A2A1C"/>
          <circle cx="77" cy="48" r="2" fill="#fff"/>
        </g>
        <path class="owl-beak" d="M55 62 L65 62 L60 73 Z" fill="#F2A33C"/>
        <circle cx="35" cy="62" r="5.5" fill="#F6B8A0" opacity="0.85"/>
        <circle cx="85" cy="62" r="5.5" fill="#F6B8A0" opacity="0.85"/>
        <path class="owl-wing" d="M92 64 Q112 72 106 96 Q94 92 86 80 Z" fill="#8B6B4A"/>
      </g>
    </svg>`;
  }

  // ---------- 星星雨（庆祝用） ----------
  function confettiHtml(n) {
    const stars = [];
    const emojis = ['⭐', '🌟', '✨', '💛'];
    for (let i = 0; i < n; i++) {
      const left = 5 + Math.random() * 90;
      const delay = (Math.random() * 0.6).toFixed(2);
      const dur = (1.6 + Math.random() * 1.4).toFixed(2);
      const size = 14 + Math.random() * 18;
      stars.push(`<span class="owl-confetti" style="left:${left.toFixed(1)}%;font-size:${size.toFixed(0)}px;animation-delay:${delay}s;animation-duration:${dur}s">${emojis[i % emojis.length]}</span>`);
    }
    return stars.join('');
  }

  // ---------- 舞台管理 ----------
  let stage = null;
  let bird = null;
  let confettiBox = null;
  let speechTimer = null;

  function ensureStage() {
    if (stage) return;
    stage = document.createElement('div');
    stage.id = 'owl-stage';
    stage.className = 'owl-stage owl-hidden';
    stage.innerHTML = `<div class="owl-bird">${owlSvg()}</div><div class="owl-confetti-box"></div>`;
    document.body.appendChild(stage);
    bird = stage.querySelector('.owl-bird');
    confettiBox = stage.querySelector('.owl-confetti-box');
  }

  function clearAnim() {
    if (!bird) return;
    bird.className = 'owl-bird';
    stage.classList.remove('owl-fly-in');
    stage.classList.remove('owl-bounce');
    stage.classList.remove('owl-bounce-center');
    stage.classList.remove('owl-bounce-center-perfect');
    stage.classList.remove('owl-center'); // 从屏幕中间滑回左下角
    stage.classList.remove('owl-center-perfect');
    stage.classList.remove('owl-hidden');
  }

  function flyIn(pose) {
    if (typeof document === 'undefined') return;
    ensureStage();
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    clearAnim();
    if (pose === 'idle') return; // 安静回到左下角蹲着，不打扰
    // 挥翅膀 vs 扇翅
    bird.classList.remove('owl-flap');
    if (pose === 'cheer' || pose === 'big' || pose === 'huge' || pose === 'perfect') bird.classList.add('owl-flap');
    // 歪头（答错陪伴）
    bird.classList.toggle('owl-tilt', pose === 'encourage');
    stage.classList.add('owl-fly-in');
    if (pose === 'cheer' || pose === 'end') {
      setTimeout(() => stage.classList.add('owl-bounce'), 650);
    }
    if (pose === 'big' || pose === 'huge' || pose === 'perfect') {
      // 先飞入角落，再滑翔到屏幕中间（结算用大版，局中用小版避免挡选项）
      setTimeout(() => flyToCenter(pose === 'perfect'), 480);
    }
    if (pose === 'huge' || pose === 'perfect') {
      setTimeout(() => {
        confettiBox.innerHTML = confettiHtml(pose === 'perfect' ? 14 : 6);
      }, 1200); // 到中间后撒星星
    } else {
      confettiBox.innerHTML = '';
    }
  }

  // 从角落滑翔到屏幕正中间（放大 + 弹跳）
  function flyToCenter(isPerfect) {
    if (!stage) return;
    stage.classList.add(isPerfect ? 'owl-center-perfect' : 'owl-center');
    setTimeout(() => {
      stage.classList.add(isPerfect ? 'owl-bounce-center-perfect' : 'owl-bounce-center');
      setTimeout(() => stage.classList.remove('owl-bounce-center', 'owl-bounce-center-perfect'), 900);
    }, 700);
  }

  function say(text, delayMs) {
    if (typeof document === 'undefined') return;
    ensureStage();
    const v = global.__mtVoice;
    if (!v) return;
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
      v.play(text);
      // 说话时嘴巴动一动（俏皮细节）
      const beak = stage.querySelector('.owl-beak');
      if (beak) beak.classList.add('owl-beak-talk');
      setTimeout(() => { if (beak) beak.classList.remove('owl-beak-talk'); }, 900);
    }, delayMs || 0);
  }

  function hide() {
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    if (stage) stage.classList.add('owl-hidden');
  }

  global.__mtOwl = {
    flyIn: flyIn,
    say: say,
    hide: hide,
  };
})(typeof window !== 'undefined' ? window : globalThis);
