# 项目记账应用

基于 Expo 54 + React Native 的项目记账应用，支持项目管理、费用录入、财务统计、收款/开票记录及数据备份恢复。

## 功能特性

- 📊 **项目管理**: 创建和管理项目，跟踪负责人、日期、合同金额、结算金额等
- 💰 **支出记录**: 录入项目支出，支持分类统计
- 📈 **统计报表**: 查看财务数据和统计图表
- 📝 **收款记录**: 记录项目收款，支持多次收款
- 🧾 **开票记录**: 记录开票信息，支持多次开票
- 💾 **数据管理**: 导出/导入数据，清除已完成项目
- 🔒 **本地存储**: 数据完全存储在本地，支持离线使用

## 技术栈

- **前端**: Expo 54 + React Native + TypeScript
- **数据存储**: AsyncStorage
- **构建工具**: EAS Build
- **CI/CD**: GitHub Actions
- **日期选择**: @react-native-community/datetimepicker
- **编码规范**: Airbnb

---

## 📱 下载安装

### 方式一：GitHub Actions 自动构建

#### 通过 GitHub Actions 下载最新 APK

1. 访问仓库的 [Actions 页面](https://github.com/yazi8929/workhours-app/actions)
2. 选择最新的成功构建
3. 向下滚动到 "Artifacts" 部分
4. 下载 `android-apk-production` 或 `android-apk-preview`

详细说明请查看 [GitHub Actions 构建指南](./GITHUB_ACTIONS_GUIDE.md)

### 方式二：本地构建

如果你有 Expo 账户，可以参考以下文档自行构建：

- [Android APK 构建指南](./BUILD_GUIDE.md)
- [快速开始](./QUICK_START.md)

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- Expo Go（用于测试）
- Expo 账户（用于构建）

### 安装依赖

```bash
pnpm i
```

### 本地开发

```bash
# 同时启动前端和后端服务（会自动处理端口占用）
coze dev

# 或分别启动
cd client && npx expo start
cd server && pnpm run dev
```

### 测试应用

1. 在手机上安装 Expo Go
2. 扫描终端显示的二维码
3. 或在浏览器中打开 http://localhost:8081

---

## 📦 构建发布

### 使用 GitHub Actions 自动构建（推荐）

1. 配置 EXPO_TOKEN 到 GitHub Secrets（详见 [GITHUB_ACTIONS_GUIDE.md](./GITHUB_ACTIONS_GUIDE.md)）
2. 推送代码到 main 分支自动触发构建
3. 或在 Actions 页面手动触发

### 本地构建

```bash
# 使用构建脚本
./build-apk.sh

# 或使用 EAS CLI
cd client
eas build --platform android --profile production
```

---

## 📂 项目结构

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

目录结构说明

├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # Express 入口文件
|   └── package.json            # 服务端 package.json
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   ├── home.tsx            # 首页
│   │   └── index.tsx           # re-export home.tsx
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # demo 示例页面
│   │       ├── index.tsx       # 页面组件实现
│   │       └── styles.ts       # 页面样式
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── constants/              # 常量定义（如主题配置）
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 安装依赖

### 命令

```bash
pnpm i
```

### 新增依赖约束

如果需要新增依赖，需在 client 和 server 各自的目录添加（原因：隔离前后端的依赖），禁止在根目录直接安装依赖

### 新增依赖标准流程

- 编辑 `client/package.json` 或 `server/package.json`
- 在根目录执行 `pnpm i`

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

运行 coze dev 可以同时启动前端和后端服务，如果端口已占用，该命令会先杀掉占用端口的进程再启动，也可以用来重启前端和后端服务

```bash
coze dev
```
