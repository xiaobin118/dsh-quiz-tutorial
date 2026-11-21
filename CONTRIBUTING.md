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
- Python 3（只有 `tools/gen_decks.py` 需要，纯标准库）

没有构建步骤，没有第三方运行时依赖。检查：

```sh
npm run check                    # node --check index.js client.js
python3 tools/gen_decks.py       # 重新生成并验算内置题集
```

结构：

```
index.js            Host：GET /dsh-quiz/decks、POST /dsh-quiz/decks/delete、quiz_* 工具、dsh-quiz 技能
client.js           Web UI：main(quiz) + sidebar.panellist(quiz)
decks/*.json        内置题集（随包分发，只读）
skill.md            /skill 出题规范
tools/gen_decks.py  内置题集的生成与断言脚本
docs/deck-format.md 题集字段与约束
```

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
- 内置题集由 `tools/gen_decks.py` 生成；加数值题时优先在脚本里加用例并跑通。

## 代码约定

- `client.js` 不 `require` 任何 Harness Client 包（只用 `react`），样式只用 `--dsw-alias-*` token；
- 可见文案走 `ctx.locale`，zh/en 两份字典都要加；
- Host 不引入第三方依赖；错误统一返回 `{ ok: false, message }`；
- 路由只接受本机回环 Host；删除只允许用户题集，不允许删内置题集；
- 不添加遥测、外部请求或凭据读取。

## PR 流程

1. Fork 并开分支；
2. 改代码/题集，跑 `npm run check`（题集再跑一次生成脚本）；
3. PR 里写清楚：改了什么、怎么验证的、截图（UI 改动）；
4. 一个 PR 聚焦一件事。

发现 bug 请开 issue，附上 dsh 版本、复现步骤和截图；安全问题请私信维护者而不是公开 issue。

## License

贡献即同意以 [MIT](LICENSE) 发布。
