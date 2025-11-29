# Chess Viewer

用于在Joplin笔记中查看和回放国际象棋棋局的插件。支持PGN格式。

## 使用方法

### 1. 插入PGN棋局

在编辑模式下，点击工具栏上的"插入PGN棋局"按钮，会自动插入一个PGN代码块模板：

```pgn
[Event "示例对局"]
[Site "?"]
[Date "2025.05.05"]
[Round "?"]
[White "Player A"]
[Black Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
```

### 2. 编辑PGN内容

将模板中的内容替换为你的实际棋局数据。PGN格式包括：
- 标签部分（方括号内的元数据）
- 移动序列（棋局的实际走法）

### 3. 查看棋局

切换到阅读模式，PGN代码块会自动渲染为交互式棋盘。


## 开发

```bash
npm install
npm run dist
```

## 许可证

MIT
