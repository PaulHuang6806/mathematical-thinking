/* ============================================
   Mathematical Thinking · 学习报告
   读取本地学习记录（localStorage）并渲染统计
   ============================================ */
(function () {
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
    return m;
  }

  function render() {
    const recs = load();
    const statsEl = document.getElementById('stats');
    const wrap = document.getElementById('table-wrap');

    if (!recs.length) {
      statsEl.innerHTML = '';
      wrap.innerHTML = '<p class="empty-note">还没有学习记录，先去玩一局吧！</p>';
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

  document.addEventListener('DOMContentLoaded', () => {
    render();
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('确定清空全部学习记录吗？')) {
        localStorage.removeItem(KEY);
        render();
      }
    });
  });
})();
