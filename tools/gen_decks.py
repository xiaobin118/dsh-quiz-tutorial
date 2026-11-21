#!/usr/bin/env python3
"""Author and verify the bundled quiz decks for the dsh-quiz plugin.

Every numeric answer and every intermediate matrix is computed here with an
independent, plain-Python implementation; nothing is typed by hand.  The
script refuses to write a deck when an option duplicates another option or
when the correct option is not unique.

Run:  python3 tools/gen_decks.py
Out:  decks/ml-cnn.json, decks/ml-core.json
"""
from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "decks"

MINUS = "\u2212"


# ---------------------------------------------------------------------------
# numeric helpers (exact rational arithmetic; no floats in the middle)
# ---------------------------------------------------------------------------
def F(x) -> Fraction:
    return x if isinstance(x, Fraction) else Fraction(x)


def value(x):
    """JSON-friendly number: int when integral, else a 3-decimal float."""
    fr = F(x)
    if fr.denominator == 1:
        return int(fr)
    return round(float(fr), 3)


def fmt(x) -> str:
    """Display a number with a real minus sign and no trailing zeros."""
    v = value(x)
    if isinstance(v, int):
        return str(v).replace("-", MINUS)
    text = f"{v:.3f}".rstrip("0").rstrip(".")
    return text.replace("-", MINUS)


def matrix_values(m):
    return [[value(v) for v in row] for row in m]


def operand(v) -> str:
    """Wrap a negative operand so '0×−1' renders as '0×(−1)'."""
    shown = fmt(v)
    return f"({shown})" if shown.startswith(MINUS) else shown


def matrix_text(m) -> str:
    return "[" + "; ".join(", ".join(fmt(v) for v in row) for row in m) + "]"


# ---------------------------------------------------------------------------
# convolution / pooling primitives
# ---------------------------------------------------------------------------
def as_channels(img):
    """A 2-D list means one channel; a list of 2-D lists means C channels."""
    return img if isinstance(img[0][0], list) else [img]


def pad_matrix(m, p):
    if p == 0:
        return [list(row) for row in m]
    h, w = len(m), len(m[0])
    out = [[0] * (w + 2 * p) for _ in range(h + 2 * p)]
    for i in range(h):
        for j in range(w):
            out[i + p][j + p] = F(m[i][j])
    return out


def conv_channels(channels, kernels, bias=0, pad=0, stride=1):
    """Return (output matrix, padded channels). kernels[i] belongs to channels[i]."""
    assert len(channels) == len(kernels), "one kernel per input channel"
    padded = [pad_matrix(c, pad) for c in channels]
    h, w = len(padded[0]), len(padded[0][0])
    kh, kw = len(kernels[0]), len(kernels[0][0])
    oh = (h - kh) // stride + 1
    ow = (w - kw) // stride + 1
    out = [[Fraction(0) for _ in range(ow)] for _ in range(oh)]
    for i in range(oh):
        for j in range(ow):
            total = Fraction(0)
            for c, kern in enumerate(kernels):
                for a in range(kh):
                    for b in range(kw):
                        total += F(padded[c][i * stride + a][j * stride + b]) * F(kern[a][b])
            out[i][j] = total + F(bias)
    return out, padded


def conv_terms(channels, kernels, bias, pad, stride, i, j):
    """One fully expanded convolution term list, e.g. ['1×1', '0×(−1)', ...]."""
    padded = [pad_matrix(c, pad) for c in channels]
    kh, kw = len(kernels[0]), len(kernels[0][0])
    terms = []
    raw = Fraction(0)
    for c, kern in enumerate(kernels):
        for a in range(kh):
            for b in range(kw):
                xv = F(padded[c][i * stride + a][j * stride + b])
                kv = F(kern[a][b])
                raw += xv * kv
                terms.append(f"{operand(xv)}×{operand(kv)}")
    return terms, raw, raw + F(bias)


def pool(m, size=2, stride=2, mode="max"):
    h, w = len(m), len(m[0])
    oh = (h - size) // stride + 1
    ow = (w - size) // stride + 1
    out = []
    windows = []
    for i in range(oh):
        row = []
        for j in range(ow):
            vals = [F(m[i * stride + a][j * stride + b]) for a in range(size) for b in range(size)]
            windows.append(vals)
            if mode == "max":
                row.append(max(vals))
            elif mode == "min":
                row.append(min(vals))
            elif mode == "avg":
                row.append(sum(vals) / len(vals))
            else:
                raise ValueError(mode)
        out.append(row)
    return out, windows


def relu(m):
    return [[max(F(0), F(v)) for v in row] for row in m]


def gap(m):
    vals = [F(v) for row in m for v in row]
    return sum(vals) / len(vals)


def flip_kernel(k):
    return [list(reversed(row)) for row in reversed(k)]


def add_scalar(m, delta):
    return [[F(v) + F(delta) for v in row] for row in m]


def pad_ones(m, p):
    h, w = len(m), len(m[0])
    out = [[Fraction(1)] * (w + 2 * p) for _ in range(h + 2 * p)]
    for i in range(h):
        for j in range(w):
            out[i + p][j + p] = F(m[i][j])
    return out


def pad_edge(m, p):
    h, w = len(m), len(m[0])
    out = [[F(0)] * (w + 2 * p) for _ in range(h + 2 * p)]
    for i in range(h + 2 * p):
        for j in range(w + 2 * p):
            si = min(max(i - p, 0), h - 1)
            sj = min(max(j - p, 0), w - 1)
            out[i][j] = F(m[si][sj])
    return out


def conv_with_padded(padded, kernels, bias=0, stride=1):
    h, w = len(padded[0]), len(padded[0][0])
    kh, kw = len(kernels[0]), len(kernels[0][0])
    oh = (h - kh) // stride + 1
    ow = (w - kw) // stride + 1
    out = [[Fraction(0) for _ in range(ow)] for _ in range(oh)]
    for i in range(oh):
        for j in range(ow):
            total = Fraction(0)
            for c, kern in enumerate(kernels):
                for a in range(kh):
                    for b in range(kw):
                        total += F(padded[c][i * stride + a][j * stride + b]) * F(kern[a][b])
            out[i][j] = total + F(bias)
    return out


def pool_windows_text(m, size, stride, mode="max"):
    _, windows = pool(m, size, stride, mode)
    h, w = len(m), len(m[0])
    oh = (h - size) // stride + 1
    parts = []
    idx = 0
    for i in range(oh):
        for j in range(oh if False else (w - size) // stride + 1):
            vals = windows[idx]
            idx += 1
            shown = ", ".join(fmt(v) for v in vals)
            if mode == "max":
                parts.append(f"[{shown}] → max {fmt(max(vals))}")
            elif mode == "min":
                parts.append(f"[{shown}] → min {fmt(min(vals))}")
            else:
                total = sum(vals)
                parts.append(f"[{shown}] → {fmt(total)}/{len(vals)} = {fmt(total / len(vals))}")
    return "；".join(parts)


def mat(label, m):
    return {"label": label, "matrix": matrix_values(m)}


def step(title, body, matrices=None):
    out = {"title": title, "body": body}
    if matrices:
        out["matrices"] = matrices
    return out


# ---------------------------------------------------------------------------
# option assembly
# ---------------------------------------------------------------------------
def key_of(opt):
    """Identity of an option's VALUE; the note is not part of the choice."""
    return json.dumps(opt.get("matrix") if opt["kind"] == "matrix" else opt.get("text"),
                      ensure_ascii=False, sort_keys=True)


def mk_option_correct(correct):
    if isinstance(correct, list):
        return {"kind": "matrix", "matrix": matrix_values(correct)}
    return {"kind": "text", "text": str(correct)}


def mk_option_wrong(entry):
    mat_or_text, note = entry
    if isinstance(mat_or_text, list):
        return {"kind": "matrix", "matrix": matrix_values(mat_or_text), "note": note}
    return {"kind": "text", "text": str(mat_or_text), "note": note}


def assemble_options(correct, wrongs, answer_index):
    opts = [mk_option_correct(correct)]
    for w in wrongs:
        opts.append(mk_option_wrong(w))
    while len(opts) < 4:
        raise AssertionError("need exactly three distractors")
    if len(opts) != 4:
        raise AssertionError("exactly four options required")
    keys = [key_of(o) for o in opts]
    if len(set(keys)) != 4:
        raise AssertionError(f"duplicate options: {keys}")
    correct_key = key_of(opts[0])
    ordered = [None] * 4
    ordered[answer_index] = opts[0]
    rest = opts[1:]
    for i in range(4):
        if i == answer_index:
            continue
        ordered[i] = rest.pop(0)
    assert key_of(ordered[answer_index]) == correct_key
    return ordered


def question(qid, topic, level, prompt, inputs, conditions, correct, wrongs,
             answer_index, formula, steps, pitfall, options_are_text=False):
    options = assemble_options(correct, wrongs, answer_index)
    if options_are_text:
        for o in options:
            assert o["kind"] == "text", "text deck expects text options"
    return {
        "id": qid,
        "topic": topic,
        "level": level,
        "prompt": prompt,
        "inputs": inputs,
        "conditions": conditions,
        "options": options,
        "answer": answer_index,
        "formula": formula,
        "steps": steps,
        "pitfall": pitfall,
    }


def scalar_input(label, v):
    return {"label": label, "scalar": value(v)}


def mat_input(label, m):
    return {"label": label, "matrix": matrix_values(m)}


# ---------------------------------------------------------------------------
# Deck 1 — CNN convolution / padding / pooling calculation drill
# ---------------------------------------------------------------------------
def cnn_deck():
    qs = []

    # -- Q1: single channel + bias + max pool ---------------------------------
    X1 = [[1, 0, 2, 1, 0],
          [0, 1, 1, 0, 2],
          [2, 1, 0, 1, 1],
          [1, 0, 2, 2, 0],
          [0, 2, 1, 0, 1]]
    K1 = [[1, -1], [0, 2]]
    C1, _ = conv_channels([X1], [K1], bias=-1)
    C1_nobias, _ = conv_channels([X1], [K1], bias=0)
    P1, _ = pool(C1, 2, 2, "max")
    P1_nobias, _ = pool(C1_nobias, 2, 2, "max")
    terms, raw, with_b = conv_terms([X1], [K1], -1, 0, 1, 0, 0)
    qs.append(question(
        "q1", "单通道卷积 + 偏置 + 最大池化", "基础",
        "给定单通道输入矩阵 X、卷积核 K 与偏置 b。先做无填充、步长 S=1 的二维卷积"
        "（加上偏置，不使用激活函数），再进行窗口 2×2、步长 2 的最大池化。最终输出矩阵是？",
        [mat_input("X", X1), mat_input("K", K1), scalar_input("b", -1)],
        "无填充（P=0），卷积步长 S=1；池化窗口 2×2、步长 2，全程不使用激活函数。",
        P1,
        [(P1_nobias, "忘记加偏置 b=−1，导致每个池化结果整体偏大。"),
         ([[2, 3], [3, 4]], "错误选项：池化窗口起点取错，四个窗口的数值都偏移了。"),
         ([[3, 4], [4, 4]], "错误选项：卷积结果错位一格后再池化。")],
        3,
        "H_out = ⌊(H + 2P − K)/S⌋ + 1；最大池化取窗口内最大值，偏置在卷积之后、池化之前加一次。",
        [
            step("第 1 步 · 卷积输出尺寸",
                 "无填充 P=0、卷积核 2×2、步长 S=1：H_out = ⌊(5 − 2)/1⌋ + 1 = 4，"
                 "W_out 同样是 4，所以卷积结果是 4×4。"),
            step("第 2 步 · 逐位置卷积再加偏置",
                 f"以左上角 (0,0) 为例：{' + '.join(terms)} = {fmt(raw)}；"
                 f"再加上偏置 b = {fmt(-1)}，得到 {fmt(with_b)}。其余位置按同样方式滑动，"
                 "完整卷积结果 C 如下。",
                 [mat("卷积结果 C（4×4）", C1)]),
            step("第 3 步 · 2×2 最大池化（步长 2）",
                 "把 C 切成 4 个互不重叠的 2×2 窗口，每个窗口取最大值："
                 + pool_windows_text(C1, 2, 2, "max") + "。",
                 [mat("池化结果（2×2）", P1)]),
            step("验算",
                 "池化输出的 4 个数依次来自 C 的左上、右上、左下、右下四个窗口；"
                 f"把 C 按窗口取 max 复算一遍，得到 {matrix_text(P1)}，与所选答案一致。"),
        ],
        "偏置只加一次，而且是在整个通道求和之后加；不要把它加进卷积核里，也不要在池化后再加。",
    ))

    # -- Q2: average pooling on a feature map --------------------------------
    X2 = [[0, 2, 4, 6],
          [2, 4, 6, 8],
          [4, 6, 8, 10],
          [6, 8, 10, 12]]
    P2, _ = pool(X2, 2, 2, "avg")
    P2_max, _ = pool(X2, 2, 2, "max")
    P2_sum = [[sum([F(X2[i * 2 + a][j * 2 + b]) for a in range(2) for b in range(2)])
               for j in range(2)] for i in range(2)]
    P2_half = [[sum([F(X2[i * 2 + a][j * 2 + b]) for a in range(2) for b in range(2)]) / 2
                for j in range(2)] for i in range(2)]
    qs.append(question(
        "q2", "平均池化", "基础",
        "对下面的特征图执行窗口 2×2、步长 2 的平均池化（窗口不重叠），输出特征图是？",
        [mat_input("特征图 F", X2)],
        "池化窗口 2×2，步长 2，窗口之间不重叠；平均池化对每个窗口求算术平均。",
        P2,
        [(P2_max, "把平均池化当成了最大池化：每个窗口取了最大值。"),
         (P2_sum, "只求和、忘了除以窗口元素个数 4。"),
         (P2_half, "除成了 2：窗口是 2×2 共 4 个元素，应除以 4 而不是 2。")],
        3,
        "平均池化：H_out = ⌊(H − K)/S⌋ + 1，每个窗口求和后除以 K×K。",
        [
            step("第 1 步 · 输出尺寸",
                 "池化没有填充，窗口 2×2、步长 2：H_out = ⌊(4 − 2)/2⌋ + 1 = 2，W_out = 2，"
                 "所以输出是 2×2，正好对应 4 个互不重叠的窗口。"),
            step("第 2 步 · 逐窗口求和再平均",
                 "左上窗口 [0,2;2,4]：0+2+2+4 = 8，8/4 = 2；右上窗口 [4,6;6,8]："
                 "4+6+6+8 = 24，24/4 = 6；左下窗口 [4,6;6,8]：同样是 24/4 = 6；"
                 "右下窗口 [8,10;10,12]：8+10+10+12 = 40，40/4 = 10。"
                 "四个窗口依次得到 2、6、6、10。",
                 [mat("平均池化结果（2×2）", P2)]),
            step("验算",
                 "把输入 16 个元素求和：0+2+…+12 = 96；四个输出 2+6+6+10 = 24，"
                 "24 × 4 = 96，与输入总和相等（平均池化不丢总和），说明没有算漏元素。"),
        ],
        "平均池化要除以窗口内的元素总数（2×2 就是 4），不是除以行数、列数或步长。",
    ))

    # -- Q3: zero padding with a 3x3 kernel ----------------------------------
    X3 = [[1, 2, 0],
          [0, 1, 3],
          [2, 0, 1]]
    K3 = [[1, 0, -1],
          [1, 0, -1],
          [1, 0, -1]]
    C3, padded3 = conv_channels([X3], [K3], bias=0, pad=1)
    C3_flip, _ = conv_channels([X3], [flip_kernel(K3)], bias=0, pad=1)
    edge3 = pad_edge(X3, 1)
    C3_edge = conv_with_padded([edge3], [K3], bias=0)
    ones3 = pad_ones(X3, 1)
    C3_ones = conv_with_padded([ones3], [K3], bias=0)
    terms3, raw3, with3 = conv_terms([X3], [K3], 0, 1, 1, 0, 0)
    qs.append(question(
        "q3", "零填充（same padding）", "进阶",
        "输入 3×3，卷积核 3×3，先做 P=1 的零填充，再以步长 S=1 做二维卷积（偏置 b=0，"
        "不使用激活函数）。输出矩阵是？",
        [mat_input("X", X3), mat_input("K", K3), scalar_input("b", 0)],
        "四周各补一圈 0（P=1），步长 S=1，无激活函数。",
        C3,
        [(C3_flip, "把卷积核上下、左右翻转了（相关运算与卷积运算混淆）。"),
         (C3_edge, "补边时复制了边缘像素，而不是补 0。"),
         (C3_ones, "补边时把 0 写成了 1。")],
        2,
        "P=1、K=3、S=1 时输出与输入同尺寸：H_out = ⌊(3 + 2 − 3)/1⌋ + 1 = 3。",
        [
            step("第 1 步 · 补零",
                 "输入四周各补一圈 0，得到 5×5 的矩阵；原来的 3×3 落在正中间，"
                 "这样卷积核在边界上也有完整的 3×3 窗口可放。",
                 [mat("补零后的输入（5×5）", padded3[0])]),
            step("第 2 步 · 输出尺寸",
                 "H_out = ⌊(3 + 2×1 − 3)/1⌋ + 1 = 3，W_out = 3；P=(K−1)/2 的 same padding "
                 "正好保持特征图尺寸不变。"),
            step("第 3 步 · 逐位置卷积（左上角为例）",
                 f"左上角窗口取补零矩阵的 (0..2, 0..2)：{' + '.join(terms3)} = {fmt(raw3)}，"
                 "偏置 b=0 所以结果不变。注意窗口里有 6 个 0，它们让边界位置的卷积值天然偏小。"
                 "其余位置同理，完整结果如下。",
                 [mat("卷积结果（3×3）", C3)]),
            step("验算",
                 "中心位置 (1,1) 的窗口正好就是原输入，K 的三列系数依次为 1、0、−1，"
                 "所以它等于“左列之和 − 右列之和” = (1+0+2) − (0+3+1) = −1，与矩阵中心一致。"),
        ],
        "padding 补的是 0，不是边缘复制；卷积（严格定义）要先把核翻转 180°，深度学习框架里的 "
        "conv2d 实际做的是互相关——按课件约定操作，别中途多翻一次。",
    ))

    # -- Q4: stride 2 ---------------------------------------------------------
    X4 = [[1, 0, 2, 1, 0, 3],
          [0, 1, 1, 0, 2, 0],
          [2, 1, 0, 1, 1, 2],
          [1, 0, 2, 2, 0, 1],
          [0, 2, 1, 0, 1, 0],
          [3, 1, 0, 2, 0, 1]]
    K4 = [[1, -1], [0, 2]]
    C4, _ = conv_channels([X4], [K4], bias=1, stride=2)
    C4_nobias, _ = conv_channels([X4], [K4], bias=0, stride=2)
    C4_flip, _ = conv_channels([X4], [flip_kernel(K4)], bias=1, stride=2)
    C4_s1, _ = conv_channels([X4], [K4], bias=1, stride=1)
    C4_s1_top = [row[:3] for row in C4_s1[:3]]
    terms4, raw4, with4 = conv_terms([X4], [K4], 1, 0, 2, 0, 0)
    qs.append(question(
        "q4", "步长 S=2 的卷积", "进阶",
        "输入 6×6，卷积核 2×2，偏置 b=1，无填充，卷积步长 S=2。输出矩阵是？",
        [mat_input("X", X4), mat_input("K", K4), scalar_input("b", 1)],
        "无填充（P=0），卷积步长 S=2；不使用激活函数，也不接池化。",
        C4,
        [(C4_nobias, "忘记加偏置 b=1。"),
         (C4_flip, "卷积核没有按题目约定使用，等价于上下左右翻转后再卷积。"),
         (C4_s1_top, "把步长当成了 1：窗口逐个像素滑动，只取了左上 3×3。")],
        1,
        "H_out = ⌊(H + 2P − K)/S⌋ + 1 = ⌊(6 − 2)/2⌋ + 1 = 3。",
        [
            step("第 1 步 · 输出尺寸",
                 "H_out = ⌊(6 + 0 − 2)/2⌋ + 1 = 3，W_out = 3；步长 2 意味着窗口每次跳 2 格，"
                 "窗口左上角只落在 0、2、4 三个位置。"),
            step("第 2 步 · 逐位置卷积再加偏置",
                 f"左上角 (0,0) 的窗口是 [1,0;0,1]：{' + '.join(terms4)} = {fmt(raw4)}；"
                 f"加偏置 b=1 得 {fmt(with4)}。窗口按步长 2 平移到 (0,2)、(0,4)、(2,0)…"
                 "每次覆盖的输入完全不重叠。完整结果如下。",
                 [mat("卷积结果（3×3）", C4)]),
            step("验算",
                 "9 个输出对应 9 个互不重叠的输入窗口（6×6 正好切成 3×3 个 2×2 块）。"
                 "任取右下输出核对：(2,2) 窗口 [1,0;0,1] 与 K 点积 = 1×1 + 0×(−1) + 0×0 + 1×2 = 3，"
                 "加 1 得 4，与矩阵右下角一致。"),
        ],
        "步长是窗口移动的格子数，不是输出尺寸；S=2 时输入中会有一部分像素根本没被任何窗口覆盖。",
    ))

    # -- Q5: two input channels ----------------------------------------------
    X5a = [[1, 0, 2],
           [0, 1, 0],
           [2, 1, 1]]
    X5b = [[0, 1, 0],
           [2, 0, 1],
           [1, 0, 2]]
    K5a = [[1, 0], [0, -1]]
    K5b = [[0, 1], [1, 0]]
    C5a, _ = conv_channels([X5a], [K5a], bias=0)
    C5b, _ = conv_channels([X5b], [K5b], bias=0)
    C5, _ = conv_channels([X5a, X5b], [K5a, K5b], bias=1)
    C5_only_a, _ = conv_channels([X5a], [K5a], bias=1)
    C5_avg = [[(C5a[i][j] + C5b[i][j]) / 2 + 1 for j in range(2)] for i in range(2)]
    C5_nobias = [[C5a[i][j] + C5b[i][j] for j in range(2)] for i in range(2)]
    ta, ra, _ = conv_terms([X5a], [K5a], 0, 0, 1, 0, 0)
    tb, rb, _ = conv_terms([X5b], [K5b], 0, 0, 1, 0, 0)
    qs.append(question(
        "q5", "多通道输入", "进阶",
        "输入有 2 个通道 X₁、X₂，每个通道各配一个 2×2 卷积核 K₁、K₂，偏置 b=1，"
        "无填充、步长 S=1。输出矩阵是？",
        [mat_input("X₁", X5a), mat_input("K₁", K5a),
         mat_input("X₂", X5b), mat_input("K₂", K5b), scalar_input("b", 1)],
        "两个通道分别卷积后逐元素相加，最后加一次偏置 b=1；无填充，步长 S=1。",
        C5,
        [(C5_only_a, "只算了通道 1 就加偏置，漏掉了通道 2。"),
         (C5_avg, "两个通道卷积后取了平均，而不是求和。"),
         (C5_nobias, "两个通道加完后忘记加偏置 b=1。")],
        0,
        "多通道卷积：out = Σ_c conv(X_c, K_c) + b，输出通道数由卷积核的组数决定，与输入通道数无关。",
        [
            step("第 1 步 · 每个通道分别卷积",
                 f"通道 1 左上角：{' + '.join(ta)} = {fmt(ra)}；"
                 f"通道 2 左上角：{' + '.join(tb)} = {fmt(rb)}。"
                 "每个通道的卷积核只与本通道做点积，得到两张 2×2 的特征图。",
                 [mat("通道 1 的卷积结果", C5a), mat("通道 2 的卷积结果", C5b)]),
            step("第 2 步 · 逐元素相加再加偏置",
                 f"左上角：{fmt(C5a[0][0])} + {fmt(C5b[0][0])} + b(1) = {fmt(C5[0][0])}；"
                 "其余三个位置同样先加两个通道的结果，再加一次偏置。",
                 [mat("相加并加偏置后的输出（2×2）", C5)]),
            step("验算",
                 "两个通道的 2×2 矩阵逐项相加，再加 1，与最终矩阵逐项一致；"
                 "偏置只加一次，不是每个通道各加一次。"),
        ],
        "多通道输出是各通道卷积结果的“和”，不是平均；偏置在通道求和之后只加一次。",
    ))

    # -- Q6: ReLU -------------------------------------------------------------
    X6 = [[2, -1, 0, 1],
          [-2, 3, 1, 0],
          [1, 0, -1, 2],
          [0, 2, 1, -1]]
    K6 = [[1, -2], [-1, 1]]
    C6, _ = conv_channels([X6], [K6], bias=0)
    R6 = relu(C6)
    C6_flip, _ = conv_channels([X6], [flip_kernel(K6)], bias=0)
    R6_flip = relu(C6_flip)
    R6_bias, _ = conv_channels([X6], [K6], bias=1)
    R6_bias = relu(R6_bias)
    qs.append(question(
        "q6", "卷积后接 ReLU", "基础",
        "输入 4×4，卷积核 2×2，偏置 b=0，无填充、步长 S=1；卷积后逐元素做 ReLU 激活。"
        "输出矩阵是？",
        [mat_input("X", X6), mat_input("K", K6), scalar_input("b", 0)],
        "无填充，步长 S=1；ReLU(x) = max(0, x)，只改元素值、不改尺寸。",
        R6,
        [(C6, "只做了卷积，没有做 ReLU，负值被保留了下来。"),
         (R6_flip, "卷积核方向用反了，再做 ReLU。"),
         (R6_bias, "把偏置当成了 1（题目 b=0），再做 ReLU。")],
        2,
        "ReLU 逐元素执行 max(0, x)，输出尺寸与卷积结果完全相同；负数归零、正数不变。",
        [
            step("第 1 步 · 卷积",
                 "无填充、K=2、S=1：H_out = ⌊(4 − 2)/1⌋ + 1 = 3。左上角窗口为 [2,−1;−2,3]，"
                 "与 K 点积：2×1 + (−1)×(−2) + (−2)×(−1) + 3×1 = 2 + 2 + 2 + 3 = 9。"
                 "完整卷积结果如下（含负数）。",
                 [mat("卷积结果（未激活，3×3）", C6)]),
            step("第 2 步 · 逐元素 ReLU",
                 "对 9 个元素分别取 max(0, x)：负数变成 0，0 和正数保持不变。"
                 "例如 9→9、−3→0、0→0。",
                 [mat("ReLU 之后（3×3）", R6)]),
            step("验算",
                 "ReLU 前后矩阵的非负元素应完全相同；把 ReLU 结果中每个 0 换回原卷积值，"
                 "应当只有负数会发生变化。"),
        ],
        "ReLU 只改数值不改形状；先加偏置再激活，顺序反了结果会不同。",
    ))

    # -- Q7: overlapping max pooling -----------------------------------------
    F7 = [[6, 3, 2, 0, 1],
          [4, 1, 0, 2, 0],
          [2, 4, 0, 1, 3],
          [0, 1, 3, 5, 2],
          [4, 2, 0, 1, 3]]
    P7, _ = pool(F7, 3, 2, "max")
    P7_nonoverlap, _ = pool(F7, 2, 2, "max")
    P7_s1, _ = pool(F7, 2, 1, "max")
    P7_s1_top = [row[:2] for row in P7_s1[:2]]
    P7_corner = [[F7[i][j] for j in (0, 2)] for i in (0, 2)]
    qs.append(question(
        "q7", "重叠最大池化", "进阶",
        "对下面的 5×5 特征图做最大池化：窗口 3×3、步长 2（窗口之间会重叠）。"
        "输出矩阵是？",
        [mat_input("特征图 F", F7)],
        "池化窗口 3×3，步长 2，没有填充；窗口可以重叠。",
        P7,
        [(P7_nonoverlap, "把重叠池化当成了 2×2、步长 2 的普通池化。"),
         (P7_s1_top, "窗口大小看成了 2×2、步长看成了 1，只取左上 2×2。"),
         (P7_corner, "把池化当成了下采样：直接取每个窗口的左上角元素。")],
        1,
        "重叠池化仍然用 H_out = ⌊(H − K)/S⌋ + 1；窗口 3×3、S=2 时相邻窗口共享一列/一行。",
        [
            step("第 1 步 · 输出尺寸",
                 "H_out = ⌊(5 − 3)/2⌋ + 1 = 2，W_out = 2；窗口左上角落在 (0,0)、(0,2)、(2,0)、(2,2)。"),
            step("第 2 步 · 逐窗口取最大值",
                 pool_windows_text(F7, 3, 2, "max") + "。",
                 [mat("重叠最大池化结果（2×2）", P7)]),
            step("验算",
                 "相邻窗口在行/列方向各共享 1 格：例如 (0,0) 与 (0,2) 两个窗口都覆盖下标为 2 的那一列。"
                 "这是重叠池化与普通池化的关键区别，输出尺寸只由 H、K、S 决定。"),
        ],
        "重叠池化不等于把窗口变小；窗口仍是 3×3，只是步长 2 < 窗口尺寸 3，所以窗口会覆盖同一批像素。",
    ))

    # -- Q8: output size + parameter count -----------------------------------
    qs.append(question(
        "q8", "输出尺寸与参数量", "概念",
        "输入特征图 32×32、通道数 3，用 16 个 3×3 卷积核，填充 P=1、步长 S=2、带偏置。"
        "输出特征图的尺寸和这一层的参数量分别是？",
        [scalar_input("H = W", 32), scalar_input("C_in", 3),
         scalar_input("核数量 C_out", 16), scalar_input("P", 1), scalar_input("S", 2)],
        "每个卷积核都是 3×3×3，带 1 个偏置；输出通道数等于卷积核个数 16。",
        "16×16×16，参数量 448",
        [("16×16×16，参数量 432", "参数量漏算了每个卷积核的 1 个偏置（16 个偏置）。"),
         ("15×15×16，参数量 448", "输出尺寸向下取整算错：⌊(32+2−3)/2⌋+1 = 16，不是 15。"),
         ("16×16×16，参数量 464", "偏置多算了一次：每个输出通道只带 1 个偏置，16 个而不是 32 个。")],
        1,
        "H_out = ⌊(H + 2P − K)/S⌋ + 1；参数量 = (K_h × K_w × C_in + 1) × C_out。",
        [
            step("第 1 步 · 输出尺寸",
                 "H_out = ⌊(32 + 2×1 − 3)/2⌋ + 1 = ⌊31/2⌋ + 1 = 15 + 1 = 16，"
                 "W_out = 16；输出通道数 = 卷积核个数 = 16，所以输出是 16×16×16。"),
            step("第 2 步 · 单个卷积核的参数量",
                 "每个卷积核要覆盖 3 个输入通道，所以是 3×3×3 = 27 个权重，再加 1 个偏置，共 28 个参数。"
                 "注意偏置是“每个卷积核一个”，不是每个输入通道一个。"),
            step("第 3 步 · 整层参数量",
                 "28 × 16 = 448。也可以写成 (3×3×3 + 1) × 16 = 448。"),
            step("验算",
                 "按“权重 + 偏置”拆开：权重 3×3×3×16 = 432，偏置 16，合计 448；"
                 "432 + 16 = 448，两种算法一致。"),
        ],
        "输出尺寸用向下取整；偏置按“输出通道数”计，不是按输入通道数、也不是按卷积核元素数计。",
        options_are_text=True,
    ))

    # -- Q9: global average pooling -----------------------------------------
    F9 = [[1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]]
    G9 = gap(F9)
    S9 = sum([F(v) for row in F9 for v in row])
    qs.append(question(
        "q9", "全局平均池化（GAP）", "基础",
        "卷积层输出的 3×3 特征图如下。对它做全局平均池化（GAP），得到的输出是？",
        [mat_input("特征图 F", F9)],
        "GAP 对整个特征图求平均，输出 1×1（单个标量）；不需要指定窗口大小和步长。",
        fmt(G9),
        [(fmt(S9), "把 GAP 当成了全局求和，忘了除以元素个数 9。"),
         (fmt(S9 / 3), "只除以了 3（边长），而应该除以元素总数 9。"),
         ("9", "把 GAP 当成了取最大值（最大池化不是 GAP）。")],
        0,
        "GAP：out = (1/(H×W)) Σ 所有元素；输出空间尺寸 1×1，通道数不变。",
        [
            step("第 1 步 · 求和",
                 "把 3×3 的 9 个元素全部加起来："
                 + " + ".join(fmt(v) for row in F9 for v in row)
                 + f" = {fmt(S9)}。"),
            step("第 2 步 · 除以元素个数",
                 f"特征图有 3×3 = 9 个元素，所以 GAP = {fmt(S9)} / 9 = {fmt(G9)}。"
                 "输出是一个标量，等价于 1×1 的特征图。"),
            step("验算",
                 f"平均值的合理范围是 [最小元素 1, 最大元素 9]；{fmt(G9)} 落在这个区间内。"
                 "再把 9 个元素的总和除以 9 复算一遍，结果一致。"),
        ],
        "GAP 要除以元素总数 H×W，不是除以边长；GAP 也不是最大池化——不要取最大值。",
        options_are_text=True,
    ))

    # -- Q10: comprehensive ---------------------------------------------------
    X10 = [[0, 1, 2, 1, 0],
           [1, 2, 0, 1, 2],
           [2, 0, 1, 2, 0],
           [1, 2, 1, 0, 1],
           [0, 1, 0, 2, 0]]
    K10 = [[1, 0, -1],
           [0, 1, 0],
           [-1, 0, 1]]
    C10, padded10 = conv_channels([X10], [K10], bias=1, pad=1, stride=2)
    R10 = relu(C10)
    P10, _ = pool(R10, 2, 1, "max")
    C10_nobias, _ = conv_channels([X10], [K10], bias=0, pad=1, stride=2)
    P10_nobias, _ = pool(relu(C10_nobias), 2, 1, "max")
    C10_flip, _ = conv_channels([X10], [flip_kernel(K10)], bias=1, pad=1, stride=2)
    P10_flip, _ = pool(relu(C10_flip), 2, 1, "max")
    P10_norelu, _ = pool(C10, 2, 1, "max")
    P10_avg, _ = pool(R10, 2, 1, "avg")
    P10_bias_after = add_scalar(P10, 1)
    terms10, raw10, with10 = conv_terms([X10], [K10], 1, 1, 2, 0, 0)
    qs.append(question(
        "q10", "综合：填充 + 步长 + ReLU + 池化", "挑战",
        "输入 5×5，卷积核 3×3，偏置 b=1；先做 P=1 零填充、步长 S=2 的卷积，"
        "再逐元素 ReLU，最后做窗口 2×2、步长 1 的最大池化。输出矩阵是？",
        [mat_input("X", X10), mat_input("K", K10), scalar_input("b", 1)],
        "P=1，卷积步长 S=2；ReLU 后再做 2×2、步长 1 的最大池化。",
        P10,
        [(P10_nobias, "整条链路里漏掉了偏置 b=1。"),
         (P10_avg, "把最大池化换成了平均池化（窗口和步长不变）。"),
         (P10_bias_after, "偏置加错了位置：等池化之后才加 1，而不是卷积后立刻加。")],
        2,
        "依次算：卷积 H₁ = ⌊(H + 2P − K)/S⌋ + 1；池化 H₂ = ⌊(H₁ − K_pool)/S_pool⌋ + 1。",
        [
            step("第 1 步 · 补零与卷积尺寸",
                 "先补一圈 0 得到 7×7；卷积 H₁ = ⌊(5 + 2 − 3)/2⌋ + 1 = 3，W₁ = 3。"
                 "窗口左上角只落在补零矩阵的 0、2、4 位置。"),
            step("第 2 步 · 卷积 + 偏置（左上角为例）",
                 f"左上角的 3×3 窗口大部分是补零：{' + '.join(terms10)} = {fmt(raw10)}；"
                 f"加偏置 b=1 得 {fmt(with10)}。完整卷积结果如下。",
                 [mat("卷积结果（3×3）", C10)]),
            step("第 3 步 · ReLU",
                 "逐元素 max(0, x)，负值归零。",
                 [mat("ReLU 之后", R10)]),
            step("第 4 步 · 2×2 最大池化（步长 1，重叠）",
                 "3×3 特征图用 2×2、步长 1 的窗口，输出尺寸 ⌊(3−2)/1⌋+1 = 2，四个窗口互相重叠："
                 + pool_windows_text(R10, 2, 1, "max") + "。",
                 [mat("最终输出（2×2）", P10)]),
            step("验算",
                 "整条链路尺寸：5 →（P=1,K=3,S=2）3 →（ReLU）3 →（2×2,S=1）2，形状正确；"
                 "再随机挑一个位置（如左上）从补零矩阵重新点积，数值与矩阵一致。"),
        ],
        "多步题先算尺寸、再算数值，别把中间矩阵的尺寸搞错；ReLU 与池化的先后顺序会改变结果，按题目顺序来。",
    ))

    return {
        "version": 1,
        "id": "ml-cnn",
        "title": "CNN 卷积 / 池化计算专项",
        "subject": "机器学习",
        "description": "10 道计算题，覆盖单通道卷积、零填充、步长、多通道、偏置、ReLU、最大/平均/重叠/全局池化。",
        "notes": [
            {"title": "卷积输出尺寸",
             "body": "H_out = ⌊(H + 2P − K)/S⌋ + 1，宽度同理。P=1、K=3、S=1 时尺寸不变（same padding）。"},
            {"title": "卷积参数量",
             "body": "(K_h × K_w × C_in + 1) × C_out。偏置按输出通道数计：每个卷积核 1 个。"},
            {"title": "池化输出尺寸",
             "body": "H_out = ⌊(H − K)/S⌋ + 1。池化没有可学习参数；窗口与步长决定输出大小。"},
            {"title": "四种池化",
             "body": "最大池化取窗口最大值；平均池化求和后除以窗口元素数；重叠池化是 S < K；全局平均池化把整张特征图平均成 1×1。"},
            {"title": "多通道卷积",
             "body": "out = Σ_c conv(X_c, K_c) + b。偏置在通道求和之后加一次；输出通道数由卷积核组数决定。"},
            {"title": "易错清单",
             "body": "偏置只加一次；padding 补 0 不复制边缘；平均池化除以 4（2×2）而不是 2；ReLU 不改形状；步长不是输出尺寸。"}
        ],
        "questions": qs,
    }


# ---------------------------------------------------------------------------
# Deck 2 — general ML concept review (text options)
# ---------------------------------------------------------------------------
def core_deck():
    qs = [
        question(
            "c1", "过拟合的识别", "概念",
            "训练集 loss 持续下降，验证集 loss 先降后升，最可能发生了什么？",
            [], "",
            "过拟合",
            [("欠拟合", "欠拟合通常表现为训练集 loss 本身就降不下去。"),
             ("学习率过大", "学习率过大会让训练 loss 震荡甚至上升，而不是稳定下降。"),
             ("训练集泄漏", "数据泄漏通常让验证结果好得不真实，而不是验证 loss 回升。")],
            1,
            "训练 loss ↓ 且验证 loss ↑ = 模型开始记住训练集噪声，泛化变差。",
            [step("判断依据", "看两条曲线的相对走势：训练 loss 仍在下降、验证 loss 触底回升，"
                               "说明模型拟合了训练集里不可泛化的细节，即过拟合。"),
             step("对策", "早停、权重衰减（L2）、Dropout、数据增强、减小模型容量。")],
            "不要只看训练 loss 判断模型好坏；验证集曲线才是泛化能力的信号。",
            options_are_text=True,
        ),
        question(
            "c2", "L2 正则化", "概念",
            "在损失函数中加入 L2 正则项 λ‖w‖²，主要作用是什么？",
            [], "",
            "抑制过大的权重，缓解过拟合",
            [("提高训练集精度", "正则化通常会降低训练集精度、换取泛化。"),
             ("让模型训练更快", "正则项不改变优化目标的结构，主要不是加速。"),
             ("把权重全部变成 0", "L2 只是把权重向 0 收缩，不会精确变成 0（L1 更容易产生稀疏解）。")],
            2,
            "L2 对权重大小施加惩罚，等价于高斯先验；λ 越大收缩越强。",
            [step("为什么有效", "大的权重会让输出对输入的微小变化非常敏感，L2 惩罚把权重压小，"
                               "降低模型方差。"),
             step("与 L1 的区别", "L1 惩罚 |w|，更容易把部分权重压到 0（稀疏）；L2 惩罚 w²，"
                                 "一般只整体收缩。")],
            "正则化是拿一点训练精度换泛化；λ 太大会导致欠拟合。",
            options_are_text=True,
        ),
        question(
            "c3", "偏差-方差", "概念",
            "模型在训练集和验证集上误差都很高，最可能属于哪种情况？",
            [], "",
            "高偏差（欠拟合）",
            [("高方差（过拟合）", "高方差表现为训练误差低、验证误差高，两者差距大。"),
             ("数据泄漏", "泄漏会让验证误差异常低，而不是两者都高。"),
             ("学习率过小", "学习率过小主要拖慢收敛，不是误差都高的典型原因。")],
            0,
            "高偏差 = 模型太简单，训练集都拟合不好；高方差 = 训练集好、验证集差。",
            [step("看差距", "训练误差与验证误差都高，且两者接近 → 偏差大；"
                           "训练误差低、验证误差高，且差距大 → 方差大。"),
             step("对策", "高偏差：增大模型容量、加特征；高方差：正则化、更多数据、早停。")],
            "训练误差低不等于模型好；要看训练与验证的差距。",
            options_are_text=True,
        ),
        question(
            "c4", "精确率与召回率", "概念",
            "在二分类中，precision（精确率）的定义是？",
            [], "",
            "预测为正的样本中真正为正的比例",
            [("真正为正的样本中被预测为正的比例（召回率）", "这是 recall 的定义。"),
             ("预测正确的样本占全部样本的比例（准确率）", "这是 accuracy 的定义。"),
             ("负类样本被正确预测的比例（特异度）", "这是 specificity 的定义。")],
            2,
            "precision = TP / (TP + FP)；recall = TP / (TP + FN)。",
            [step("记忆方法", "precision 的分母是“模型预测为正”的数量，问的是“你报出来的有多少是真的”；"
                             "recall 的分母是“真实为正”的数量，问的是“真的有多少被你找出来了”。"),
             step("取舍", "阈值调高通常提高 precision、降低 recall；两者要按业务场景权衡。")],
            "precision 与 recall 的分母不同，别把 TP/(TP+FP) 和 TP/(TP+FN) 记混。",
            options_are_text=True,
        ),
        question(
            "c5", "数据泄漏", "概念",
            "下面哪种做法会造成数据泄漏（data leakage）？",
            [], "",
            "先在整个数据集上计算均值和方差做标准化，再划分训练集/测试集",
            [("只在训练集上计算均值和方差，再应用到测试集", "这是正确做法，测试集信息没有参与训练。"),
             ("把训练集进一步划分为训练/验证两部分", "这是正常的模型选择流程。"),
             ("对测试集不做任何预处理，直接送入模型", "可能影响效果，但不是泄漏。")],
            1,
            "预处理参数必须只从训练集估计，再原样应用到验证/测试集。",
            [step("泄漏的本质", "测试集的信息在训练阶段被使用，导致评估结果偏乐观。"
                              "用全体数据算标准化参数，测试集的分布信息就漏进了训练流程。"),
             step("正确流程", "先划分，再在训练集上 fit 预处理器，最后 transform 验证/测试集。")],
            "任何“用到了测试集”的预处理、特征选择、超参数选择都可能造成泄漏。",
            options_are_text=True,
        ),
    ]
    return {
        "version": 1,
        "id": "ml-core",
        "title": "机器学习核心概念",
        "subject": "机器学习",
        "description": "5 道概念判断题，覆盖过拟合、正则化、偏差-方差、precision/recall 与数据泄漏。",
        "notes": [
            {"title": "过拟合 vs 欠拟合", "body": "训练 loss 低、验证 loss 高 → 过拟合；训练 loss 本身就高 → 欠拟合。"},
            {"title": "正则化", "body": "L1 稀疏、L2 收缩；λ 越大正则越强，太大会欠拟合。"},
            {"title": "分类指标", "body": "precision = TP/(TP+FP)，recall = TP/(TP+FN)，accuracy = (TP+TN)/全部。"},
            {"title": "数据泄漏", "body": "预处理与特征选择只能在训练集上拟合，再应用到验证/测试集。"}
        ],
        "questions": qs,
    }


# ---------------------------------------------------------------------------
# verification + write
# ---------------------------------------------------------------------------
def validate_deck(deck):
    assert deck["version"] == 1
    ids = set()
    for q in deck["questions"]:
        assert q["id"] not in ids, q["id"]
        ids.add(q["id"])
        assert 2 <= len(q["options"]) <= 6
        assert 0 <= q["answer"] < len(q["options"])
        keys = [json.dumps(o, ensure_ascii=False, sort_keys=True) for o in q["options"]]
        assert len(set(keys)) == len(keys), f"duplicate option in {q['id']}"
        for o in q["options"]:
            assert o["kind"] in ("matrix", "text")
            if o["kind"] == "matrix":
                m = o["matrix"]
                assert m and all(len(r) == len(m[0]) for r in m), q["id"]
            else:
                assert isinstance(o["text"], str) and o["text"], q["id"]
        for inp in q["inputs"]:
            assert ("matrix" in inp) ^ ("scalar" in inp), q["id"]
        for s in q["steps"]:
            assert s["title"] and s["body"], q["id"]
    return True


def main():
    decks = [cnn_deck(), core_deck()]
    OUT.mkdir(parents=True, exist_ok=True)
    for deck in decks:
        validate_deck(deck)
        path = OUT / f"{deck['id']}.json"
        path.write_text(json.dumps(deck, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {path} ({len(deck['questions'])} questions)")
        for q in deck["questions"]:
            opts = q["options"]
            correct = opts[q["answer"]]
            shown = correct.get("text") if correct["kind"] == "text" else matrix_text(
                [[value(v) for v in row] for row in correct["matrix"]])
            print(f"  {q['id']}: answer {q['answer']} = {shown}")


if __name__ == "__main__":
    main()
