
import { Settings } from "./settings"

export class ImportService {
    private _settings: Settings

    private lichessToken: string = '';

    constructor(settings: Settings) {
        this._settings = settings
    }

    /**
     * 从Lichess获取用户的棋局
     */
    async fetchLichessGames(username: string, maxGames: number = 10): Promise<any[]> {
        try {
            const headers: any = {
                'Accept': 'application/x-ndjson'
            };

            if (this.lichessToken) {
                headers['Authorization'] = `Bearer ${this._settings.getValue('lichessToken')}`;
            }

            const response = await fetch(
                `${Settings.LICHESS_API_HOST}/api/games/user/${username}?max=${maxGames}&pgnInJson=true&clocks=false&evals=false&opening=false`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Lichess API error: ${response.status}`);
            }

            const text = await response.text();
            const games = text.trim().split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));

            return games.map(game => this.parseLichessGame(game));
        } catch (error) {
            console.error('Error fetching Lichess games:', error);
            throw error;
        }
    }

    /**
     * 从Chess.com获取用户的棋局
     */
    async fetchChesscomGames(username: string, maxGames: number = 10): Promise<any[]> {
        try {
            // 获取当前年月
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');

            // 获取最近的棋局存档
            const archivesResponse = await fetch(
                `${Settings.CHESSCOM_API_HOST}/pub/player/${username}/games/archives`
            );

            if (!archivesResponse.ok) {
                throw new Error(`Chess.com API error: ${archivesResponse.status}`);
            }

            const archivesData = await archivesResponse.json();
            const archives = archivesData.archives || [];

            if (archives.length === 0) {
                return [];
            }

            // 获取最新月份的棋局
            const latestArchive = archives[archives.length - 1];
            const gamesResponse = await fetch(latestArchive);

            if (!gamesResponse.ok) {
                throw new Error(`Chess.com games API error: ${gamesResponse.status}`);
            }

            const gamesData = await gamesResponse.json();
            const games = gamesData.games || [];

            // 限制数量并解析
            return games.slice(0, maxGames).map(game => this.parseChesscomGame(game));
        } catch (error) {
            console.error('Error fetching Chess.com games:', error);
            throw error;
        }
    }

    /**
     * 解析Lichess棋局数据
     */
    private parseLichessGame(game: any): any {
        const white = game.players?.white?.user?.name || 'Unknown';
        const black = game.players?.black?.user?.name || 'Unknown';
        const result = this.formatResult(game.winner, game.status);
        const date = game.createdAt ? new Date(game.createdAt).toISOString().split('T')[0] : 'Unknown';
        const timeControl = game.clock ? `${game.clock.initial / 60}+${game.clock.increment}` : 'Unknown';

        return {
            white,
            black,
            result,
            date,
            timeControl,
            pgn: game.pgn || '',
            event: game.event || 'Lichess Game',
            site: `https://lichess.org/${game.id}`,
            round: game.round || '?',
        };
    }

    /**
     * 解析Chess.com棋局数据
     */
    private parseChesscomGame(game: any): any {
        const white = game.white?.username || 'Unknown';
        const black = game.black?.username || 'Unknown';
        const result = game.white?.result || '*';
        const date = game.end_time ? new Date(game.end_time * 1000).toISOString().split('T')[0] : 'Unknown';
        const timeControl = game.time_class || 'Unknown';

        return {
            white,
            black,
            result: this.normalizeChesscomResult(result),
            date,
            timeControl,
            pgn: game.pgn || '',
            event: 'Chess.com Game',
            site: game.url || 'Chess.com',
            round: '?',
        };
    }

    /**
     * 格式化结果
     */
    private formatResult(winner: string | undefined, status: string): string {
        if (!winner) {
            return status === 'draw' ? '1/2-1/2' : '*';
        }
        return winner === 'white' ? '1-0' : '0-1';
    }

    /**
     * 标准化Chess.com的结果格式
     */
    private normalizeChesscomResult(result: string): string {
        const resultMap: { [key: string]: string } = {
            'win': '1-0',
            'checkmated': '0-1',
            'agreed': '1/2-1/2',
            'repetition': '1/2-1/2',
            'stalemate': '1/2-1/2',
            'insufficient': '1/2-1/2',
            '50move': '1/2-1/2',
            'abandoned': '*',
            'resigned': '0-1',
            'timeout': '0-1',
        };
        return resultMap[result] || result;
    }

    /**
     * 生成PGN文本
     */
    generatePGN(game: any): string {
        if (game.pgn) {
            return game.pgn;
        }

        // 如果没有PGN，生成基本的PGN头部
        return `[Event "${game.event}"]
[Site "${game.site}"]
[Date "${game.date}"]
[Round "${game.round}"]
[White "${game.white}"]
[Black "${game.black}"]
[Result "${game.result}"]

${game.result}`;
    }
}
