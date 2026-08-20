/* ============================================
   Mathematical Thinking · 猫头鹰吉祥物 v4（Q 版表情版）
   纯 SVG 手绘 + Web Animations API + CSS 动画，零图片零依赖。
   v4 更新（用户反馈"太呆板"）：
     · Q 版重绘：大头圆身、大眼双高光、眉毛、呆毛、腮红、亮色系
     · 表情系统：normal / happy / think / sad / surprise 随场景自动切换
     · 持续活着：呼吸浮动 + 眨眼 + 呆毛轻摆（角落 idle 也在动）
     · 说话联动：嘴开合 + 点头，时长随语音文本长度
     · 出题思考：MutationObserver 监听 #q-prompt，出新题自动歪头思考
   位置系统：全部由 transform 控制（单坐标系，无 left/bottom 参与，
   避免 CSS 过渡/动画与定位叠加冲突）。
   时机由游戏 JS 显式调用 flyIn(pose)，pose → 表情自动映射：
     wave 开局打招呼 / cheer 答对 / big 连对3+ / huge 连对5+ / perfect 全对
     encourage 答错陪伴 / idle 回角落 / end 结算登场
   API: window.__mtOwl = { flyIn, say, hide, setMood }
   ============================================ */
(function (global) {
  'use strict';

  // ---------- Q 版猫头鹰 SVG（大头圆身 + 表情多形态） ----------
  function owlSvg() {
    return `
    <svg viewBox="0 0 140 150" width="110" height="118" aria-hidden="true">
      <g>
        <g class="owl-wing-back"><path d="M26 96 Q6 104 12 122 Q26 114 36 108 Z" fill="#B5703A"/></g>
        <ellipse class="owl-foot" cx="56" cy="144" rx="9" ry="6" fill="#F5853F"/>
        <ellipse class="owl-foot" cx="84" cy="144" rx="9" ry="6" fill="#F5853F"/>
        <ellipse class="owl-body" cx="70" cy="114" rx="40" ry="33" fill="#D9A05B"/>
        <ellipse class="owl-belly" cx="70" cy="121" rx="25" ry="22" fill="#FFF1DC"/>
        <g class="owl-head">
          <g class="owl-feather owl-feather-1"><path d="M54 26 Q48 8 58 5 Q56 16 62 22 Z" fill="#8B5E34"/></g>
          <g class="owl-feather owl-feather-2"><path d="M67 24 Q67 2 77 2 Q73 12 75 21 Z" fill="#8B5E34"/></g>
          <g class="owl-feather owl-feather-3"><path d="M80 26 Q90 8 96 12 Q88 17 85 23 Z" fill="#8B5E34"/></g>
          <ellipse cx="70" cy="52" rx="46" ry="42" fill="#D9A05B"/>
          <ellipse cx="70" cy="60" rx="34" ry="31" fill="#FFF6E9"/>
          <path class="owl-brow" d="M38 36 Q44 30 50 34" fill="none" stroke="#5A4030" stroke-width="3" stroke-linecap="round"/>
          <path class="owl-brow" d="M102 36 Q96 30 90 34" fill="none" stroke="#5A4030" stroke-width="3" stroke-linecap="round"/>
          <g class="owl-eye" transform="translate(52,58)">
            <g class="eye-normal">
              <circle r="13" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="1" r="6.5" fill="#3E2C1E"/>
              <circle cx="3" cy="-2" r="2.6" fill="#fff"/>
              <circle cx="-1.5" cy="4" r="1.4" fill="#fff"/>
            </g>
            <g class="eye-happy">
              <path d="M-13 4 Q0 -15 13 4 Q0 -3 -13 4 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
            </g>
            <g class="eye-think">
              <path d="M-13 2 A13 13 0 0 1 13 2 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="-1" r="4.2" fill="#3E2C1E"/>
            </g>
            <g class="eye-sad">
              <path d="M-13 8 Q0 16 13 8 Q0 11 -13 8 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="10" r="4" fill="#3E2C1E"/>
            </g>
            <g class="eye-surprise">
              <circle r="15" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle r="3.2" fill="#3E2C1E"/>
              <circle cx="-4" cy="-4" r="1.4" fill="#fff"/>
            </g>
          </g>
          <g class="owl-eye" transform="translate(88,58)">
            <g class="eye-normal">
              <circle r="13" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="1" r="6.5" fill="#3E2C1E"/>
              <circle cx="3" cy="-2" r="2.6" fill="#fff"/>
              <circle cx="-1.5" cy="4" r="1.4" fill="#fff"/>
            </g>
            <g class="eye-happy">
              <path d="M-13 4 Q0 -15 13 4 Q0 -3 -13 4 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
            </g>
            <g class="eye-think">
              <path d="M-13 2 A13 13 0 0 1 13 2 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="-1" r="4.2" fill="#3E2C1E"/>
            </g>
            <g class="eye-sad">
              <path d="M-13 8 Q0 16 13 8 Q0 11 -13 8 Z" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle cy="10" r="4" fill="#3E2C1E"/>
            </g>
            <g class="eye-surprise">
              <circle r="15" fill="#fff" stroke="#5A4030" stroke-width="3"/>
              <circle r="3.2" fill="#3E2C1E"/>
              <circle cx="-4" cy="-4" r="1.4" fill="#fff"/>
            </g>
          </g>
          <g class="owl-mouth" transform="translate(70,78)">
            <path class="mouth-normal" d="M-6 0 L6 0 L0 8 Z" fill="#F5853F"/>
            <path class="mouth-happy" d="M-8 1 Q0 10 8 1" fill="none" stroke="#F5853F" stroke-width="3.5" stroke-linecap="round"/>
            <path class="mouth-sad" d="M-8 1 Q0 -7 8 1" fill="none" stroke="#F5853F" stroke-width="3.5" stroke-linecap="round"/>
            <circle class="mouth-surprise" r="4.5" fill="#F5853F"/>
          </g>
          <circle class="owl-blush" cx="38" cy="76" r="6" fill="#FF9E9E" opacity="0.85"/>
          <circle class="owl-blush" cx="102" cy="76" r="6" fill="#FF9E9E" opacity="0.85"/>
        </g>
        <g class="owl-wing"><path d="M110 94 Q130 102 124 124 Q112 116 102 108 Z" fill="#E8B06B"/></g>
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
  let currentMood = 'normal';

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

  // ---------- 表情系统 ----------
  // pose → 表情自动映射；setMood 可被游戏/观察器显式调用
  const POSE_MOOD = {
    wave: 'happy', cheer: 'happy', big: 'happy', huge: 'happy',
    perfect: 'happy', encourage: 'sad', end: 'happy', idle: 'normal',
  };
  function setMood(mood) {
    if (typeof document === 'undefined' || !bird) return;
    currentMood = mood || 'normal';
    bird.className = 'owl-bird mood-' + currentMood;
  }

  function clearAnim() {
    if (!bird) return;
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    bird.className = 'owl-bird'; // 表情由 flyIn/setMood 在调用方设置
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
    setMood(POSE_MOOD[pose] || 'normal');
    if (pose === 'idle') {
      stage.style.transform = posCorner(); // 平滑滑回左下角（transition 生效）
      return;
    }

    bird.classList.remove('owl-flap');
    if (pose === 'cheer' || pose === 'big' || pose === 'huge' || pose === 'perfect') bird.classList.add('owl-flap');

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
      // 说话联动：嘴开合 + 点头，时长随语音长度估算（中文约 170ms/字）
      const mouth = stage.querySelector('.owl-mouth');
      const head = stage.querySelector('.owl-head');
      if (mouth) mouth.classList.add('owl-talk');
      if (head) head.classList.add('owl-talk');
      const dur = Math.min(2800, Math.max(700, String(text).length * 170));
      setTimeout(() => {
        if (mouth) mouth.classList.remove('owl-talk');
        if (head) head.classList.remove('owl-talk');
      }, dur);
    }, delayMs || 0);
  }

  // 出新题自动"思考"：监听题干容器文本变化（各模块统一 #q-prompt）
  function watchQuestions() {
    if (typeof document === 'undefined' || !document.querySelector) return;
    const promptEl = document.querySelector('#q-prompt');
    if (!promptEl) return; // 成就馆等无题干页不监听
    let lastText = promptEl.textContent;
    let t = null;
    const mo = new MutationObserver(() => {
      const txt = promptEl.textContent;
      if (txt === lastText) return;
      lastText = txt;
      if (t) clearTimeout(t);
      t = setTimeout(() => setMood('think'), 300);
    });
    mo.observe(promptEl, { childList: true, characterData: true, subtree: true });
  }

  function hide() {
    if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    if (stage) stage.classList.add('owl-hidden');
  }

  // 初始化：DOM 就绪后挂出题观察器
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') watchQuestions();
    else document.addEventListener('DOMContentLoaded', watchQuestions);
  }

  global.__mtOwl = {
    flyIn: flyIn,
    say: say,
    hide: hide,
    setMood: setMood,
  };
})(typeof window !== 'undefined' ? window : globalThis);
