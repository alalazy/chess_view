import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation, MenuItemLocation } from 'api/types';
import { ChangeEvent } from 'api/JoplinSettings';
import { Settings } from './settings';
import { ImportService } from './importService';


joplin.plugins.register({
	onStart: async function() {
		const settings = new Settings();

		// 注册命令：插入PGN代码块
		await joplin.commands.register({
			name: 'insertPGN',
			label: 'Insert PGN',
			iconName: 'fas fa-chess',
			execute: async () => {
				const selectedNote = await joplin.workspace.selectedNote()
				if (!selectedNote) {
					await joplin.views.dialogs.showMessageBox('Please select a note first!')
					return
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
			enabledCondition: 'markdownEditorPaneVisible'
		});

		// 添加工具栏按钮
		await joplin.views.toolbarButtons.create('insertPGNButton', 'insertPGN', ToolbarButtonLocation.EditorToolbar);

        const importDialog = await createImportDialog();
        const progressDialog = await createProgressDialog();

		// 注册导入棋局命令 - 使用Dialog实现
		await joplin.commands.register({
			name: 'importChessGames',
			label: 'Import Chess Games',
			iconName: 'fas fa-chess-board',
			execute: async () => {
				await showImportDialog(importDialog, progressDialog, settings);
			}
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
        });
	},
});


async function createImportDialog() {
    const importDialog = await joplin.views.dialogs.create('importConfigDialog');
	await joplin.views.dialogs.setHtml(importDialog, getInputDialogHtml());
    await joplin.views.dialogs.addScript(importDialog, './importDialog.css');
	await joplin.views.dialogs.setButtons(importDialog, [
        { id: 'import', title: 'Import' },
		{ id: 'cancel', title: 'Cancel' }
	]);
    return importDialog;
}

async function showImportDialog(importDialog, progressDialog, settings: Settings) {
	const result = await joplin.views.dialogs.open(importDialog);
	
	if (result.id === 'import' && result.formData) {
		const platform = result.formData.importForm.platform;
        const username = result.formData.importForm.username;
        
		
		if (!username) {
			await joplin.views.dialogs.showMessageBox('Please input username');
			return;
		}

		await showProgressDialogAndImport(progressDialog, platform, username, settings);
	}
}


async function createProgressDialog() {
    const progressDialog = await joplin.views.dialogs.create('progressDialog');
	await joplin.views.dialogs.setHtml(progressDialog, getProgressDialogHtml('Initializing...', 0, 'Please wait...'));
    await joplin.views.dialogs.addScript(progressDialog, './importProgress.css');
	await joplin.views.dialogs.setButtons(progressDialog, []);
    return progressDialog
}

async function getOrCreateFolder(platform: string, username: string, settings: Settings) {
    const baseFolderName = await settings.getValue('importFolderName');
    let baseFolder = await findFolderByName(baseFolderName);
	if (!baseFolder) {
		baseFolder = await joplin.data.post(['folders'], null, { title: baseFolderName });
	}
    return baseFolder;
}

async function showProgressDialogAndImport(dialog, platform: string, username: string, settings: Settings) {
    joplin.views.dialogs.open(dialog);
	
	const folder = await getOrCreateFolder(platform, username, settings);

	const importService = new ImportService();
	let importedCount = 0;
	let totalGames = 0;
	const games: any[] = [];

	try {
		// 更新进度：开始获取棋局
		await updateProgressDialog(dialog, 'Fetching games...', 0, 0, 0);

		// 定义回调函数
		const onGame = async (game: any) => {
			games.push(game);
			totalGames++;
			// 更新进度：正在获取
			await updateProgressDialog(dialog, `Fetching games... (${totalGames} found)`, 0, 0, totalGames);
		};

		const onComplete = async () => {
			// 开始导入
			await updateProgressDialog(dialog, 'Starting import...', 0, totalGames, totalGames);
			
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
					await updateProgressDialog(dialog, `Importing games...`, progress, importedCount, totalGames);
				} catch (error) {
					console.error('Error importing game:', error);
				}
			}

			await updateProgressDialog(dialog, `Import completed!`, 100, importedCount, totalGames);
			await new Promise(resolve => setTimeout(resolve, 1000)); // 显示完成状态1秒
			
			await joplin.views.dialogs.setButtons(dialog, [{ id: 'ok', title: 'OK' }]);
		};

		const onError = async (error: Error) => {
			await updateProgressDialog(dialog, `Error: ${error.message}`, 0, importedCount, totalGames);
			await joplin.views.dialogs.setButtons(dialog, [{ id: 'ok', title: 'OK' }]);
		};

		if (platform === 'lichess') {
			await importService.fetchLichessGames(username, onGame, onComplete, onError);
		} else {
			await importService.fetchChesscomGames(username, onGame, onComplete, onError);
		}

	} catch (error) {
		await updateProgressDialog(dialog, `Error: ${error.message}`, 0, importedCount, totalGames);
		await joplin.views.dialogs.setButtons(dialog, [{ id: 'ok', title: 'OK' }]);
	}
}


function getInputDialogHtml(): string {
	return `
    <div class="form-container">
        <div class="form-title">Import Chess Games</div>
        <form name="importForm">
            <div class="form-group">
                <label for="platform">Platform</label>
                <select id="platform" name="platform">
                    <option value="lichess">Lichess</option>
                    <option value="chesscom">Chess.com</option>
                </select>
            </div>

            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" placeholder="Enter username" required>
            </div>
        </form>
    </div>
	`;
}


function getProgressDialogHtml(label: string, progress: number, statusText: string): string {
	return `
    <div class="progress-wrapper">
        <div class="progress-title">Importing Chess Games</div>
        <div class="progress-container">
            <div class="progress-label">${label}</div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%;"></div>
                <div class="progress-text">${progress}%</div>
            </div>
            <div class="status-text">${statusText}</div>
        </div>
    </div>
	`;
}

// update progress
async function updateProgressDialog(
	dialog: any,
	label: string,
	progress: number,
	imported: number,
	total: number
) {
    const html = getProgressDialogHtml(label, progress, `${imported} / ${total} games imported`);
	await joplin.views.dialogs.setHtml(dialog, html);
}


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
