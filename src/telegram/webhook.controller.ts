import type { Env } from '../env';
import { TransactionService } from '../transactions/transaction.service';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramService } from './telegram.service';
import { SheetsService } from "../sheets/sheets.service";
import { formatTransactionSavedMessage } from "../transactions/transaction.formatter";
import type { TelegramUpdate } from './telegram.types';

export class TelegramWebhookController {
	private readonly telegramService: TelegramService;
	private readonly authService: TelegramAuthService;
	private readonly transactionService: TransactionService;
	private readonly sheetsService: SheetsService;

	constructor(private readonly env: Env) {
		this.telegramService = new TelegramService(env);
		this.authService = new TelegramAuthService(env);
		this.transactionService = new TransactionService();
		this.sheetsService = new SheetsService(env);
	}

	async handle(request: Request): Promise<Response> {
		if (!this.hasValidSecret(request)) {
			return new Response('Unauthorized', {
				status: 401,
			});
		}

		let update: TelegramUpdate;

		try {
			update = await request.json<TelegramUpdate>();
		} catch {
			return new Response('Invalid JSON', {
				status: 400,
			});
		}

		const message = update.message;

		if (!message) {
			return new Response('Ignored', {
				status: 200,
			});
		}

		const userId = message.from?.id;

		if (!userId) {
			return new Response('Ignored', {
				status: 200,
			});
		}

		if (!this.authService.isAllowed(userId)) {
			await this.telegramService.sendMessage({
				chatId: message.chat.id,
				text: '⛔ Você não está autorizado a usar este bot.',
			});

			return new Response('Forbidden', {
				status: 200,
			});
		}

		if (!message.text) {
			await this.telegramService.sendMessage({
				chatId: message.chat.id,
				text: 'Por enquanto, envie o lançamento em formato de texto.',
			});

			return new Response('OK', {
				status: 200,
			});
		}

		await this.processTextMessage(message.chat.id, message.text);

		return new Response('OK', {
			status: 200,
		});
	}

	private async processTextMessage(chatId: number, text: string): Promise<void> {
		const normalizedText = text.trim();

		if (normalizedText === '/start') {
			await this.telegramService.sendMessage({
				chatId,
				text: this.getStartMessage(),
			});

			return;
		}

		if (normalizedText === '/help') {
			await this.telegramService.sendMessage({
				chatId,
				text: this.getHelpMessage(),
			});

			return;
		}

		try {
			const transaction = this.transactionService.parse(normalizedText);

			const result = await this.sheetsService.appendTransaction( transaction );

			await this.telegramService.sendMessage({
				chatId,
				text: formatTransactionSavedMessage(transaction, result),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Erro inesperado ao interpretar o lançamento.';

			await this.telegramService.sendMessage({
				chatId,
				text: [`❌ ${message}`, '', this.getHelpMessage()].join('\n'),
			});
		}
	}

	private hasValidSecret(request: Request): boolean {
		const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

		return Boolean(receivedSecret) && receivedSecret === this.env.TELEGRAM_WEBHOOK_SECRET;
	}

	private getStartMessage(): string {
		return ['👋 Bot financeiro iniciado.', '', 'Envie despesas e recebimentos diretamente pelo Telegram.', '', this.getHelpMessage()].join(
			'\n',
		);
	}

	private getHelpMessage(): string {
		return [
			'Exemplos:',
			'',
			'15 nc Youtube Premium',
			'29,90 np Mercado Livre 10/07',
			'r 500 Freela',
			'recebido 4500 Salário 05/07/2026',
		].join('\n');
	}
}
