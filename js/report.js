/* ============================================
   Mathematical Thinking · 学习报告
   读取本地学习记录（localStorage）并渲染统计、趋势、智能建议
   buildAdvice / modeName 为纯函数，供 Node 单测
   ============================================ */
(function (global) {
  'use strict';

  const KEY = 'mt_sessions';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function modeName(m) {
    if (m === 'count') return '数一数';
    if (m === 'compare') return '比一比';
    if (m === 'shape') return '认图形';
    if (m === 'find') return '找图形';
    if (m === 'pattern') return '找规律';
    if (m === 'odd') return '找不同';
    if (m === 'infer') return '谁最高';
    return m;
  }

  // 模式短名（趋势图柱标用）
  function modeShort(m) {
    if (m === 'count') return '数';
    if (m === 'compare') return '比';
    if (m === 'shape') return '认';
    if (m === 'find') return '找';
    if (m === 'pattern') return '规';
    if (m === 'odd') return '异';
    if (m === 'infer') return '推';
    return m.slice(0, 1);
  }

  // ================= 智能建议引擎（纯函数，供单测） =================
  // 返回 { level: 'empty'|'weak'|'great'|'help'|'persist'|'ok', text }
  function buildAdvice(recs) {
    if (!recs || !recs.length) {
      return { level: 'empty', text: '还没有学习记录，先去玩一局吧！猫头鹰在这里等你们回来 🦉' };
    }
    const byMode = {};
    recs.forEach((r) => {
      byMode[r.mode] = byMode[r.mode] || { n: 0, gold: 0, silver: 0, helped: 0 };
      const s = byMode[r.mode];
      s.n++; s.gold += r.gold; s.silver += r.silver; s.helped += r.helped;
    });
    const totalGold = recs.reduce((s, r) => s + r.gold, 0);
    const totalSilver = recs.reduce((s, r) => s + r.silver, 0);
    const totalHelped = recs.reduce((s, r) => s + r.helped, 0);
    const totalAnswered = totalGold + totalSilver;
    const rate = totalAnswered ? totalGold / totalAnswered : 0;

    // 薄弱模式：玩过 >=2 局、答过 >=5 题、一次答对率 < 70%
    const weak = Object.keys(byMode).filter((m) => {
      const s = byMode[m];
      const answered = s.gold + s.silver;
      return s.n >= 2 && answered >= 5 && s.gold / answered < 0.7;
    });
    if (weak.length) {
      return {
        level: 'weak',
        text: `「${weak.map(modeName).join('、')}」还需要多练练，每天一局，慢慢就会越来越熟啦！`,
      };
    }
    if (rate >= 0.9 && recs.length >= 2) {
      return {
        level: 'great',
        text: '掌握得真好！可以试试另一个玩法，或者让猫头鹰陪你挑战更难的一局！',
      };
    }
    if (totalHelped >= 3) {
      return {
        level: 'help',
        text: `有 ${totalHelped} 道题是孩子需要一起完成的——陪着孩子慢慢数、慢慢认，进步会更快哦。`,
      };
    }
    if (recs.length >= 5 && totalSilver >= 3) {
      return {
        level: 'persist',
        text: '孩子很坚持！重试答对也是了不起的进步，继续加油！',
      };
    }
    return {
      level: 'ok',
      text: '坚持每天玩一局，猫头鹰会看着你越来越棒！',
    };
  }

  // 最近 10 局金星数趋势（CSS 柱状图，零依赖）
  function trendHtml(recs) {
    const last = recs.slice(-10);
    const bars = last.map((r) => {
      const h = Math.max(Math.round((r.gold / 10) * 100), 4);
      return `<div class="trend-col" title="${fmtTime(r.ts)} ${modeName(r.mode)}">
        <div class="trend-bar" style="height:${h}%"><span class="trend-val">${r.gold}</span></div>
        <span class="trend-label">${modeShort(r.mode)}</span>
      </div>`;
    }).join('');
    return `<div class="trend-chart">${bars}</div>`;
  }

  function render() {
    const recs = load();
    const statsEl = document.getElementById('stats');
    const wrap = document.getElementById('table-wrap');
    const adviceEl = document.getElementById('advice');
    const trendEl = document.getElementById('trend');

    if (!recs.length) {
      statsEl.innerHTML = '';
      wrap.innerHTML = '<p class="empty-note">还没有学习记录，先去玩一局吧！</p>';
      if (adviceEl) adviceEl.innerHTML = adviceCard(buildAdvice(recs));
      if (trendEl) trendEl.innerHTML = '';
      return;
    }

    const total = recs.length;
    const gold = recs.reduce((s, r) => s + r.gold, 0);
    const silver = recs.reduce((s, r) => s + r.silver, 0);
    const helped = recs.reduce((s, r) => s + r.helped, 0);
    const answered = gold + silver;
    const rate = answered ? Math.round((gold / answered) * 100) : 0;

    statsEl.innerHTML = `
      <div class="stat-card"><span class="stat-num">${total}</span><span class="stat-label">练习局数</span></div>
      <div class="stat-card"><span class="stat-num">${gold}</span><span class="stat-label">金星（一次答对）</span></div>
      <div class="stat-card"><span class="stat-num">${silver}</span><span class="stat-label">银星（重试答对）</span></div>
      <div class="stat-card"><span class="stat-num">${rate}%</span><span class="stat-label">一次答对率</span></div>
      <div class="stat-card"><span class="stat-num">${helped}</span><span class="stat-label">一起完成的题</span></div>`;

    if (adviceEl) adviceEl.innerHTML = adviceCard(buildAdvice(recs));
    if (trendEl) {
      trendEl.innerHTML = `
        <h3 class="trend-title">最近 10 局掌握趋势</h3>
        <p class="mode-hint">柱子越高，这一局答对的金星越多（每局 10 题）</p>
        ${trendHtml(recs)}`;
    }

    const rows = recs
      .slice(-20)
      .reverse()
      .map((r) => `
        <tr>
          <td>${fmtTime(r.ts)}</td>
          <td>${modeName(r.mode)}</td>
          <td>${r.gold}</td>
          <td>${r.silver}</td>
          <td>${r.helped}</td>
        </tr>`)
      .join('');

    wrap.innerHTML = `
      <table class="report-table">
        <thead>
          <tr><th>时间</th><th>模式</th><th>金星</th><th>银星</th><th>一起完成</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function adviceCard(a) {
    const emoji = {
      empty: '🦉', weak: '💪', great: '🎉', help: '👨‍👩‍👧', persist: '🌟', ok: '🌱',
    }[a.level] || '💡';
    return `<div class="advice-card advice-${a.level}"><span class="advice-icon">${emoji}</span><span class="advice-text">${a.text}</span></div>`;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      render();
      const btnClear = document.getElementById('btn-clear');
      if (btnClear) {
        btnClear.addEventListener('click', () => {
          if (confirm('确定清空全部学习记录吗？')) {
            localStorage.removeItem(KEY);
            render();
          }
        });
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildAdvice: buildAdvice, modeName: modeName };
  }
})(typeof window !== 'undefined' ? window : globalThis);
