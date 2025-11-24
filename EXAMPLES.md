# Chess Viewer 插件使用示例

## 示例1：经典开局 - 意大利开局

```pgn
[Event "意大利开局示例"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Na5
```

## 示例2：西班牙开局

```pgn
[Event "西班牙开局"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4
```

## 示例3：西西里防御

```pgn
[Event "西西里防御"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O
```

## 示例4：法兰西防御

```pgn
[Event "法兰西防御"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "*"]

1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 O-O 8. Bd3 Nbc6 9. Qh5 Ng6 10. Nf3
```

## 示例5：著名对局 - 不朽之局

```pgn
[Event "不朽之局"]
[Site "London"]
[Date "1851.06.21"]
[Round "?"]
[White "Anderssen, Adolf"]
[Black "Kieseritzky, Lionel"]
[Result "1-0"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0
```

## 示例6：简单将杀

```pgn
[Event "学者将杀"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "白方"]
[Black "黑方"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0
```

## 使用提示

1. **复制模板**：点击工具栏的"插入PGN棋局"按钮
2. **粘贴棋局**：将你的PGN数据粘贴到代码块中
3. **查看效果**：切换到阅读模式查看交互式棋盘
4. **控制回放**：使用按钮控制棋局回放

## PGN格式说明

### 标签部分（可选）
```
[Event "对局名称"]
[Site "地点"]
[Date "日期"]
[Round "轮次"]
[White "白方棋手"]
[Black "黑方棋手"]
[Result "结果"]
```

### 结果标记
- `1-0` - 白方胜
- `0-1` - 黑方胜
- `1/2-1/2` - 和棋
- `*` - 未完成或未知

### 移动记号
- 普通移动：`e4`, `Nf3`, `Bc4`
- 吃子：`exd5`, `Nxd5`
- 王车易位：`O-O`（短易位）, `O-O-O`（长易位）
- 将军：`Qh5+`
- 将死：`Qxf7#`
- 升变：`e8=Q`