/* ============================================
   Mathematical Thinking · 成就馆（金拇指/银拇指）
   依据《幼小衔接数学游戏盒》特殊牌设计：
   金拇指 = 100 个大拇指（累计 100 金星）
   银拇指 = 50 个大拇指（累计 50 金星）
   以评促学：看得到自己的成长足迹
   ============================================ */
(function (global) {
  'use strict';

  const KEY = 'mt_sessions';

  function load() {
    try {
      return JSON.parse(global.localStorage.getItem(KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  // 纯函数：从局记录计算统计与徽章（可单测）
  function computeStats(recs) {
    const totalGold = recs.reduce((a, r) => a + (r.gold || 0), 0);
    const totalSilver = recs.reduce((a, r) => a + (r.silver || 0), 0);
    const totalGames = recs.length;
    const modes = new Set(recs.map((r) => r.mode).filter(Boolean));
    return {
      totalGold: totalGold,
      totalSilver: totalSilver,
      totalGames: totalGames,
      modeCount: modes.size,
    };
  }

  const BADGES = [
    {
      id: 'first',
      icon: '🌟',
      name: '初露头角',
      desc: '完成第 1 局游戏',
      check: (s) => s.totalGames >= 1,
      gold: false,
    },
    {
      id: 'silver',
      icon: '🥈',
      name: '银拇指',
      desc: '累计拿到 50 颗金星（对应实体牌：银拇指 50 个大拇指）',
      check: (s) => s.totalGold >= 50,
      gold: false,
    },
    {
      id: 'gold',
      icon: '🥇',
      name: '金拇指',
      desc: '累计拿到 100 颗金星（对应实体牌：金拇指 100 个大拇指，超级大力士！）',
      check: (s) => s.totalGold >= 100,
      gold: true,
    },
    {
      id: 'persist',
      icon: '💪',
      name: '坚持不懈',
      desc: '完成 30 局游戏',
      check: (s) => s.totalGames >= 30,
      gold: false,
    },
    {
      id: 'explorer',
      icon: '🧭',
      name: '玩法达人',
      desc: '玩过 10 种不同的玩法',
      check: (s) => s.modeCount >= 10,
      gold: false,
    },
    {
      id: 'master',
      icon: '🏆',
      name: '数学小冠军',
      desc: '玩过 20 种不同的玩法',
      check: (s) => s.modeCount >= 20,
      gold: true,
    },
  ];

  function computeBadges(recs) {
    const stats = computeStats(recs);
    return {
      stats: stats,
      badges: BADGES.map((b) => ({
        id: b.id,
        icon: b.icon,
        name: b.name,
        desc: b.desc,
        gold: b.gold,
        unlocked: b.check(stats),
      })),
    };
  }

  // ================= 浏览器渲染 =================
  if (typeof document !== 'undefined') {
    function render() {
      const { stats, badges } = computeBadges(load());
      document.getElementById('stat-gold').textContent = stats.totalGold;
      document.getElementById('stat-games').textContent = stats.totalGames;
      document.getElementById('stat-modes').textContent = stats.modeCount;

      const grid = document.getElementById('badge-grid');
      grid.innerHTML = badges.map((b) => `
        <div class="ach-card${b.unlocked ? ' ach-on' : ''}${b.gold ? ' ach-gold' : ''}">
          <div class="ach-icon">${b.unlocked ? b.icon : '🔒'}</div>
          <div class="ach-name">${b.name}</div>
          <div class="ach-desc">${b.desc}</div>
          ${b.unlocked ? '<div class="ach-tag">已获得</div>' : '<div class="ach-tag ach-locked-tag">未解锁</div>'}
        </div>`).join('');

      // 金拇指进度条
      const goldPct = Math.min(100, Math.round(stats.totalGold / 100 * 100));
      document.getElementById('gold-fill').style.width = goldPct + '%';
      document.getElementById('gold-label').textContent = stats.totalGold + ' / 100';
      const silverPct = Math.min(100, Math.round(stats.totalGold / 50 * 100));
      document.getElementById('silver-fill').style.width = silverPct + '%';
      document.getElementById('silver-label').textContent = stats.totalGold + ' / 50';
    }

    document.addEventListener('DOMContentLoaded', render);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeStats: computeStats,
      computeBadges: computeBadges,
      BADGES: BADGES,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
