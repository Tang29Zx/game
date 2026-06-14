# 五子棋 PWA nginx 托管说明

这个目录已经整理成可以直接给 nginx 托管的静态网页目录。

## 目录

```text
D:/sites/game/app/frontend
```

核心入口：

- `index.html`：主入口，适合 `https://game.gluepudding.com/`
- `sw.js`：PWA 离线缓存
- `manifest.webmanifest`：PWA 安装配置
- `ai_worker.js`：浏览器本地 AI Worker
- `gomoku_iphone_offline.html`：单文件备用入口

## nginx

可以把 `D:/sites/game/nginx-game.conf` 复制或 include 到 nginx 的 `conf.d` 中。配置已包含 `80` 和 `443` 两个端口，其中 `80` 会自动跳转到 `443`。

配置里的关键点：

- `root D:/sites/game/app/frontend;`
- `server_name game.gluepudding.com;`
- `listen 80;`：跳转到 HTTPS
- `listen 443 ssl http2;`
- `sw.js`、`manifest.webmanifest`、`index.html` 不做长期缓存，方便更新 PWA
- JS、图标等静态资源做 7 天缓存

启用 HTTPS 前，把配置里的证书路径替换成你服务器上的真实路径：

```nginx
ssl_certificate D:/nginx/cert/game.gluepudding.com.pem;
ssl_certificate_key D:/nginx/cert/game.gluepudding.com.key;
```

修改 nginx 配置后执行：

```powershell
nginx -t
nginx -s reload
```

## 验收

浏览器访问：

```text
http://game.gluepudding.com/
https://game.gluepudding.com/
```

如果本机先测目录，可以在本目录运行：

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:5173/
```
