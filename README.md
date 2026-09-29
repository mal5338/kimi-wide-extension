# kimi-wide-extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Chrome/Edge 浏览器扩展：为 Kimi Code Web 界面提供 **全宽显示开关** 与 **消息气泡图片/视频缩略图**。

## 功能

- **全宽切换**：在页面右键菜单中切换消息列全宽/默认宽度
- **附件缩略图**：消息气泡内的图片/视频附件直接渲染缩略图，不再只是链接

## 安装（开发者模式加载）

1. 下载本仓库，或 `git clone` 到本地
2. 打开 Chrome，进入 `chrome://extensions/`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本目录
5. 访问 `code.kimi.com` 即可生效

默认匹配 `localhost`、`127.0.0.1` 与 `code.kimi.com` / `code-rc.kimi.com`。如需在自建反代/内网域名上使用，把你的域名加进 `manifest.json` 的 `content_scripts.matches` 后重新加载扩展即可。

## License

[MIT](LICENSE)
