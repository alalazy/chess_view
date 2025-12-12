export class ImportService {
    static readonly LICHESS_API_HOST = "https://lichess.org";
    static readonly CHESSCOM_API_HOST = "https://api.chess.com";

    async fetchLichessGames(
        username: string,
        onGame: (game: any) => void,
        onComplete?: () => void,
        onError?: (error: Error) => void
    ): Promise<void> {
        try {
            const headers: any = {
                'Accept': 'application/x-ndjson'
            };

            const response = await fetch(
                `${ImportService.LICHESS_API_HOST}/api/games/user/${username}?pgnInJson=true&clocks=false&evals=false&opening=false`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Lichess API error: ${response.status}`);
            }

            // 使用streaming方式处理响应
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    // 处理最后的buffer
                    if (buffer.trim()) {
                        try {
                            const game = JSON.parse(buffer);
                            onGame(this.parseLichessGame(game));
                        } catch (e) {
                            console.error('Error parsing final game:', e);
                        }
                    }
                    break;
                }

                // 将新数据添加到buffer
                buffer += decoder.decode(value, { stream: true });

                // 按行分割并处理完整的行
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个不完整的行

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const game = JSON.parse(line);
                            onGame(this.parseLichessGame(game));
                        } catch (e) {
                            console.error('Error parsing game:', e);
                        }
                    }
                }
            }

            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error('Error fetching Lichess games:', error);
            if (onError) {
                onError(error as Error);
            } else {
                throw error;
            }
        }
    }

    async fetchChesscomGames(
        username: string,
        onGame: (game: any) => void,
        onComplete?: () => void,
        onError?: (error: Error) => void
    ): Promise<void> {
        try {
            const archivesResponse = await fetch(
                `${ImportService.CHESSCOM_API_HOST}/pub/player/${username}/games/archives`
            );

            if (!archivesResponse.ok) {
                throw new Error(`Chess.com API error: ${archivesResponse.status}`);
            }

            const archivesData = await archivesResponse.json();
            const archives = archivesData.archives || [];

            if (archives.length === 0) {
                if (onComplete) {
                    onComplete();
                }
                return;
            }

            // 从最新到最旧逐月获取棋局
            for (let i = archives.length - 1; i >= 0; i--) {
                const archiveUrl = archives[i];
                
                try {
                    const gamesResponse = await fetch(archiveUrl);

                    if (!gamesResponse.ok) {
                        console.error(`Chess.com games API error for ${archiveUrl}: ${gamesResponse.status}`);
                        continue;
                    }

                    const gamesData = await gamesResponse.json();
                    const games = gamesData.games || [];

                    // 逐个处理棋局
                    for (const game of games) {
                        try {
                            onGame(this.parseChesscomGame(game));
                        } catch (e) {
                            console.error('Error parsing game:', e);
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching archive ${archiveUrl}:`, e);
                }
            }

            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error('Error fetching Chess.com games:', error);
            if (onError) {
                onError(error as Error);
            } else {
                throw error;
            }
        }
    }


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
            site: `${ImportService.LICHESS_API_HOST}/${game.id}`,
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

    private formatResult(winner: string | undefined, status: string): string {
        if (!winner) {
            return status === 'draw' ? '1/2-1/2' : '*';
        }
        return winner === 'white' ? '1-0' : '0-1';
    }

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
