// 此文件依赖 chess.js 和 chessboard.js，需要在HTML中先加载这些库
// <script src="chess.js"></script>
// <script src="chessboard-1.0.0.min.js"></script>
// <link rel="stylesheet" href="chessboard-1.0.0.min.css">

// 全局存储所有棋盘实例
window.chessBoards = window.chessBoards || {};
window.chessGames = window.chessGames || {};
window.chessMoves = window.chessMoves || {};
window.chessCurrentMove = window.chessCurrentMove || {};

// 初始化所有棋盘
function initializeChessBoards() {
	const pgnScripts = document.querySelectorAll('script[type="application/pgn"]');
	
	pgnScripts.forEach(script => {
		const boardId = script.id.replace('-pgn', '');
		
		// 如果已经初始化过，跳过
		if (window.chessBoards[boardId]) {
			return;
		}
		
		const pgnContent = script.textContent;
		
		try {
			// 使用Chess.js解析PGN（使用全局变量）
			const chess = new Chess();
			chess.loadPgn(pgnContent);
			
			// 获取所有移动
			const history = chess.history({ verbose: true });
			
			// 重置到初始位置
			chess.reset();
			chess.loadPgn(pgnContent);
			chess.reset();
			
			// 存储游戏状态
			window.chessGames[boardId] = chess;
			window.chessMoves[boardId] = history;
			window.chessCurrentMove[boardId] = -1;
			
			// 创建棋盘（使用全局变量）
			const board = Chessboard(boardId, {
				position: 'start',
				draggable: false,
				showNotation: true,
			});

			window.chessBoards[boardId] = board;
			
			// 显示初始信息
			updateMoveInfo(boardId);
			
		} catch (error) {
			console.error('Failed to parse PGN:', error);
			console.info(pgnContent);
			const infoDiv = document.getElementById(boardId + '-move-info');
			if (infoDiv) {
				infoDiv.innerHTML = '<span style="color: red;">PGN解析错误: ' + error.message + '</span>';
			}
		}
	});
}

// 更新移动信息显示
function updateMoveInfo(boardId) {
	const infoDiv = document.getElementById(boardId + '-move-info');
	if (!infoDiv) return;
	
	const currentMove = window.chessCurrentMove[boardId];
	const moves = window.chessMoves[boardId];
	const chess = window.chessGames[boardId];
	
	if (currentMove === -1) {
		infoDiv.innerHTML = '<strong>初始位置</strong>';
	} else if (currentMove < moves.length) {
		const move = moves[currentMove];
		const moveNum = Math.floor(currentMove / 2) + 1;
		const side = currentMove % 2 === 0 ? '白方' : '黑方';
		infoDiv.innerHTML = `<strong>第 ${moveNum} 步 (${side}): ${move.san}</strong>`;
	}
	
	// 显示当前局面状态
	if (chess.isCheckmate()) {
		infoDiv.innerHTML += ' <span style="color: red; font-weight: bold;">将死!</span>';
	} else if (chess.isCheck()) {
		infoDiv.innerHTML += ' <span style="color: orange; font-weight: bold;">将军!</span>';
	} else if (chess.isDraw()) {
		infoDiv.innerHTML += ' <span style="color: blue; font-weight: bold;">和棋!</span>';
	}
}

// 跳到开始
window.chessViewerStart = function(boardId) {
	const board = window.chessBoards[boardId];
	const chess = window.chessGames[boardId];
	
	if (!board || !chess) return;
	
	chess.reset();
	board.position(chess.fen());
	window.chessCurrentMove[boardId] = -1;
	updateMoveInfo(boardId);
};

// 上一步
window.chessViewerPrev = function(boardId) {
	const board = window.chessBoards[boardId];
	const chess = window.chessGames[boardId];
	const currentMove = window.chessCurrentMove[boardId];
	
	if (!board || !chess || currentMove < 0) return;
	
	chess.undo();
	board.position(chess.fen());
	window.chessCurrentMove[boardId]--;
	updateMoveInfo(boardId);
};

// 下一步
window.chessViewerNext = function(boardId) {
	const board = window.chessBoards[boardId];
	const chess = window.chessGames[boardId];
	const moves = window.chessMoves[boardId];
	const currentMove = window.chessCurrentMove[boardId];
	
	if (!board || !chess || !moves || currentMove >= moves.length - 1) return;
	
	const nextMove = moves[currentMove + 1];
	chess.move(nextMove.san);
	board.position(chess.fen());
	window.chessCurrentMove[boardId]++;
	updateMoveInfo(boardId);
};

// 跳到结束
window.chessViewerEnd = function(boardId) {
	const board = window.chessBoards[boardId];
	const chess = window.chessGames[boardId];
	const moves = window.chessMoves[boardId];
	
	if (!board || !chess || !moves) return;
	
	// 重置并应用所有移动
	chess.reset();
	moves.forEach(move => {
		chess.move(move.san);
	});
	
	board.position(chess.fen());
	window.chessCurrentMove[boardId] = moves.length - 1;
	updateMoveInfo(boardId);
};

// 翻转棋盘
window.chessViewerFlip = function(boardId) {
	const board = window.chessBoards[boardId];
	if (board) {
		board.flip();
	}
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeChessBoards);
} else {
	initializeChessBoards();
}

// 监听DOM变化，处理动态加载的内容
const observer = new MutationObserver(function(mutations) {
	let shouldInit = false;
	mutations.forEach(function(mutation) {
		if (mutation.addedNodes.length > 0) {
			mutation.addedNodes.forEach(function(node) {
				if (node.nodeType === 1 && (node.classList.contains('chess-viewer-container') || node.querySelector('.chess-viewer-container'))) {
					shouldInit = true;
				}
			});
		}
	});
	if (shouldInit) {
		setTimeout(initializeChessBoards, 100);
	}
});

observer.observe(document.body, {
	childList: true,
	subtree: true
});