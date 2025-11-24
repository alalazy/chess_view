module.exports = {
	default: function(context) {
		return {
			plugin: function(markdownIt, _options) {
				const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
					return self.renderToken(tokens, idx, options);
				};

				markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
					const token = tokens[idx];
					const info = token.info ? token.info.trim() : '';
					const lang = info.split(/\s+/g)[0];

					// only handle pgn code blocks
					if (lang === 'pgn') {
						const pgnContent = token.content;
						const uniqueId = 'chess-board-' + Math.random().toString(36).substr(2, 9);
						
						return `
							<div class="chess-viewer-container" style="margin: 20px 0;">
								<div id="${uniqueId}" class="chess-board" style="width: 400px;"></div>
								<div class="chess-controls" style="margin-top: 10px;">
									<button class="chess-btn" onclick="chessViewerStart('${uniqueId}')">⏮ 开始</button>
									<button class="chess-btn" onclick="chessViewerPrev('${uniqueId}')">◀ 上一步</button>
									<button class="chess-btn" onclick="chessViewerNext('${uniqueId}')">下一步 ▶</button>
									<button class="chess-btn" onclick="chessViewerEnd('${uniqueId}')">结束 ⏭</button>
									<button class="chess-btn" onclick="chessViewerFlip('${uniqueId}')">🔄 翻转</button>
								</div>
								<div class="chess-info" style="margin-top: 10px; font-family: monospace; font-size: 14px;">
									<div id="${uniqueId}-move-info"></div>
								</div>
								<script type="application/pgn" id="${uniqueId}-pgn">${pgnContent}</script>
							</div>
						`;
					}

					// 其他代码块使用默认渲染
					return defaultRender(tokens, idx, options, env, self);
				};
			},
			assets: function() {
				return [
					{ name: 'jquery/jquery.min.js' },
					{ name: 'chessboard.css' },
					{ name: 'chessViewer.css' },
					{ name: 'chessViewer.js' },
					{ name: 'chessjs/chess.js' },
					{ name: 'chessboard/chessboard-1.0.0.min.css' },
					{ name: 'chessboard/chessboard-1.0.0.min.js' },
				];
			},
		}
	},
};