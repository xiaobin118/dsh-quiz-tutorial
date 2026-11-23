# 出题：把复习内容变成「刷题场」题集

用户在 `/skill dsh-quiz` 后通常会给出主题，例如 `/skill dsh-quiz 自编码器与 VAE`。
如果没给主题，就用当前对话里正在复习的内容；仍然不明确时先问一句，别猜。

## 1. 先看已有题集

调用 `quiz_list_decks`。如果同主题的题集已经存在：

- 用户只要求「复习/出题」且已有同 id 题集：先问是覆盖更新，还是用新 id 新建；
- 新建时用能区分范围的 id，例如 `ml-vae-2`，不要悄悄覆盖别人的题集。

## 2. 设计题目（硬性要求）

- 题数 5–15，由易到难，覆盖该主题的核心计算与概念，不要只出名词解释。
- **每道题的答案和全部中间量都必须自己算对**，再写进 `steps`；禁止估算、凭记忆填数、占位。
- 计算题要在 `steps` 里逐步写：
  1. 第 1 步：公式与输出尺寸/已知量；
  2. 第 2 步：代入并写出中间结果；
  3. 第 3 步：完整结果（矩阵用 `matrices`）；
  4. 验算：用另一种方式复算一次，或检查边界/量纲/范围。
- 概念题在 `steps` 里写判断依据、反例和常见误区即可。
- `options` 2–6 个，`answer` 是 0 基下标；错误选项要像真实学生会犯的错
  （漏偏置、忘记除以窗口大小、padding 方向反了等），并在 `note` 里说明错因。
- `prompt` 必须自包含；矩阵放 `inputs`（`matrix`）或题干文字里；P/S/激活函数/池化窗口
  这类约定写进 `conditions`。
- `formula` 写本题用到的公式或知识点，`pitfall` 写最容易错的一点。
- `deck.notes` 放 3–6 张速查卡（公式、易错清单），不要复制整段讲义。
- 题集标题/学科/描述用中文；`id` 用小写 kebab-case。

## 3. 公式必须写 LaTeX（硬性要求）

「刷题场」用 DSH 的 KaTeX Markdown 渲染器显示题面、解析和速查卡。**所有数学必须写成 LaTeX 并用
`$...$`（行内）或 `$$...$$`（独立公式）包起来**；不要写 Unicode 数学，也不要写裸的 `_` / `^` 上下标。

必须这样写：

- 行内：`$\mu_k$`、`$\sigma_k^2$`、`$\hat{x}_i$`、`$H_{out} = \lfloor(H + 2P - K)/S\rfloor + 1$`；
- 独立公式：`$$J = \sum_{k=1}^{K} \sum_{x \in C_k} \|x - \mu_k\|^2$$`；
- 分数 `$\frac{a}{b}$`、根号 `$\sqrt{x}$`、求和 `$\sum_{k=1}^{K}$`、范数 `$\|x - \mu_k\|^2$`；
- 希腊字母与运算符一律用命令：`\alpha \beta \gamma \pi \sigma \mu \Sigma`、`\times \cdot \le \ge \ne \approx \in \to \infty`；
- 矩阵可以写成 `$\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$`，或用 `inputs` 的 `matrix` 字段。

**禁止**（会被判为不合格的题集）：

- 用 Unicode 数学字符代替 LaTeX：`Σ_{k=1}^{K}`、`μ_k`、`σ²`、`x̂`、`∈`、`×`、`≤`、`⌊…⌋`；
- 在 `$...$` 之外写 `_` / `^`（`H_out`、`x^2` 必须写成 `$H_{out}$`、`$x^2$`）；
- 用 HTML、Markdown 图片或链接代替公式（渲染器会丢弃远程图片/链接，也不会执行 HTML）；
- 把整段讲义塞进公式里——公式只放数学，中文说明留在正文。

旧题集里的 Unicode 数学会在显示时尽量自动转换，但**新题集必须直接写 LaTeX**：转换只是兼容层，
不是出题规范。

## 4. 保存并告诉用户

用 `quiz_save_deck` 保存完整题集 JSON 字符串。保存成功后告诉用户：

- 打开左侧「刷题场」，点「刷新题集」就能看到；
- 做错的题会自动进错题本；
- 题集可以在左侧题集列表右上角点 × 删除；插件不预置内置题集。

不要声称已经替用户答过题；不要把未验证的数字写进题集。

保存失败时按工具返回的错误改：常见原因是超过 512 KiB 上限、某个字段超过字符上限、
题目 id 重复或 `answer` 越界——Host 会明确报错，不会静默截断或改名。

## 5. 题集 JSON 结构

```json
{
  "id": "ml-conv-1",
  "title": "单通道卷积入门",
  "subject": "机器学习",
  "description": "一道完整可算的 $2\\times2$ 卷积示例。",
  "notes": [
    { "title": "卷积输出尺寸", "body": "$H_{out} = \\lfloor(H + 2P - K)/S\\rfloor + 1$" }
  ],
  "questions": [
    {
      "id": "q1",
      "topic": "单通道卷积 + 偏置",
      "level": "基础",
      "prompt": "给定 X、K、b，P=0、S=1、不使用激活函数。输出矩阵是？",
      "inputs": [
        { "label": "X", "matrix": [[1, 0], [0, 1]] },
        { "label": "K", "matrix": [[1, -1], [0, 2]] },
        { "label": "b", "scalar": -1 }
      ],
      "conditions": "P=0，S=1，不使用激活函数。",
      "options": [
        { "kind": "matrix", "matrix": [[2]] },
        { "kind": "matrix", "matrix": [[3]], "note": "漏加偏置 $b = -1$" },
        { "kind": "matrix", "matrix": [[4]], "note": "偏置符号弄反：3 + 1 = 4" }
      ],
      "answer": 0,
      "formula": "$H_{out} = \\lfloor(H + 2P - K)/S\\rfloor + 1$",
      "pitfall": "偏置在卷积之后加，且只加一次。",
      "steps": [
        {
          "title": "第 1 步 · 输出尺寸",
          "body": "$\\lfloor(2 - 2)/1\\rfloor + 1 = 1$，所以输出是 $1\\times1$。"
        },
        {
          "title": "第 2 步 · 代入",
          "body": "$1\\times1 + 0\\times(-1) + 0\\times0 + 1\\times2 = 3$；再加 $b = -1$，得到 $2$。",
          "matrices": [{ "label": "卷积结果", "matrix": [[2]] }]
        },
        {
          "title": "第 3 步 · 验算",
          "body": "$3 + (-1) = 2$，与所选答案一致；输出只有一个数，与 $1\\times1$ 的推导一致。"
        }
      ]
    }
  ]
}
```

字段约束：`options` 2–6 个；`answer` 是 0 基下标；矩阵必须是矩形数字数组；
每题至少一个 `step`；`inputs` 每项只能是 `matrix` 或 `scalar` 之一；
单套题集序列化后不超过 512 KiB；题目 id 在题集内唯一。完整约束见
[docs/deck-format.md](docs/deck-format.md)。
