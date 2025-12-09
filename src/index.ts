import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation, SettingItemType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
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

		// 注册内容脚本用于渲染PGN
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'chessViewer',
			'./contentScript.js'
		);

		// 注册配置项
		await joplin.settings.registerSection('chess-viewer-settings-section', {
			label: "Chess Viewer",
			description: "",
			iconName: "fas fa-chess-knight",
		})

		await joplin.settings.registerSettings({
			'lichessToken': {
				value: '',
				type: SettingItemType.String,
				section: 'chess-viewer-settings-section',
				public: true,
				label: 'LiChess Token'
			}
		});


	},
});
