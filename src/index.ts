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

        const importDialog = await createImportDialog()

		// 注册导入棋局命令 - 使用Dialog实现
		await joplin.commands.register({
			name: 'importChessGames',
			label: 'Import Chess Games',
			iconName: 'fas fa-chess-board',
			execute: async () => {
				await showImportDialog(importDialog, settings);
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


async function createImportDialog() {
    const importDialog = await joplin.views.dialogs.create('importConfigDialog');
	await joplin.views.dialogs.setHtml(importDialog, getInputDialogHtml());
	await joplin.views.dialogs.setButtons(importDialog, [
		{ id: 'cancel', title: 'Cancel' },
		{ id: 'import', title: 'Import' }
	]);
    return importDialog
}

async function showImportDialog(dialog, settings: Settings) {
	const result = await joplin.views.dialogs.open(dialog);

    console.info('============')
    console.info(result)
    console.info(result.formData)
	
	if (result.id === 'import' && result.formData) {
		const { platform, username } = result.formData;
        
		
		if (!username) {
			await joplin.views.dialogs.showMessageBox('Please input username');
			return;
		}

		// 第二步：显示进度对话框并开始导入
		await showProgressDialogAndImport(platform, username, settings);
	}
}

/**
 * 显示进度对话框并执行导入
 */
async function showProgressDialogAndImport(platform: string, username: string, settings: Settings) {
	// 创建进度对话框
	const progressDialog = await joplin.views.dialogs.create('progressDialog');
	await joplin.views.dialogs.setHtml(progressDialog, getProgressDialogHtml());
	await joplin.views.dialogs.setButtons(progressDialog, []);
	
	// 非阻塞方式打开对话框
	const dialogPromise = joplin.views.dialogs.open(progressDialog);
	
	// 开始导入
	const folderName = await settings.getValue('importFolderName') || 'Chess Games';
	let folder = await findFolderByName(folderName);
	if (!folder) {
		folder = await joplin.data.post(['folders'], null, { title: folderName });
	}

	const importService = new ImportService(settings);
	let importedCount = 0;
	let totalGames = 0;
	const games: any[] = [];

	try {
		// 更新进度：开始获取棋局
		await updateProgressDialog(progressDialog, 'Fetching games...', 0, 0, 0);

		// 定义回调函数
		const onGame = async (game: any) => {
			games.push(game);
			totalGames++;
			// 更新进度：正在获取
			await updateProgressDialog(progressDialog, `Fetching games... (${totalGames} found)`, 0, 0, totalGames);
		};

		const onComplete = async () => {
			// 开始导入
			await updateProgressDialog(progressDialog, 'Starting import...', 0, totalGames, totalGames);
			
			for (const game of games) {
				try {
					const noteTitle = `${game.white} vs ${game.black} - ${game.date}`;
					const pgn = importService.generatePGN(game);
					const noteBody = `# ${noteTitle}\n\n\`\`\`pgn\n${pgn}\n\`\`\`\n`;

					await joplin.data.post(['notes'], null, {
						title: noteTitle,
						body: noteBody,
						parent_id: folder.id,
					});

					importedCount++;
					const progress = Math.round((importedCount / totalGames) * 100);
					await updateProgressDialog(progressDialog, `Importing games...`, progress, importedCount, totalGames);
				} catch (error) {
					console.error('Error importing game:', error);
				}
			}

			// 完成
			await updateProgressDialog(progressDialog, `Import completed!`, 100, importedCount, totalGames);
			await new Promise(resolve => setTimeout(resolve, 1000)); // 显示完成状态1秒
			
			// 关闭对话框
			await joplin.views.dialogs.setButtons(progressDialog, [{ id: 'ok', title: 'OK' }]);
		};

		const onError = async (error: Error) => {
			await updateProgressDialog(progressDialog, `Error: ${error.message}`, 0, importedCount, totalGames);
			await joplin.views.dialogs.setButtons(progressDialog, [{ id: 'ok', title: 'OK' }]);
		};

		// 根据平台获取棋局
		if (platform === 'lichess') {
			await importService.fetchLichessGames(username, onGame, onComplete, onError);
		} else {
			await importService.fetchChesscomGames(username, onGame, onComplete, onError);
		}

	} catch (error) {
		await updateProgressDialog(progressDialog, `Error: ${error.message}`, 0, importedCount, totalGames);
		await joplin.views.dialogs.setButtons(progressDialog, [{ id: 'ok', title: 'OK' }]);
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
        .info {
            margin-top: 15px;
            padding: 10px;
            background-color: #f0f8ff;
            border-left: 3px solid #4a90e2;
            font-size: 13px;
            color: #333;
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

        <div class="info">
            ℹ️ All games from this user will be imported. This may take a while depending on the number of games.
        </div>
    </form>
</body>
</html>
	`;
}

/**
 * 生成进度对话框的HTML
 */
function getProgressDialogHtml(): string {
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
            min-width: 400px;
        }
        .progress-container {
            margin-bottom: 20px;
        }
        .progress-label {
            margin-bottom: 10px;
            font-weight: 500;
            font-size: 14px;
        }
        .progress-bar-container {
            width: 100%;
            height: 30px;
            background-color: #f0f0f0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4a90e2, #357abd);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            font-size: 12px;
            color: #333;
            z-index: 1;
        }
        .status-text {
            margin-top: 10px;
            font-size: 13px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="progress-container">
        <div class="progress-label" id="progressLabel">Initializing...</div>
        <div class="progress-bar-container">
            <div class="progress-bar" id="progressBar" style="width: 0%;"></div>
            <div class="progress-text" id="progressText">0%</div>
        </div>
        <div class="status-text" id="statusText">Please wait...</div>
    </div>
</body>
</html>
	`;
}

/**
 * 更新进度对话框
 */
async function updateProgressDialog(
	dialog: any,
	label: string,
	progress: number,
	imported: number,
	total: number
) {
	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            margin: 0;
            min-width: 400px;
        }
        .progress-container {
            margin-bottom: 20px;
        }
        .progress-label {
            margin-bottom: 10px;
            font-weight: 500;
            font-size: 14px;
        }
        .progress-bar-container {
            width: 100%;
            height: 30px;
            background-color: #f0f0f0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4a90e2, #357abd);
            transition: width 0.3s ease;
            width: ${progress}%;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            font-size: 12px;
            color: #333;
            z-index: 1;
        }
        .status-text {
            margin-top: 10px;
            font-size: 13px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="progress-container">
        <div class="progress-label">${label}</div>
        <div class="progress-bar-container">
            <div class="progress-bar"></div>
            <div class="progress-text">${progress}%</div>
        </div>
        <div class="status-text">${imported} / ${total} games imported</div>
    </div>
</body>
</html>
	`;
	await joplin.views.dialogs.setHtml(dialog, html);
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
