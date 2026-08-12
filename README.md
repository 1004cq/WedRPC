# SmartTrace MediaVault (ZYJ Node.js System)

SmartTrace MediaVault 是一个基于现代 **Node.js** 全栈架构开发的智能追踪链接与媒体采集管理系统。项目原为 PHP 版本，现已全面重构为高性能、类型安全且界面优雅的现代化 Web 应用。

本项目支持自定义追踪链接生成、合规的摄像头授权与前后置录像、访客端设备指纹与 GPS 采集、S3 媒体存储、SMTP 邮件即时通知、CSV 数据导出、地图快捷定位以及数据生命周期自动清理（TTL）。

---

## 🚀 核心功能特性

| 模块 | 功能说明 |
| :--- | :--- |
| **项目仪表盘** | 仿 MediaVault 风格设计，支持顶部品牌栏、横向功能导航、核心统计卡片与最近活动真实数据聚合趋势图。 |
| **链接管理** | 管理员可创建唯一的追踪链接编号并绑定自定义目标跳转网址，支持一键复制完整链接。 |
| **合规媒体采集** | 访问者在明确授权后，可自主选择**前置**或**后置摄像头**进行简短视频录像（支持预览与确认上传）。 |
| **全方位客户端探测** | 自动记录访问者 IP 地址、GPS 定位坐标（带高德地图一键定位）、屏幕分辨率、浏览器指纹与 User-Agent。 |
| **SMTP 邮件通知** | 新访客提交媒体与数据时，系统自动通过配置的 SMTP 服务器向管理员发送即时邮件提醒。 |
| **数据管理与导出** | 采集图库支持按链接 ID 筛选、分页浏览、单条或批量删除、一键清空及 **CSV 表格导出**。 |

---

## 🛠 技术栈

- **前端**：React 19, TypeScript, Tailwind CSS 4, Radix UI, Recharts, Wouter, tRPC Client
- **后端**：Node.js, Express 4, tRPC 11, Drizzle ORM, Nodemailer
- **数据库**：MySQL / TiDB
- **存储**：S3 对象存储（安全托管照片与 WebM 视频）
- **测试**：Vitest

---

## 📂 项目结构

```text
client/
  src/
    components/   ← UI 组件与布局
    pages/        ← Home.tsx (仪表盘/管理后台), TrackingPage.tsx (访客端采集页)
    lib/          ← tRPC 客户端配置
drizzle/          ← 数据库 Schema 与迁移文件
server/
  _core/          ← 框架底层服务（OAuth、上下文、存储代理、SDK）
  db.ts           ← 数据库查询辅助函数
  routers.ts      ← tRPC 路由定义
  email.ts        ← SMTP 邮件通知服务
  scheduled.ts    ← 定时清理与生命周期管理
shared/           ← 共享类型与常量
```

---

## ⚙️ 环境变量与配置

项目运行时依赖以下系统环境变量（已在平台中自动注入）：

- `DATABASE_URL`：MySQL 数据库连接字符串
- `JWT_SECRET`：会话签名密钥
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFICATION_EMAIL`：SMTP 邮件通知配置

---

## 📦 安装与本地运行

```bash
# 1. 安装依赖
pnpm install

# 2. 运行数据库迁移
pnpm db:push

# 3. 启动开发服务器
pnpm dev

# 4. 运行单元测试
pnpm test
```

---

## 📄 许可证

本项目采用 [MIT License](LICENSE)。
