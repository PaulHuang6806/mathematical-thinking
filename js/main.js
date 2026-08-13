/* ============================================
   Mathematical Thinking · 数学思维
   入口脚本：应用初始化与模块占位
   ============================================ */

(function () {
  'use strict';

  const APP = {
    name: 'Mathematical Thinking',
    version: '0.1.0',
    modules: [
      { id: 'number', title: '数感', status: 'coming' },
      { id: 'geometry', title: '几何', status: 'coming' },
      { id: 'logic', title: '逻辑', status: 'coming' },
      { id: 'calc', title: '计算', status: 'coming' },
    ],
  };

  function init() {
    console.log(`[${APP.name}] v${APP.version} 已启动`);

    const startBtn = document.getElementById('btn-start');
    const tip = document.getElementById('start-tip');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        tip.textContent = '学习内容开发中，敬请期待 🚧';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
