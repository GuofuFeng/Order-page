# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
此文件为 Claude Code (claude.ai/code) 在该代码库中工作时提供指导和规范。

## Commands / 常用命令

### Development Server / 开发服务器
*   Run local server with Vite: `npm run dev` (Starts a combined Express + Vite development proxy server on port 3000)
    使用 Vite 运行本地服务器：`npm run dev`（在端口 3000 启动 Express + Vite 联合开发代理服务器）
*   Build application: `npm run build`
    打包构建应用：`npm run build`
*   Start production build: `npm run start`
    启动生产环境构建：`npm run start`

### Code Quality / 代码质量
*   Typecheck TypeScript files: `npm run lint` (runs `tsc --noEmit`)
    对 TypeScript 文件进行类型检查：`npm run lint`（实际执行 `tsc --noEmit`）
*   Clean build outputs: `npm run clean`
    清理构建输出文件：`npm run clean`

*Note: This repository does not contain a unit test suite. Run static typing verification before committing.*
*注意：此仓库不包含单元测试套件。在提交代码之前，请运行静态类型校验（npm run lint）。*

## Code Architecture / 代码架构

This project is a React-based application that parses, stores, and evaluates betting configurations against lottery outcomes.
本项目是一个基于 React 的应用，用于解析、存储投注配置，并根据开奖结果计算中奖情况。

### Core Architecture Flow / 核心架构流程
1.  **State Management & UI / 状态管理与用户界面 (`src/App.tsx`)**: The UI operates page states ('order', 'draw', 'batch', 'confirm'), handles basket separation (Baskets A-E), and leverages custom React components (such as `BatchImportRow`) to capture raw text configurations.
    界面控制页面状态（'order' 订单, 'draw' 开奖, 'batch' 批量, 'confirm' 确认），处理不同篮子的隔离（A-E 篮），并利用自定义 React 组件（例如 `BatchImportRow`）来捕获原始文本配置。
2.  **Input Parsing / 输入解析 (`src/utils/betParser.ts`)**: Natural language betting inputs are parsed via regular expressions into structured JSON configurations defined in `src/types.ts`. It splits segments based on recognized lottery aliases and extracts attributes (numbers, tails, zodiacs, wave colors, combinations, not-ins).
    使用正则表达式将自然语言投注输入解析为 `src/types.ts` 中定义的结构化 JSON 配置。它根据识别出的彩种别名分割字段，并提取属性（号码、尾数、生肖、波色、合数、不中等）。
3.  **Winning Evaluation / 中奖计算 (`src/utils/winningCalculator.ts`)**: Evaluates parsed bets against a user-locked set of draw numbers (6 normal numbers, 1 special number). It applies precise payouts, odds multipliers (handling special rules like Horse flat zodiac 1.8x odds and different baseline odds per lottery type), and calculates the winning breakdown.
    根据用户锁定的开奖号码（6 个正码，1 个特码）评估解析后的注单。它应用精确的赔率、赔率乘数（处理特殊规则，如平特肖马 1.8 倍赔率以及不同彩种的基准赔率），并计算中奖明细。
4.  **Export Engine / 导出引擎 (`src/App.tsx`)**: Uses `exceljs` to export results. It builds rich-text formatted worksheets, highlighting winning numbers in red, blue, or green to match wave colors (using cell styling and fonts).
    使用 `exceljs` 导出结果。它构建富文本格式的工作表，根据波色用红、蓝、绿高亮显示中奖号码（使用单元格样式和字体）。
5.  **Storage Layer / 存储层 (`src/utils/storage.ts`)**: Syncs state with localStorage automatically.
    自动将状态同步到 localStorage。
6.  **Backend / 后端 (`server.ts`)**: Lightweight Express server serving static assets in production or wrapping the Vite dev middleware.
    轻量级 Express 服务器，在生产环境中提供静态资源托管，或在开发环境中包装 Vite 开发中间件。

### Crucial Constraints & Types / 关键约束与类型
*   **Draw Numbers array / 开奖号码数组**: Must contain exactly 7 elements (last element is the special/extra number).
    必须包含且仅包含 7 个元素（最后一个元素是特码/特别号）。
*   **Colors / 波色**: Numbers 1-49 are mapped to Red, Blue, and Green wave colors in `src/constants.ts`.
    1-49 的号码在 `src/constants.ts` 中被映射为红、蓝、绿波色。
*   **Zodiac indices / 生肖索引**: Determined by `(num - 1) % 12` mapped against a fixed list of zodiac characters.
    由 `(num - 1) % 12` 计算得出，并映射到一个固定的生肖字符列表。
