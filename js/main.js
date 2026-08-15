/* ============================================
   Mathematical Thinking · 数学思维
   入口脚本：首页交互与模块导航
   ============================================ */

(function () {
  'use strict';

  const APP = {
    name: 'Mathematical Thinking',
    version: '0.2.0',
    modules: [
      { id: 'number', title: '数感', status: 'live', url: 'modules/number-sense.html' },
      { id: 'geometry', title: '几何', status: 'live', url: 'modules/geometry.html' },
      { id: 'logic', title: '逻辑', status: 'live', url: 'modules/logic.html' },
      { id: 'calc', title: '计算', status: 'coming', url: null },
    ],
  };

  function init() {
    console.log(`[${APP.name}] v${APP.version} 已启动`);

    const startBtn = document.getElementById('btn-start');
    const tip = document.getElementById('start-tip');

    if (startBtn) {
      // "开始学习"：进入第一个已上线模块（数感）
      const firstLive = APP.modules.find((m) => m.status === 'live');
      startBtn.addEventListener('click', () => {
        if (firstLive && firstLive.url) {
          window.location.href = firstLive.url;
        } else {
          tip.textContent = '学习内容开发中，敬请期待 🚧';
        }
      });
      // 提示当前可玩模块
      const liveCount = APP.modules.filter((m) => m.status === 'live').length;
      tip.textContent = `已有 ${liveCount} 个模块可以玩：` +
        APP.modules.filter((m) => m.status === 'live').map((m) => m.title).join('、');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
