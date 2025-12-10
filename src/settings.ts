import joplin from 'api'
import { ChangeEvent } from 'api/JoplinSettings'
import { SettingItem, SettingItemType } from 'api/types'

interface SettingsConfig {
    [key: string]: SettingItem,
}

export class Settings {
    static readonly LICHESS_API_HOST = "https://lichess.org";
    static readonly CHESSCOM_API_HOST = "https://api.chess.com";
    
    static readonly CHESS_VIEWER_SETTINGS_SECTION = "chess-viewer-settings-section";

    private _config: SettingsConfig = {
        lichessToken: {
            value: '',
            type: SettingItemType.String,
            section: Settings.CHESS_VIEWER_SETTINGS_SECTION,
            public: true,
            label: 'LiChess Token',
            description: 'Input your Lichess API token here.',
        }
        
    }

    async register() {
        await joplin.settings.registerSection(Settings.CHESS_VIEWER_SETTINGS_SECTION, {
            label: 'Chess Viewer',
            iconName: 'fas fa-chess-knight',
            description: ''
        })

        await joplin.settings.registerSettings(this._config)

        await this.read()
    }

    private async getOrDefault(event: ChangeEvent, localVar: any, setting: string): Promise<any> {
        if (!event || event.keys.includes(setting)) {
            return await joplin.settings.value(setting)
        }
        return localVar
    }

    async read(event?: ChangeEvent) {
        for (let key in this._config) {
            this._config[key].value = await this.getOrDefault(event, this._config[key].value, key)
        }
    }
}

