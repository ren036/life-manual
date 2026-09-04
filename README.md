# 生活手册

一个面向手机的个人生活 PWA，用来分别管理做过的菜、重要图片与文件，以及日常待办。

## 主要功能

- 用图片卡片记录做过的菜，可填写食材、分类和心得
- 保存图片、PDF、Word 等资料，可分类并标记重要
- 创建带分类、截止日期和优先级的待办事项
- 完成或恢复待办，分别查看进行中与已完成事项
- 自动兼容并整理旧版生活记录
- 数据保存在当前设备
- 支持离线访问和 iPhone 主屏幕安装

## 技术栈

- Vite
- React
- TypeScript
- PWA Service Worker
- IndexedDB：菜谱、资料、待办和附件

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
