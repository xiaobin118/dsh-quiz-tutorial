# Contributing to dsh-quiz-tutorial

Thanks for helping! · 欢迎参与！

## 可以贡献什么

- **题集**：任何学科（数学、SQL、计算机网络、机器学习……），只要答案经过验算；
- **UI / 交互 / 可访问性**：`client.js`，纯 React.createElement，不引入宿主私有包；
- **翻译**：`locale/zh.json`、`locale/en.json` 与 README；
- **Host**：`index.js` 的路由、工具、deck 校验；
- **文档 / 截图 / bug 报告**。

新功能请先开 issue 或 discussion 说清场景，避免方向不一致；小修复可以直接 PR。

## 开发环境

- Node.js 22+（与 dsh 一致）

没有构建步骤，没有第三方运行时依赖。检查：

```sh
npm run check                        # node --check index.js && node --check client.js
npm test                             # node --test test/（无依赖、无网络）
```

结构：

```
index.js            Host：GET /dsh-quiz/decks、POST /dsh-quiz/decks/delete、quiz_* 工具、dsh-quiz 技能
client.js           Web UI 构建产物（DSH 只加载它；改源码后跑 npm run build:client）
client/src/         Web UI 源码：base·locale·styles·text·math·state + components·notebook·page·panel
skill.md            /skill 出题规范
tools/build_client.mjs  client/src -> client.js 的零依赖拼接脚本
test/*.test.js      node:test 回归测试（校验上限、存储契约、路由栅栏、客户端）
docs/deck-format.md 题集字段与约束
```

DSH 客户端模块系统只服务一个 bundle 且只把 `require` 解析到平台模块表，所以源码按模块拆分、
产物仍是单文件：改 `client/src/*.js` 后必须 `npm run build:client`；`npm run check` 会检查产物
是否与源码同步。

Host 代码更新后必须重启 `dsh web`；只改 `client.js` 时刷新页面即可。

## 题集贡献

题集是数据，不需要改代码。两种方式：

1. 在 dsh 里运行 `/skill dsh-quiz <主题>`，让 Agent 生成并保存，然后把
   `~/.dsh/dsh-quiz/decks/<id>.json` 提 PR 到 `decks/`；
2. 手写 JSON，按 [docs/deck-format.md](docs/deck-format.md) 的格式。

硬性要求：

- **每道题的答案和中间量必须自己算对**，写进 `steps`；禁止估算或占位；
- 计算题要有尺寸/公式、代入、中间结果、验算；矩阵放进 `matrices`；
- `options` 2–6 个，`answer` 是 0 基下标；错误选项尽量对应真实易错点；
- 概念题不需要矩阵，但 `steps` 要写判断依据与易错点；
- 公式必须写 LaTeX 并用 `$...$` / `$$...$$` 包住（KaTeX，支持 `bmatrix`）；不要用 Unicode
  数学符号或裸 `_`/`^`（见 [docs/deck-format.md](docs/deck-format.md)）；
- 手写题集放在 `~/.dsh/dsh-quiz/decks/<id>.json`，文件名必须等于 `<id>`；单套 ≤ 512 KiB；
- 插件不预置内置题集；题集由 `/skill dsh-quiz` / `quiz_save_deck` 生成，或手写到
  `~/.dsh/dsh-quiz/decks/<id>.json`。所有题集都可以在页面里删除。

## 代码约定

- `client.js` 只 `require('react')` 与平台提供的 `@deepseek-ai/dsh-client-ui-primitives`
  （`MarkdownText`/KaTeX），不引入其他运行时依赖；样式只用 `--dsw-alias-*` token；
- 可见文案走 `ctx.locale`，zh/en 两份字典都要加；
- Host 不引入第三方依赖；失败统一返回 `{ ok: false, code, message }`：路由错误就是这个形状，
  `quiz_save_deck` / `quiz_delete_deck` 的工具结果也一样（`invalid-argument`、`invalid-json`、
  `invalid-deck`、`deck-too-large`、`write-failed`、`invalid-id`、`not-found`、`delete-failed`）；
  成功结果至少含 `{ ok: true, message }`，可以带 `path` / `bytes` / `decks` / `errors` 等附加字段；
- 两条 Web 路由必须先过 dsh 的信任栅栏（`ctx.connection.requestRejection(req)`），
  再检查方法 / `content-type`，最后才读 body；空 `Host` 一律拒绝；没有 `connection` 时 fail-closed。
- 删除/列表/保存按同一个文件名契约工作：文件名 == `<id>.json`；
- 不添加遥测、外部请求或凭据读取；题集文本只作为 React 文本渲染，不解析 HTML。

## PR 流程

1. Fork 并开分支；
2. 改代码，跑 `npm run check`、`npm test`；
3. PR 里写清楚：改了什么、怎么验证的、截图（UI 改动）；
4. 一个 PR 聚焦一件事。

发现 bug 请开 issue，附上 dsh 版本、复现步骤和截图；安全问题请私信维护者而不是公开 issue。

## License

贡献即同意以 [MIT](LICENSE) 发布。
