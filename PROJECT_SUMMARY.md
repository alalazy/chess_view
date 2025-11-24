# Chess Viewer Plugin - 项目总结

## 项目概述

Chess Viewer 是一个为 Joplin 笔记应用开发的插件，用于在笔记中查看和回放国际象棋棋局。支持标准的 PGN（Portable Game Notation）格式。

## 核心功能

### 1. PGN 插入
- 工具栏按钮：一键插入 PGN 代码块模板
- 位置：编辑器工具栏
- 图标：国际象棋棋子图标

### 2. 棋盘渲染
- 自动识别 `pgn` 代码块
- 渲染为交互式棋盘
- 支持多个棋盘同时显示

### 3. 棋局回放
- **开始**：跳转到初始位置
- **上一步**：后退一步
- **下一步**：前进一步
- **结束**：跳转到最终位置
- **翻转**：切换棋盘视角

### 4. 信息显示
- 当前移动步数
- 移动方（白方/黑方）
- 移动记号（SAN格式）
- 特殊状态（将军、将死、和棋）

## 技术架构

### 文件结构

```
chess_view/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── contentScript.js      # Markdown-it 插件
│   ├── chessViewer.js        # 棋盘交互逻辑
│   ├── chessViewer.css       # 样式文件
│   ├── chessboard.css        # Chessboard.js 样式
│   └── manifest.json         # 插件清单
├── api/                      # Joplin API 类型定义
├── dist/                     # 构建输出目录
├── publish/                  # 发布文件目录
│   └── com.alalazy.ChessViewer.jpl
├── README.md                 # 项目说明
├── QUICKSTART.md            # 快速开始指南
├── EXAMPLES.md              # 使用示例
├── TEST.md                  # 测试用例
└── package.json             # 项目配置
```

### 核心组件

#### 1. index.ts
- 注册插件命令
- 创建工具栏按钮
- 注册内容脚本

#### 2. contentScript.js
- Markdown-it 插件实现
- 拦截 `pgn` 代码块
- 生成 HTML 结构
- 加载必要的资源文件

#### 3. chessViewer.js
- 动态加载 Chess.js 和 Chessboard.js
- 初始化棋盘实例
- 管理棋局状态
- 实现控制功能
- 处理 DOM 变化

#### 4. chessViewer.css
- 棋盘容器样式
- 控制按钮样式
- 信息显示样式
- 响应式设计
- 暗色主题支持

## 依赖库

### 运行时依赖
- **Chess.js** (v0.10.3)
  - 用途：PGN 解析和棋局逻辑
  - 加载方式：CDN（运行时动态加载）
  
- **Chessboard.js** (v1.0.0)
  - 用途：棋盘渲染
  - 加载方式：CDN（运行时动态加载）

### 开发依赖
- TypeScript
- Webpack
- ts-loader
- copy-webpack-plugin

## 工作流程

### 1. 插入 PGN
```
用户点击按钮 → 执行命令 → 插入模板 → 用户编辑内容
```

### 2. 渲染棋盘
```
切换到阅读模式 → Markdown 渲染 → contentScript 拦截 pgn 块 
→ 生成 HTML → chessViewer.js 初始化 → 显示棋盘
```

### 3. 回放棋局
```
用户点击控制按钮 → 调用全局函数 → 更新棋局状态 
→ 更新棋盘位置 → 更新信息显示
```

## 关键技术点

### 1. 内容脚本注册
```typescript
await joplin.contentScripts.register(
    ContentScriptType.MarkdownItPlugin,
    'chessViewer',
    './contentScript.js'
);
```

### 2. Markdown-it 插件
```javascript
markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const lang = token.info.split(/\s+/g)[0];
    if (lang === 'pgn') {
        // 自定义渲染逻辑
    }
    return defaultRender(tokens, idx, options, env, self);
};
```

### 3. 动态库加载
```javascript
if (typeof Chess === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    document.head.appendChild(script);
}
```

### 4. 状态管理
```javascript
window.chessBoards = {};      // 棋盘实例
window.chessGames = {};       // 游戏状态
window.chessMoves = {};       // 移动历史
window.chessCurrentMove = {}; // 当前位置
```

### 5. DOM 监听
```javascript
const observer = new MutationObserver(function(mutations) {
    // 检测新添加的棋盘容器
    // 自动初始化
});
observer.observe(document.body, { childList: true, subtree: true });
```

## 特性亮点

### 1. 用户体验
- ✅ 一键插入模板
- ✅ 自动渲染
- ✅ 直观的控制按钮
- ✅ 实时信息反馈
- ✅ 响应式设计

### 2. 技术实现
- ✅ 模块化设计
- ✅ 类型安全（TypeScript）
- ✅ 动态资源加载
- ✅ 多实例支持
- ✅ 错误处理

### 3. 兼容性
- ✅ Joplin 3.5+
- ✅ 桌面版支持
- ✅ 暗色主题适配
- ✅ 标准 PGN 格式

## 构建和发布

### 构建命令
```bash
npm install          # 安装依赖
npm run dist         # 构建插件
```

### 输出文件
- `dist/` - 构建后的文件
- `publish/com.alalazy.ChessViewer.jpl` - 插件安装包

### 安装方式
1. 打开 Joplin
2. 工具 → 选项 → 插件
3. 从文件安装
4. 选择 `.jpl` 文件
5. 重启 Joplin

## 未来改进方向

### 功能增强
- [ ] 支持棋局注释显示
- [ ] 支持变化分支
- [ ] 添加棋局分析功能
- [ ] 支持自定义棋盘主题
- [ ] 添加导出功能

### 性能优化
- [ ] 本地化库文件（避免 CDN 依赖）
- [ ] 懒加载优化
- [ ] 缓存机制

### 用户体验
- [ ] 添加键盘快捷键
- [ ] 支持拖拽移动（分析模式）
- [ ] 添加移动列表显示
- [ ] 支持棋局搜索

## 测试建议

### 基本功能测试
1. 插入 PGN 代码块
2. 切换到阅读模式
3. 验证棋盘显示
4. 测试所有控制按钮
5. 测试多个棋盘

### 边界情况测试
1. 空 PGN 内容
2. 格式错误的 PGN
3. 超长对局
4. 特殊移动（升变、吃过路兵）
5. 不同的结果标记

### 兼容性测试
1. 不同的 Joplin 版本
2. 明亮/暗色主题
3. 不同的屏幕尺寸
4. 多个笔记同时打开

## 许可证

MIT License

## 作者

alalazy

## 版本

1.0.0

---

**最后更新**: 2024-01-15