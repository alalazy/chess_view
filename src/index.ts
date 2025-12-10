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

		// 注册导入棋局命令 - 使用Panel实现
		const panelHandle = await joplin.views.panels.create('chessImportPanel');
		await joplin.views.panels.setHtml(panelHandle, getImportPanelHtml());
		
		// 处理panel消息
		await joplin.views.panels.onMessage(panelHandle, async (message: any) => {
			if (message.action === 'fetchGames') {
				const lichessToken = await settings.getValue('lichessToken');
				const importService = new ImportService(lichessToken);

				try {
					let games;
					if (message.platform === 'lichess') {
						games = await importService.fetchLichessGames(message.username, message.maxGames);
					} else {
						games = await importService.fetchChesscomGames(message.username, message.maxGames);
					}
					return { success: true, games: games };
				} catch (error) {
					return { success: false, error: error.message };
				}
			} else if (message.action === 'importGames') {
				try {
					await importGamesToJoplin(message.games, settings);
					return { success: true };
				} catch (error) {
					return { success: false, error: error.message };
				}
			} else if (message.action === 'close') {
				await joplin.views.panels.hide(panelHandle);
				return { success: true };
			}
		});

		await joplin.commands.register({
			name: 'importChessGames',
			label: 'Chess Games',
			iconName: 'fas fa-chess-board',
			execute: async () => {
				await joplin.views.panels.show(panelHandle);
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
 * 生成导入面板的HTML
 */
function getImportPanelHtml(): string {
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
            background: var(--joplin-background-color);
            color: var(--joplin-color);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h2 {
            margin-top: 0;
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
            border: 1px solid var(--joplin-divider-color);
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            background: var(--joplin-background-color);
            color: var(--joplin-color);
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            flex: 1;
        }
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background-color: #0056b3;
        }
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background-color: #545b62;
        }
        .btn-success {
            background-color: #28a745;
            color: white;
        }
        .btn-success:hover {
            background-color: #218838;
        }
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
            color: #007bff;
        }
        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            display: none;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .games-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--joplin-divider-color);
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            display: none;
        }
        .game-item {
            padding: 10px;
            border-bottom: 1px solid var(--joplin-divider-color);
            margin-bottom: 5px;
        }
        .game-item:last-child {
            border-bottom: none;
        }
        .game-players {
            font-weight: 500;
            margin-bottom: 5px;
        }
        .game-meta {
            font-size: 12px;
            opacity: 0.7;
        }
        .select-all {
            margin-bottom: 10px;
            display: none;
        }
        .game-checkbox {
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>导入棋局</h2>
        
        <div id="inputForm">
            <div class="form-group">
                <label for="platform">选择平台:</label>
                <select id="platform">
                    <option value="lichess">Lichess</option>
                    <option value="chesscom">Chess.com</option>
                </select>
            </div>

            <div class="form-group">
                <label for="username">用户名:</label>
                <input type="text" id="username" placeholder="输入用户名">
            </div>

            <div class="form-group">
                <label for="maxGames">最大棋局数量 (1-50):</label>
                <input type="number" id="maxGames" value="10" min="1" max="50">
            </div>

            <div class="button-group">
                <button class="btn-secondary" id="closeBtn">关闭</button>
                <button class="btn-primary" id="fetchBtn">获取棋局</button>
            </div>
        </div>

        <div class="loading" id="loading">
            <p>⏳ 正在处理...</p>
        </div>

        <div class="message error" id="errorMsg"></div>
        <div class="message success" id="successMsg"></div>

        <div id="gamesContainer">
            <div class="select-all" id="selectAllContainer">
                <label>
                    <input type="checkbox" id="selectAll" checked> 全选
                </label>
            </div>
            <div class="games-list" id="gamesList"></div>
            <div class="button-group" id="importBtnGroup" style="display: none;">
                <button class="btn-secondary" id="backBtn">返回</button>
                <button class="btn-success" id="importBtn">导入选中的棋局</button>
            </div>
        </div>
    </div>

    <script>
        const webviewApi = window.webviewApi || { postMessage: () => {} };
        let fetchedGames = [];
        
        document.getElementById('fetchBtn').addEventListener('click', async () => {
            const platform = document.getElementById('platform').value;
            const username = document.getElementById('username').value.trim();
            const maxGames = parseInt(document.getElementById('maxGames').value);

            if (!username) {
                showError('请输入用户名');
                return;
            }

            showLoading(true);
            hideMessages();

            try {
                const response = await webviewApi.postMessage({
                    action: 'fetchGames',
                    platform,
                    username,
                    maxGames
                });

                if (response.success && response.games && response.games.length > 0) {
                    fetchedGames = response.games;
                    displayGames(response.games);
                    document.getElementById('inputForm').style.display = 'none';
                } else {
                    showError(response.error || '未找到棋局');
                }
            } catch (error) {
                showError('获取棋局失败: ' + error.message);
            } finally {
                showLoading(false);
            }
        });

        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.game-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });

        document.getElementById('importBtn').addEventListener('click', async () => {
            const selectedGames = [];
            const checkboxes = document.querySelectorAll('.game-checkbox:checked');
            
            checkboxes.forEach(cb => {
                const index = parseInt(cb.dataset.index);
                selectedGames.push(fetchedGames[index]);
            });

            if (selectedGames.length === 0) {
                showError('请至少选择一个棋局');
                return;
            }

            showLoading(true);
            hideMessages();

            try {
                const response = await webviewApi.postMessage({
                    action: 'importGames',
                    games: selectedGames
                });

                if (response.success) {
                    showSuccess(\`成功导入 \${selectedGames.length} 个棋局！\`);
                    setTimeout(() => {
                        resetForm();
                    }, 2000);
                } else {
                    showError(response.error || '导入失败');
                }
            } catch (error) {
                showError('导入失败: ' + error.message);
            } finally {
                showLoading(false);
            }
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            resetForm();
        });

        document.getElementById('closeBtn').addEventListener('click', async () => {
            await webviewApi.postMessage({ action: 'close' });
        });

        function displayGames(games) {
            const gamesList = document.getElementById('gamesList');
            gamesList.innerHTML = '';

            games.forEach((game, index) => {
                const gameItem = document.createElement('div');
                gameItem.className = 'game-item';
                gameItem.innerHTML = \`
                    <label style="cursor: pointer; display: block;">
                        <input type="checkbox" class="game-checkbox" data-index="\${index}" checked>
                        <div class="game-info" style="display: inline-block; vertical-align: top;">
                            <div class="game-players">\${game.white} vs \${game.black}</div>
                            <div class="game-meta">
                                \${game.date} | \${game.result} | \${game.timeControl || 'N/A'}
                            </div>
                        </div>
                    </label>
                \`;
                gamesList.appendChild(gameItem);
            });

            document.getElementById('selectAllContainer').style.display = 'block';
            document.getElementById('gamesList').style.display = 'block';
            document.getElementById('importBtnGroup').style.display = 'flex';
        }

        function resetForm() {
            document.getElementById('inputForm').style.display = 'block';
            document.getElementById('gamesList').style.display = 'none';
            document.getElementById('selectAllContainer').style.display = 'none';
            document.getElementById('importBtnGroup').style.display = 'none';
            document.getElementById('gamesList').innerHTML = '';
            fetchedGames = [];
            hideMessages();
        }

        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }

        function showError(message) {
            const errorEl = document.getElementById('errorMsg');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }

        function showSuccess(message) {
            const successEl = document.getElementById('successMsg');
            successEl.textContent = message;
            successEl.style.display = 'block';
        }

        function hideMessages() {
            document.getElementById('errorMsg').style.display = 'none';
            document.getElementById('successMsg').style.display = 'none';
        }
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
