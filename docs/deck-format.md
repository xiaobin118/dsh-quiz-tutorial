# 题集 JSON 格式

题集是纯 JSON，保存在 `~/.dsh/dsh-quiz/decks/<id>.json`（内置题集在包内 `decks/`，只读）。
Host 在读取和保存时会校验下列规则；不合法的文件不会进入列表，并出现在 `errors` 诊断里。

## 顶层

```jsonc
{
  "version": 1,                 // 固定 1
  "id": "ml-cnn",               // 小写字母/数字/-/_，最长 64；决定文件名
  "title": "CNN 卷积 / 池化计算专项",
  "subject": "机器学习",
  "description": "一句话说明",
  "notes": [                    // 速查卡，最多 20 张
    { "title": "卷积输出尺寸", "body": "H_out = ⌊(H + 2P − K)/S⌋ + 1" }
  ],
  "questions": [ /* 1–100 道 */ ]
}
```

## 题目

```jsonc
{
  "id": "q1",                   // 可省略，默认 q1..；同一题集内唯一
  "topic": "单通道卷积 + 偏置 + 最大池化",
  "level": "基础",               // 基础 / 进阶 / 挑战 / 概念，自由文本
  "prompt": "题干必须自包含",
  "inputs": [
    { "label": "X", "matrix": [[1, 0], [0, 1]] },
    { "label": "b", "scalar": -1 }
  ],
  "conditions": "P=0，S=1；然后 2×2、步长 2 最大池化",
  "options": [                   // 2–6 个，互不重复
    { "kind": "matrix", "matrix": [[2, 4], [4, 3]] },
    { "kind": "matrix", "matrix": [[3, 5], [5, 4]], "note": "漏加偏置 b=−1" },
    { "kind": "text", "text": "448", "note": "只算了权重，漏了 16 个偏置" }
  ],
  "answer": 0,                   // 0 基下标
  "formula": "H_out = ⌊(H + 2P − K)/S⌋ + 1；最大池化取窗口最大值",
  "pitfall": "偏置在卷积之后、池化之前只加一次",
  "steps": [
    {
      "title": "第 1 步 · 输出尺寸",
      "body": "⌊(5 − 2)/1⌋ + 1 = 4，所以卷积结果是 4×4。",
      "matrices": [
        { "label": "卷积结果", "matrix": [[2, -1], [0, -1]] }
      ]
    }
  ]
}
```

## 约束

- `inputs` 每项只能是 `matrix` 或 `scalar` 之一，最多 8 项；
- 矩阵必须是矩形数字数组，每维最多 12；不能有空行/空列；
- `options` 2–6 个；matrix 或 text；同一题的选项值不能重复；
- `answer` 必须是合法下标（0 基）；
- `steps` 至少 1 步，最多 40 步；每步 `title/body` 必填；每步最多 4 个 `matrices`；
- `notes` 最多 20 张；`description` 600 字内；
- `id` 不能与内置题集冲突；冲突时用户题集覆盖内置版本（删除用户版本后内置恢复）。

## 质量规则

Host 只校验格式，**数值正确性由出题者负责**：

1. 答案和每个中间量自己算一遍；计算题在 `steps` 里写出代入过程和矩阵；
2. 错误选项尽量是真实易错点，并在 `note` 里说明为什么错；
3. 概念题 `steps` 写判断依据、反例或易错点，不需要矩阵；
4. 内置题集的数字由 `tools/gen_decks.py` 计算并断言选项唯一，可参考它的写法。

## 生成方式

- 在 dsh 里 `/skill dsh-quiz <主题>`，Agent 会按 [skill.md](../skill.md) 生成并保存；
- 或手写 JSON 放到 `~/.dsh/dsh-quiz/decks/`，刷新刷题场；
- 数值题建议在 `tools/gen_decks.py` 里加用例，跑通后再提交。
