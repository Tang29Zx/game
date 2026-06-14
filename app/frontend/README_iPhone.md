# iPhone / PWA 使用说明

`iphone/` 目录是“五子棋 AI 棋院”的手机端 PWA。它可以用 Safari 打开，也可以添加到 iPhone 主屏幕，形成接近 App 的离线体验。

当前版本：v50

## 当前能力

- 25x25 高级棋盘，玩家执黑，AI 执白。
- 2x 高分屏画布、2.4x 棋盘缓存、192px 棋子精灵。
- 木纹棋盘、清晰网格、立体棋子、最后一手标记、胜利五连高亮。
- Worker 后台 AI，不阻塞棋盘触控。
- 对弈、训练、复盘三个入口。
- AI 讲解卡：展示搜索深度、节点数、候选点和知识点。
- 12 个高难度课程残局。
- Service Worker 离线缓存。
- 支持滚轮缩放、拖拽平移、触控缩放、适屏、居中。
- 单文件离线备用入口：`gomoku_iphone_offline.html`。

## 本地预览

在项目根目录运行：

```powershell
python -m http.server 8765 --bind 0.0.0.0 --directory iphone
```

电脑本机访问：

```text
http://127.0.0.1:8765/index.html?v=50
```

iPhone 与电脑在同一个 Wi-Fi 时访问：

```text
http://电脑局域网IP:8765/index.html?v=50
```

例如：

```text
http://192.168.31.169:8765/index.html?v=50
```

## 添加到主屏幕

1. 在 iPhone 上用 Safari 打开 PWA 地址。
2. 确认页面已经加载出棋盘。
3. 点击 Safari 底部或顶部的分享按钮。
4. 选择“添加到主屏幕”。
5. 名称可保留“五子棋 AI 棋院”。
6. 回到主屏幕，点击新图标进入。

注意：iOS 对 PWA 缓存较严格。如果你之前添加过旧版本，建议先删除旧主屏幕图标，再用 `index.html?v=50` 重新添加。

## 离线验证

1. 第一次联网打开 `index.html?v=50`。
2. 等待棋盘、AI Worker 和图标加载完成。
3. 关闭网络或切到飞行模式。
4. 从主屏幕图标重新打开。
5. 应仍能进入对弈界面，并可使用训练/对弈的本地功能。

Service Worker 缓存名：

```text
gomoku-iphone-offline-v50
```

## 触控与鼠标操作

- 点击棋盘交叉点：落子。
- 悬停：显示落子预览，桌面可用。
- 拖拽：平移棋盘。
- 双指：缩放棋盘。
- 滚轮：以鼠标位置为中心缩放，桌面可用。
- `适屏`：恢复完整棋盘视野。
- `居中`：回到最后一手。
- `悔棋`：撤销玩家与 AI 的最近一组落子。

## AI 强度建议

- `宗师`：最强展示档，适合课程答辩。
- `天元`：强度和速度均衡。
- `高手`：普通设备更流畅。
- `极速`：用于低性能设备或快速演示。

AI 不依赖外部大模型，也不需要网络 API。解释文本来自棋型、候选点、深度、节点数和剪枝信息。

## 单文件离线入口

如果环境不适合 Service Worker，可直接打开：

```text
iphone/gomoku_iphone_offline.html
```

这个文件保留：

- 高画质棋盘
- AI 对弈
- 缩放和平移
- 悔棋、新局、居中
- 胜利提示与五连高亮

它不包含完整训练和复盘面板，作为应急离线版本使用。

## 打包 PWA

在项目根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package_iphone_pwa.ps1
```

输出：

```text
dist/gomoku-ai-lab-pwa.zip
```

这个 zip 可以上传到 GitHub Pages、Netlify、Vercel、学校服务器或任意 HTTPS 静态托管平台。

## 常见问题

### 主屏幕版本很卡或仍是旧界面

1. 删除旧主屏幕图标。
2. Safari 打开 `index.html?v=50`。
3. 等待页面完全加载。
4. 重新添加到主屏幕。

如仍异常，清理 Safari 网站数据后重试。

### iPhone 打不开电脑地址

检查：

- 手机和电脑是否在同一 Wi-Fi。
- Windows 防火墙是否允许 Python 访问局域网。
- 地址是否使用电脑局域网 IP，而不是 `127.0.0.1`。
- 电脑端命令是否仍在运行。

### 能否不依赖地址直接使用

可以通过“添加到主屏幕”实现近似 App 体验；首次缓存后可离线打开。真正原生 iOS App 需要 macOS、Xcode 和 Apple 签名，本项目在 Windows 上保留了 `ios_app/` WebView 资源，但不包含签名发布流程。

## 质量检查

推荐在提交前运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_product.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa_interaction.ps1
```

v49 已通过桌面、高清桌面、宽屏、手机竖屏、手机横屏、入口路由和离线页交互 QA。
