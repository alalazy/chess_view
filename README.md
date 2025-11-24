# Chess Viewer - Joplin插件

一个用于在Joplin笔记中查看和回放国际象棋棋局的插件。支持PGN（Portable Game Notation）格式。

## 功能特性

- 📝 在笔记中插入PGN格式的棋局
- ♟️ 交互式棋盘显示
- ⏯️ 逐步回放棋局
- 🔄 翻转棋盘视角
- 📊 显示当前移动信息
- 🎨 美观的现代化界面

## 使用方法

### 1. 插入PGN棋局

在编辑模式下，点击工具栏上的"插入PGN棋局"按钮，会自动插入一个PGN代码块模板：

```pgn
[Event "示例对局"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
```

### 2. 编辑PGN内容

将模板中的内容替换为你的实际棋局数据。PGN格式包括：
- 标签部分（方括号内的元数据）
- 移动序列（棋局的实际走法）

### 3. 查看棋局

切换到阅读模式，PGN代码块会自动渲染为交互式棋盘。

### 4. 控制按钮

- **⏮ 开始**：跳转到初始位置
- **◀ 上一步**：回退一步
- **下一步 ▶**：前进一步
- **结束 ⏭**：跳转到最终位置
- **🔄 翻转**：翻转棋盘视角

## PGN格式示例

### 简单示例
```pgn
1. e4 e5 2. Nf3 Nc6 3. Bb5
```

### 完整示例
```pgn
[Event "World Championship"]
[Site "London"]
[Date "2023.04.15"]
[Round "1"]
[White "Carlsen, Magnus"]
[Black "Nepomniachtchi, Ian"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
```

## 安装

1. 下载最新的`.jpl`文件
2. 在Joplin中打开：工具 → 选项 → 插件
3. 点击"从文件安装"并选择下载的`.jpl`文件
4. 重启Joplin

## 开发

```bash
npm install
npm run dist
```

## 技术栈

- Chess.js - PGN解析和棋局逻辑
- Chessboard.js - 棋盘渲染
- Joplin Plugin API

## 许可证

MIT

---

For information on how to build or publish the plugin, please see [GENERATOR_DOC.md](./GENERATOR_DOC.md)
