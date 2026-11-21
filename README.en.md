# dsh-quiz-tutorial

[中文](README.md) · English

A [DeepSeek Harness](https://github.com/deepseek-ai) plugin that turns review material into
practice decks: question on the left, a **hand-worked solution** on the right, a built-in
**mistake log**, and `/skill dsh-quiz` deck generation from the current review context.

<p align="center">
  <img src="docs/screenshots/quiz.png" alt="Quiz page with a K-means/GMM deck and its solution aside" width="960">
</p>

## Install

```sh
dsh plugin --profile web add github:xiaobin118/dsh-quiz-tutorial
```

The npm package name is `dsh-quiz-tutorial` (not published yet); install from GitHub for now.
Restart `dsh web` once after installing (Host routes and the skill do not hot-reload), then refresh
the browser and open **Quiz** in the sidebar.

## What it does

- **Decks**: switch decks in the sidebar; bundled CNN and ML concept decks, plus decks generated
  for any subject.
- **Question + solution**: matrices and options; after answering, the aside shows the answer, the
  formula, step-by-step arithmetic with intermediate matrices, pitfalls, and why each wrong option
  is wrong.
- **Mistake log**: wrong answers are collected automatically; filter, review the solution, redo,
  mark fixed, or review all open mistakes in a queue. A correct retry marks the entry fixed.
- **`/skill dsh-quiz <topic>`**: the skill asks the agent to check existing decks, compute every
  answer and intermediate value, then save a validated deck via `quiz_save_deck`.
- **Delete / hide decks**: the × on a deck card deletes a custom deck; bundled decks are hidden and
  can be restored from the sidebar.

## Deck format

Decks are plain JSON. See [docs/deck-format.md](docs/deck-format.md) and [skill.md](skill.md).
The numbers in the bundled decks are generated and asserted by
[tools/gen_decks.py](tools/gen_decks.py), not typed by hand.

## Contributing

Contributions are welcome: new-subject decks, UI, zh/en translations, Host code, docs, and bug
reports. Read [CONTRIBUTING.md](CONTRIBUTING.md); deck PRs must follow the "compute every answer
yourself" rule.

## License

[MIT](LICENSE)
