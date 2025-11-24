# Chess Viewer 快速开始指南

## 安装插件

### 方法1：从文件安装（推荐）

1. 下载 `com.alalazy.ChessViewer.jpl` 文件（位于 `publish` 目录）
2. 打开Joplin
3. 进入：**工具** → **选项** → **插件**
4. 点击 **从文件安装**
5. 选择下载的 `.jpl` 文件
6. 重启Joplin

### 方法2：开发模式

```bash
# 克隆或下载项目
cd chess_view

# 安装依赖
npm install

# 构建插件
npm run dist

# 插件文件将生成在 publish 目录
```

## 第一次使用

### 步骤1：创建新笔记

在Joplin中创建一个新笔记，例如命名为"我的国际象棋棋局"。

### 步骤2：插入PGN代码块

1. 确保笔记处于**编辑模式**
2. 在工具栏中找到并点击 **"插入PGN棋局"** 按钮（图标为国际象棋棋子）
3. 会自动插入以下模板：

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

### 步骤3：编辑棋局内容

替换模板内容为你的实际棋局。例如：

```pgn
[Event "我的第一局"]
[Site "家中"]
[Date "2024.01.15"]
[White "张三"]
[Black "李四"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O
```

### 步骤4：查看棋盘

1. 切换到**阅读模式**（点击右上角的眼睛图标）
2. PGN代码块会自动渲染为交互式棋盘
3. 你会看到：
   - 一个可视化的国际象棋棋盘
   - 控制按钮（开始、上一步、下一步、结束、翻转）
   - 当前移动信息显示

### 步骤5：回放棋局

使用控制按钮来回放棋局：

- **⏮ 开始**：回到初始位置
- **◀ 上一步**：后退一步
- **下一步 ▶**：前进一步
- **结束 ⏭**：跳到最后一步
- **🔄 翻转**：翻转棋盘（从黑方视角查看）

## 常见问题

### Q: 为什么棋盘没有显示？

A: 请确保：
1. 代码块的语言标记为 `pgn`
2. 笔记处于阅读模式
3. PGN格式正确（可以先用示例测试）

### Q: 如何获取PGN格式的棋局？

A: 你可以从以下来源获取：
- Chess.com - 下载你的对局
- Lichess.org - 导出对局
- 国际象棋软件（如ChessBase）
- 手动输入走法

### Q: 支持哪些PGN特性？

A: 目前支持：
- 标准移动记号
- 标签信息（Event, Site, Date等）
- 王车易位（O-O, O-O-O）
- 吃子、将军、将死标记
- 注释和变化（会被忽略，但不影响主线）

### Q: 可以在一个笔记中插入多个棋局吗？

A: 可以！每个PGN代码块都会独立渲染为一个棋盘。

## 示例棋局

### 快速测试

复制以下内容到你的笔记中测试：

```pgn
[Event "快速测试"]
[White "白方"]
[Black "黑方"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4
```

### 完整对局示例

```pgn
[Event "世界冠军赛"]
[Site "纽约"]
[Date "1972.07.11"]
[Round "6"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1-0"]

1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0
```

## 下一步

- 查看 [EXAMPLES.md](./EXAMPLES.md) 了解更多示例
- 阅读 [README.md](./README.md) 了解完整功能
- 访问 [Chess.com](https://www.chess.com) 或 [Lichess.org](https://lichess.org) 下载你的对局

## 技术支持

如果遇到问题，请：
1. 检查PGN格式是否正确
2. 确保插件已正确安装
3. 尝试重启Joplin
4. 查看浏览器控制台是否有错误信息

祝你使用愉快！♟️