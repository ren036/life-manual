# 生活手册

一个面向 iPhone 的个人生活知识库 PWA，用来记录菜品、维修经验、重要图片和文件，并支持搜索与根据现有食材匹配做过的菜。

## 主要功能

- 创建菜品、维修、图片、文件和通用记录
- 保存图片、PDF、Word 等附件
- 搜索历史生活记录
- 根据现有食材推荐自己做过的菜
- 数据保存在当前设备
- 支持离线访问和 iPhone 主屏幕安装

## 技术栈

- Vite
- React
- TypeScript
- PWA Service Worker
- IndexedDB：记录、图片和文件附件

## 项目结构

```text
life-manual/
├─ public/                 # PWA 清单和离线缓存脚本
├─ src/
│  ├─ components/         # 通用界面组件
│  ├─ data/               # 初始示例数据
│  ├─ pages/              # 首页、搜索、找菜和记录页面
│  ├─ storage/            # 本地记录与附件存储
│  ├─ App.tsx             # 应用入口和全局状态
│  ├─ main.tsx            # React 启动文件
│  ├─ styles.css          # 全局样式
│  └─ types.ts            # TypeScript 类型
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## 本地开发

需要安装 Node.js 18 或更高版本。

```powershell
cd D:\life-manual
npm install
npm run dev
```

终端会显示本地访问地址，通常是 `http://localhost:5173/`。

## 生产构建

```powershell
npm run build
```

构建结果位于 `dist` 文件夹。

## 在 iPhone 上安装

PWA 需要通过 HTTPS 地址访问后才能稳定安装到手机。部署完成后：

1. 使用 iPhone 的 Safari 打开应用地址。
2. 点击 Safari 底部的“分享”按钮。
3. 选择“添加到主屏幕”。
4. 点击“添加”。

之后可以像普通 App 一样从 iPhone 桌面打开。

## 数据说明

当前版本采用本地优先设计：

- 文字记录、图片和文件统一保存在浏览器 IndexedDB。
- 不需要注册账号，也不会自动上传个人内容。
- 清除 Safari 网站数据会同时删除本地记录，请勿将当前版本作为重要文件的唯一备份。

后续可以增加数据导出、导入和 iCloud 备份功能。
