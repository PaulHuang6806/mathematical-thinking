/* ============================================
   Mathematical Thinking · 猫头鹰吉祥物
   纯 SVG 手绘 + Web Animations API，零图片零依赖。
   位置系统：全部由 transform 控制（单坐标系，无 left/bottom 参与，
   避免 CSS 过渡/动画与定位叠加冲突）。
   时机由游戏 JS 显式调用：
     flyIn('wave')      开局打招呼（从屏幕外飞入左下角，挥翅膀）
     flyIn('cheer')     答对庆祝（飞入角落+弹跳+扇翅）
     flyIn('big')       连对 3+：扑腾翅膀波浪轨迹飞向屏幕中间
     flyIn('huge')      连对 5+：飞向中间 + 撒星星
     flyIn('perfect')   全对结算：大号飞向中间 + 星星雨
     flyIn('encourage') 答错陪伴（角落出现，歪头）
     flyIn('idle')      安静回到左下角（不打扰）
     flyIn('end')       结算登场
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
  let flightAnim = null;
  let animQueue = []; // 依次执行的 WAAPI 动画（飞行→弹跳）

  function round1(n) { return Math.round(n * 10) / 10; }

  function ensureStage() {
    if (stage) return;
    stage = document.createElement('div');
    stage.id = 'owl-stage';
    stage.className = 'owl-stage owl-hidden';
    stage.style.transform = posCorner();
    stage.innerHTML = `<div class="owl-bird">${owlSvg()}</div><div class="owl-confetti-box"></div>`;
    document.body.appendChild(stage);
    bird = stage.querySelector('.owl-bird');
    confettiBox = stage.querySelector('.owl-confetti-box');
  }

  // ===== 位置（transform 单坐标系） =====
  // 左下角：距左 10px、距底 10px
  function posCorner() {
    return `translate(${10}px, ${window.innerHeight - stage.offsetHeight - 10}px)`;
  }
  // 屏幕中间偏上（局中庆祝，bottom≈42%，不挡下方选项）；结算大版（bottom≈22%）
  function posCenter(isPerfect) {
    const h = stage.offsetHeight;
    const w = stage.offsetWidth;
    const top = window.innerHeight * (isPerfect ? 0.78 : 0.58) - h;
    const left = window.innerWidth / 2 - w / 2;
    return `translate(${left}px, ${top}px) scale(${isPerfect ? 1.45 : 1.15})`;
  }
  // 当前实际位置（rect 还原为 transform）
  function posNow() {
    const r = stage.getBoundingClientRect();
    return `translate(${r.left}px, ${r.top}px)`;
  }

  // 落地弹跳（WAAPI，在指定位置叠加 translateY）
  function bounceAt(transformStr, big) {
    const up1 = big ? -30 : -20;
    const up2 = big ? -12 : -8;
    try {
      stage.animate([
        { transform: transformStr },
        { transform: transformStr + ` translateY(${up1}px)` },
        { transform: transformStr },
        { transform: transformStr + ` translateY(${up2}px)` },
        { transform: transformStr },
      ], { duration: 550, easing: 'ease' });
    } catch (e) { /* 忽略 */ }
  }

  function clearAnim() {
    if (!bird) return;
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    bird.className = 'owl-bird';
    stage.classList.remove('owl-fly-in');
    stage.classList.remove('owl-flying');
    stage.classList.remove('owl-hidden');
  }

  // 从屏幕外飞入左下角（wave / cheer / encourage / end 的角落出场）
  function flyInCorner() {
    const to = posCorner();
    const from = `translate(${-stage.offsetWidth - 60}px, ${window.innerHeight - stage.offsetHeight - 10 + 40}px)`;
    flightAnim = stage.animate([
      { transform: from, offset: 0 },
      { transform: to, offset: 0.72 },
      { transform: to + ' translateY(-14px)', offset: 0.86 },
      { transform: to, offset: 1 },
    ], { duration: 620, easing: 'ease-out' });
    flightAnim.onfinish = () => {
      flightAnim = null;
      stage.style.transform = to;
      bounceAt(to, false);
    };
  }

  // 扑腾翅膀、波浪轨迹飞向屏幕中间（big / huge / perfect）
  function flyToCenter(isPerfect) {
    if (!stage) return;
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    const target = posCenter(isPerfect);
    const from = posNow();
    const amp = isPerfect ? 80 : 60; // 垂直波浪幅度
    const dur = isPerfect ? 1400 : 1100;
    stage.classList.add('owl-flying');
    const frames = [
      { transform: from, offset: 0 },
      { transform: target + ` translateY(${-amp}px) rotate(-8deg)`, offset: 0.22 },
      { transform: target + ` translateY(${amp * 0.7}px) rotate(6deg)`, offset: 0.48 },
      { transform: target + ` translateY(${-amp * 0.4}px) rotate(-4deg)`, offset: 0.74 },
      { transform: target, offset: 1 },
    ];
    try {
      flightAnim = stage.animate(frames, { duration: dur, easing: 'cubic-bezier(0.33, 0.5, 0.3, 1)', fill: 'forwards' });
      flightAnim.onfinish = () => {
        flightAnim.cancel();
        flightAnim = null;
        stage.classList.remove('owl-flying');
        stage.style.transform = target; // 落位（与动画终值一致，无跳变）
        bounceAt(target, isPerfect);
      };
    } catch (e) {
      stage.classList.remove('owl-flying');
      stage.style.transform = target;
    }
  }

  function flyIn(pose) {
    if (typeof document === 'undefined') return;
    ensureStage();
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    clearAnim();
    if (pose === 'idle') {
      stage.style.transform = posCorner(); // 平滑滑回左下角（transition 生效）
      return;
    }

    bird.classList.remove('owl-flap');
    if (pose === 'cheer' || pose === 'big' || pose === 'huge' || pose === 'perfect') bird.classList.add('owl-flap');
    bird.classList.toggle('owl-tilt', pose === 'encourage');

    if (pose === 'big' || pose === 'huge' || pose === 'perfect') {
      // 扑腾翅膀直接飞向屏幕中间
      setTimeout(() => flyToCenter(pose === 'perfect'), 120);
      if (pose === 'huge' || pose === 'perfect') {
        setTimeout(() => {
          confettiBox.innerHTML = confettiHtml(pose === 'perfect' ? 14 : 6);
        }, 1500); // 落地后撒星星
      }
      return;
    }

    // 角落出场
    stage.classList.remove('owl-hidden');
    flyInCorner();
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
