# 题集 JSON 格式

题集是纯 JSON，保存在 `~/.dsh/dsh-quiz/decks/<id>.json`；插件不预置内置题集。
Host 在读取和保存时会校验下列规则；不合法的文件不会进入列表，并出现在 `errors` 诊断里。

两条硬规则（1.0.1 起由一个契约统一约束）：

- **文件名必须等于 `<id>.json`**。列表、保存、删除都按这个地址工作；文件名与内容 `id` 不一致的
  手写文件会被跳过并写进 `errors`，不会出现「删了还在」或「保存了却看不到」。
- **单套题集序列化后上限 512 KiB**。保存前按字节检查，超过就报错且不写任何文件；读取时同样
  按字节判断，所以「保存成功」的题集一定能被列表读到。

## 顶层

```jsonc
{
  "version": 1,                 // 固定 1
  "id": "ml-cnn",               // 小写字母/数字/-/_，最长 64；同时决定文件名 ml-cnn.json
  "title": "CNN 卷积 / 池化计算专项",
  "subject": "机器学习",
  "description": "一句话说明",
  "notes": [                    // 速查卡，最多 20 张
    { "title": "卷积输出尺寸", "body": "$H_{out} = \\lfloor(H + 2P - K)/S\\rfloor + 1$" }
  ],
  "questions": [ /* 1–100 道 */ ]
}
```

## 题目

```jsonc
{
  "id": "q1",                   // 可省略，默认 q1..；同一题集内必须唯一
  "topic": "单通道卷积 + 偏置",   // 必填
  "level": "进阶·找错",          // 难度·题型，自由文本，最长 20 字
  "prompt": "题干必须自包含",
  "inputs": [
    { "label": "X", "matrix": [[1, 0], [0, 1]] },
    { "label": "K", "matrix": [[1, -1], [0, 2]] },
    { "label": "b", "scalar": -1 }
  ],
  "conditions": "P=0，S=1，不使用激活函数",
  "options": [                   // 2–6 个，互不重复
    { "kind": "matrix", "matrix": [[2]] },
    { "kind": "matrix", "matrix": [[3]], "note": "漏加偏置 $b = -1$" },
    { "kind": "matrix", "matrix": [[4]], "note": "偏置符号弄反：3 + 1 = 4" }
  ],
  "answer": 0,                   // 0 基下标
  "formula": "$H_{out} = \\lfloor(H + 2P - K)/S\\rfloor + 1$",
  "pitfall": "偏置在卷积之后加，且只加一次",
  "steps": [
    {
      "title": "第 1 步 · 输出尺寸",
      "body": "无填充 $P=0$、核 $2\\times2$、步长 $S=1$：$\\lfloor(2 - 2)/1\\rfloor + 1 = 1$，所以输出是 $1\\times1$。"
    },
    {
      "title": "第 2 步 · 代入",
      "body": "$1\\times1 + 0\\times(-1) + 0\\times0 + 1\\times2 = 3$；再加偏置 $b = -1$，得到 $2$。",
      "matrices": [{ "label": "卷积结果", "matrix": [[2]] }]
    },
    {
      "title": "第 3 步 · 验算",
      "body": "输出只有一个数，与 $1\\times1$ 一致；$3 + (-1) = 2$，与所选答案一致。"
    }
  ]
}
```

上面这道题是完整可算的：`inputs` 是 `$2\times2$`，`P=0`、`S=1`，卷积只产生一个值 `[[2]]`，
没有池化。写文档或出题时不要让示例的矩阵尺寸和 `steps` 里的尺寸推导对不上
（1.0.0 的示例就犯过这个错：2×2 输入却写 4×4 输出加 2×2 池化）。

## 约束

- `id`：小写字母/数字/`-`/`_`，以字母或数字开头，最长 64；**文件名必须是 `<id>.json`**；
- `title` ≤ 120、`subject` ≤ 60、`description` ≤ 600；
- `questions` 1–100 道；每道题的 `id` 在同一题集内必须唯一（重复会直接报错，不会静默改名）；
- `options` 2–6 个；matrix 或 text；同一题的选项值不能重复；`answer` 是合法 0 基下标；
- `inputs` 每项只能是 `matrix` 或 `scalar` 之一，最多 8 项；
- 矩阵必须是矩形数字数组，每个维度最多 12；不能有空行/空列；
- `steps` 至少 1 步、最多 40 步；每步 `title`/`body` 必填，最多 4 个 `matrices`；
- `notes` 最多 20 张；
- 文本上限（按字符计，超长直接报错，**不会静默截断**）：`prompt` / 单步 `body` 4000，
  选项文字 400、选项 `note` 300，`formula` 800，`pitfall` / `conditions` 600，速查卡 `body` 2000；
- 整套题集序列化后 ≤ 512 KiB（保存前按 UTF-8 字节检查）。

## 公式写法（LaTeX，1.0.1 起）

题面、解析、速查卡由 DSH 的 **KaTeX Markdown 渲染器**显示，公式按 LaTeX 书写：

- 行内公式用 `$...$`：`$\mu_k$`、`$\sigma_k^2$`、`$\hat{x}_i$`、`$H_{out}$`；
- 独立公式用 `$$...$$`：
  `$$J = \sum_{k=1}^{K} \sum_{x \in C_k} \|x - \mu_k\|^2$$`；
- 常用：`\frac{a}{b}`、`\sqrt{x}`、`\sum` `\prod` `\int`、上下标 `_{...}` `^{...}`、
  希腊字母 `\alpha \beta \mu \sigma \Sigma`、运算符 `\times \cdot \le \ge \ne \approx \in \to`、
  矩阵 `\begin{bmatrix} ... \end{bmatrix}`；
- 竖直/水平间距、`\left` `\right`、`\text{中文说明}` 都可用；不支持 HTML、Markdown 图片/链接
  （渲染器会去掉远程媒体），也不接受 Unicode 数学符号。

**必须写 LaTeX**：`$\mu_k$` 而不是 `μ_k`，`$\sigma^2$` 而不是 `σ²`，`$x_i$` 而不是 `x_i`。
旧题集（1.0.0 之前）里的 Unicode 数学与裸 `_`/`^` 会在渲染时自动转成 LaTeX 作为兼容，但新写的题集
必须直接使用 LaTeX。

JSON 字符串里的反斜杠要双写：`\\times` 而不是 `\times`；`\\frac`、`\\right`、`\\nabla` 同理。
只写一个会被 JSON 当成转义（`\t`/`\f`/`\r`/`\n`），Host 会拒绝这类控制字符和行内公式换行。

## 质量规则

Host 只校验格式，**数值正确性由出题者负责**：

1. 答案和每个中间量自己算一遍；计算题在 `steps` 里写出代入过程和矩阵；
2. 错误选项尽量是真实易错点，并在 `note` 里说明为什么错；
3. 概念题 `steps` 写判断依据、反例或易错点，不需要矩阵。

## 生成方式

- 在 dsh 里 `/skill dsh-quiz <主题>`，Agent 会按 [skill.md](../skill.md) 生成并保存；
- 或手写 JSON 放到 `~/.dsh/dsh-quiz/decks/<id>.json`（文件名务必等于 id），刷新刷题场；
- 删掉某套题集的 JSON 后刷新刷题场即可移除；页面上的 × 也会删除文件。
