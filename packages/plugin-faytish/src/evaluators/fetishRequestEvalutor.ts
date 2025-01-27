import {
    Evaluator,
    IAgentRuntime,
    Memory,
    elizaLogger,
} from "@elizaos/core";
import { FetishRequest } from "../types";
import { v4 as uuidv4 } from 'uuid';

interface SolanaTransaction {
    signature: string;
    status: 'confirmed' | 'pending' | 'failed';
    amount: number;
}

export const fetishRequestEvaluator: Evaluator = {
    name: "fetishRequestEvaluator",
    description: "Evaluates new fetish requests for validity",
    similes: ["CHECK_REQUEST", "VALIDATE_REQUEST"],

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        // چک کردن اینکه پیام حاوی درخواست و لینک تراکنش سولانا است
        return message.content.text?.includes("request:") &&
               message.content.text?.includes("transaction:");
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            const text = message.content.text;
            const requestMatch = text.match(/request:\s*(.+?)(?=\s*transaction:|$)/i);
            const transactionMatch = text.match(/transaction:\s*([\w-]+)/i);

            if (!requestMatch || !transactionMatch) return false;

            const transactionId = transactionMatch[1];

            // استفاده از پلاگین سولانا برای بررسی تراکنش
            const solanaProvider = runtime.providers.find(p => p.name === "solanaProvider");
            if (!solanaProvider) {
                elizaLogger.error("Solana provider not found");
                return false;
            }

            const transaction = await solanaProvider.get(runtime, transactionId) as SolanaTransaction;

            if (!transaction || transaction.status !== 'confirmed') {
                elizaLogger.debug("Transaction not confirmed:", transactionId);
                return false;
            }

            const request: FetishRequest = {
                id: uuidv4(),
                userId: message.userId,
                request: requestMatch[1].trim(),
                bountyAmount: transaction.amount,
                timestamp: Date.now(),
                isValid: true,
                transactionId: transactionId
            };

            // بررسی اعتبار درخواست
            if (request.bountyAmount < 100 || request.request.length < 10) {
                request.isValid = false;
            }

            // ذخیره در لیست درخواست‌ها
            const requests = await runtime.cacheManager.get<FetishRequest[]>("valid_fetish_requests") || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            // ارسال پیام تایید به کاربر
            const confirmationLink = `https://solscan.io/tx/${transactionId}`;
            await runtime.messageManager.send({
                userId: message.userId,
                content: {
                    text: `✅ Your request has been validated!\n\nTransaction: ${confirmationLink}\nRequest ID: ${request.id}\n\nYour request will be posted soon!`
                }
            });

            return request.isValid;
        } catch (error) {
            elizaLogger.error("Error processing fetish request:", error);
            return false;
        }
    }
};