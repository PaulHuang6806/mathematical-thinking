# Mathematical Thinking

数学思维 · 网页应用（纯静态：HTML + CSS + JavaScript）

## 项目结构

```
Mathematical Thinking/
├── index.html      # 页面入口
├── css/style.css   # 样式
├── js/main.js      # 脚本入口
└── assets/         # 图片、音频等资源（待添加）
```

## 本地运行

无需安装依赖，直接双击 index.html 用浏览器打开；或起本地服务：

```bash
python -m http.server 8899
# 浏览器访问 http://localhost:8899
```

## 说明

- 零构建、零依赖，完全离线可用
- 网络恢复后可升级为 Vite + 框架，或接入后端
- git 身份为仓库级本地配置（JM / JM@local），可按需修改：
  `git config user.name "你的名字"` / `git config user.email "你的邮箱"`
