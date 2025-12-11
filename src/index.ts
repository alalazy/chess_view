import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation, MenuItemLocation } from 'api/types';
import { ChangeEvent } from 'api/JoplinSettings'
import { Settings } from './settings';
import { ImportService } from './importService';

joplin.plugins.register({
	onStart: async function() {
		const settings = new Settings()

		// 注册命令：插入PGN代码块
		await joplin.commands.register({
			name: 'insertPGN',
			label: 'Insert PGN',
			iconName: 'fas fa-chess',
			execute: async () => {
				const selectedNote = await joplin.workspace.selectedNote();
				if (!selectedNote) {
					await joplin.views.dialogs.showMessageBox('Please select a note first!');
					return;
				}

				// 插入PGN代码块模板
				const pgnTemplate = `\n\`\`\`pgn
[Event "Example"]
[Site "?"]
[Date "2025.05.05"]
[Round "?"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *
\`\`\`\n`;

				await joplin.commands.execute('insertText', pgnTemplate);
			},
			enabledCondition: 'markdownEditorPaneVisible',
		});

		// 添加工具栏按钮
		await joplin.views.toolbarButtons.create('insertPGNButton', 'insertPGN', ToolbarButtonLocation.EditorToolbar);

		// 注册导入棋局命令 - 使用Dialog实现
		await joplin.commands.register({
			name: 'importChessGames',
			label: 'Import Chess Games',
			iconName: 'fas fa-chess-board',
			execute: async () => {
				await showImportDialog(settings);
			},
		});

		// 添加到文件→导入菜单
		await joplin.views.menuItems.create('importChessGamesMenu', 'importChessGames', MenuItemLocation.File);

		// 注册内容脚本用于渲染PGN
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'chessViewer',
			'./contentScript.js'
		);

		// 注册配置项
		await settings.register();
		joplin.settings.onChange(async (event: ChangeEvent) => {
            await settings.read(event)
        })
	},
});

/**
 * 显示导入对话框流程
 */
async function showImportDialog(settings: Settings) {
	// 第一步：显示平台选择对话框
	const importConfigDialog = await joplin.views.dialogs.create('importConfigDialog');
	await joplin.views.dialogs.setHtml(importConfigDialog, getInputDialogHtml());
	await joplin.views.dialogs.setButtons(importConfigDialog, [
		{ id: 'cancel', title: 'Cancel' },
		{ id: 'next', title: 'Next' }
	]);

	const result = await joplin.views.dialogs.open(importConfigDialog);
	
	if (result.id === 'next' && result.formData) {
		console.info("===============>>>")
		console.info(result);
		console.info(result.formData);
		const { platform, username, maxGames } = result.formData;
		
		if (!username) {
			await joplin.views.dialogs.showMessageBox('Input username');
			return;
		}

		// 获取棋局
		const importService = new ImportService(settings);
		
		try {
			let games;
			if (platform === 'lichess') {
				games = await importService.fetchLichessGames(username, parseInt(maxGames) || 10);
			} else {
				games = await importService.fetchChesscomGames(username, parseInt(maxGames) || 10);
			}

			if (!games || games.length === 0) {
				await joplin.views.dialogs.showMessageBox('Not found games');
				return;
			}

			// 第二步：显示棋局列表对话框
			await showGamesListDialog(games, settings);
			
		} catch (error) {
			await joplin.views.dialogs.showMessageBox('Get games failed: ' + error.message);
		}
	}
}

/**
 * 显示棋局列表对话框（支持分页）
 */
async function showGamesListDialog(games: any[], settings: Settings) {
	const gameSelectDialog = await joplin.views.dialogs.create('gameSelectDialog');
	await joplin.views.dialogs.setFitToContent(gameSelectDialog, false);
	await joplin.views.dialogs.setHtml(gameSelectDialog, getGamesListDialogHtml(games));
	await joplin.views.dialogs.setButtons(gameSelectDialog, [
		{ id: 'cancel', title: 'Cancel' },
		{ id: 'import', title: 'Import' }
	]);

	const result = await joplin.views.dialogs.open(gameSelectDialog);
	
	if (result.id === 'import' && result.formData) {
		// 收集选中的棋局
		const selectedGames = [];
		for (let i = 0; i < games.length; i++) {
			if (result.formData[`game_${i}`] === 'on') {
				selectedGames.push(games[i]);
			}
		}

		if (selectedGames.length === 0) {
			return;
		}

		// 导入棋局
		try {
			await importGamesToJoplin(selectedGames, settings);
		} catch (error) {
			await joplin.views.dialogs.showMessageBox('Import failed: ' + error.message);
		}
	}
}

/**
 * 生成输入对话框的HTML
 */
function getInputDialogHtml(): string {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            margin: 0;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <form name="importForm">
        <div class="form-group">
            <label for="platform">Select Platform:</label>
            <select id="platform" name="platform">
                <option value="lichess">Lichess</option>
                <option value="chesscom">Chess.com</option>
            </select>
        </div>

        <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" placeholder="Input username" required>
        </div>

        <div class="form-group">
            <label for="maxGames">Max Import Games Count (1-50):</label>
            <input type="number" id="maxGames" name="maxGames" value="10" min="1" max="50">
        </div>
    </form>
</body>
</html>
	`;
}

/**
 * 生成棋局列表对话框的HTML（支持分页）
 */
function getGamesListDialogHtml(games: any[]): string {
	const ITEMS_PER_PAGE = 10;
	const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);
	
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            margin: 0;
        }
        .header {
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .select-all {
            margin-bottom: 10px;
        }
        .games-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 15px;
        }
        .game-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            margin-bottom: 5px;
        }
        .game-item:last-child {
            border-bottom: none;
        }
        .game-item label {
            cursor: pointer;
            display: block;
        }
        .game-checkbox {
            margin-right: 8px;
        }
        .game-players {
            font-weight: 500;
            margin-bottom: 5px;
            display: inline-block;
        }
        .game-meta {
            font-size: 12px;
            opacity: 0.7;
        }
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-top: 15px;
        }
        .pagination button {
            padding: 5px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            cursor: pointer;
        }
        .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .pagination button:hover:not(:disabled) {
            background: #f0f0f0;
        }
        .page-info {
            font-size: 14px;
        }
    </style>
</head>
<body>
    <form name="gamesForm">
        <div class="header">
            <h3>找到 ${games.length} 个棋局</h3>
            <div class="select-all">
                <label>
                    <input type="checkbox" id="selectAll" checked> 全选当前页
                </label>
            </div>
        </div>

        <div class="games-list" id="gamesList">
            ${games.map((game, index) => `
                <div class="game-item" data-index="${index}" style="display: ${index < ITEMS_PER_PAGE ? 'block' : 'none'};">
                    <label>
                        <input type="checkbox" class="game-checkbox" name="game_${index}" checked>
                        <div class="game-info" style="display: inline-block; vertical-align: top;">
                            <div class="game-players">${game.white} vs ${game.black}</div>
                            <div class="game-meta">
                                ${game.date} | ${game.result} | ${game.timeControl || 'N/A'}
                            </div>
                        </div>
                    </label>
                </div>
            `).join('')}
        </div>

        ${totalPages > 1 ? `
        <div class="pagination">
            <button type="button" id="prevBtn" disabled>上一页</button>
            <span class="page-info">第 <span id="currentPage">1</span> / ${totalPages} 页</span>
            <button type="button" id="nextBtn" ${totalPages === 1 ? 'disabled' : ''}>下一页</button>
        </div>
        ` : ''}
    </form>

    <script>
        const ITEMS_PER_PAGE = ${ITEMS_PER_PAGE};
        const totalPages = ${totalPages};
        let currentPage = 1;

        // 全选功能
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.game-item[style*="display: block"] .game-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });

        // 分页功能
        if (totalPages > 1) {
            document.getElementById('prevBtn').addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    updatePage();
                }
            });

            document.getElementById('nextBtn').addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updatePage();
                }
            });
        }

        function updatePage() {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;

            // 更新显示的游戏项
            const allItems = document.querySelectorAll('.game-item');
            allItems.forEach((item, index) => {
                if (index >= startIndex && index < endIndex) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });

            // 更新按钮状态
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages;
            document.getElementById('currentPage').textContent = currentPage;

            // 重置全选状态
            const visibleCheckboxes = document.querySelectorAll('.game-item[style*="display: block"] .game-checkbox');
            const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
            document.getElementById('selectAll').checked = allChecked;
        }

        // 监听单个复选框变化，更新全选状态
        document.querySelectorAll('.game-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const visibleCheckboxes = document.querySelectorAll('.game-item[style*="display: block"] .game-checkbox');
                const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
                document.getElementById('selectAll').checked = allChecked;
            });
        });
    </script>
</body>
</html>
	`;
}

/**
 * 导入棋局到Joplin
 */
async function importGamesToJoplin(games: any[], settings: Settings) {
	const folderName = await settings.getValue('importFolderName') || 'Chess Games';
	
	// 查找或创建文件夹
	let folder = await findFolderByName(folderName);
	if (!folder) {
		folder = await joplin.data.post(['folders'], null, { title: folderName });
	}

	const lichessToken = await settings.getValue('lichessToken');
	const importService = new ImportService(lichessToken);

	// 为每个棋局创建笔记
	for (const game of games) {
		const noteTitle = `${game.white} vs ${game.black} - ${game.date}`;
		const pgn = importService.generatePGN(game);
		const noteBody = `# ${noteTitle}\n\n\`\`\`pgn\n${pgn}\n\`\`\`\n`;

		await joplin.data.post(['notes'], null, {
			title: noteTitle,
			body: noteBody,
			parent_id: folder.id,
		});
	}

	await joplin.views.dialogs.showMessageBox(`Successfully imported ${games.length} game(s) to folder "${folderName}"`);
}

/**
 * 根据名称查找文件夹
 */
async function findFolderByName(name: string): Promise<any> {
	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const response = await joplin.data.get(['folders'], {
			fields: ['id', 'title'],
			page: page,
		});

		const folder = response.items.find((f: any) => f.title === name);
		if (folder) {
			return folder;
		}

		hasMore = response.has_more;
		page++;
	}

	return null;
}
