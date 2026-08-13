# 项目 TODO (生产化优化)

- [x] 基础架构转换与核心功能（PHP 转 Node.js、tRPC、Drizzle、S3）
- [x] 追踪链接生成与管理
- [x] 合规的前后置摄像头授权与视频/照片录制
- [x] SMTP 邮件即时通知
- [x] 中文 MediaVault 风格项目仪表盘与真实趋势图聚合
- [x] 增加访客数据一键导出 CSV 功能
- [x] 增加地图快捷定位（通过高德/Google Maps 打开 GPS 坐标）
- [x] 增加自动清理过期采集记录（数据生命周期 TTL）

- [x] IP-属地解析集成（自动将IP转换为国家/城市）
- [x] SMTP-Konfigurationspanel im Admin-Dashboard (Eingabe und Test von E-Mail-Zugangsdaten)
- [x] Mehrsprachigkeit (Umschaltung zwischen Chinesisch und Englisch)

- [x] 自定义邮件模板功能（支持管理员在后台自定义邮件主题与 HTML 内容格式）
- [x] 多用户与权限隔离（管理员可绑定并管理专属追踪链接与数据权限）
- [x] 访问频率限制 (Rate Limiting)（防止针对追踪链接的恶意重复刷取与攻击）

- [x] 区分拍照链接与拍视频链接（数据库新增 captureType 字段，后台生成时可选项，前端按类型执行拍照或 4 秒视频录制）

- [x] 访客访问时长统计（数据库 captures 新增 durationSec 字段，访客端在完成捕获并跳转/离开前通过 navigator.sendBeacon 或 mutation 上报停留秒数，后台图库展示访问时长）
