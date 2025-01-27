import {
    Evaluator,
    IAgentRuntime,
    Memory,
    elizaLogger,
    ActionExample,
    RuntimeWithTwitter,
} from "@elizaos/core";
import { FetishRequest } from "../types";
import { v4 as uuidv4 } from "uuid";

interface SolanaTransaction {
    signature: string;
    status: "confirmed" | "pending" | "failed";
    amount: number;
}

export const fetishRequestEvaluator: Evaluator = {
    name: "fetishRequestEvaluator",
    description: "Evaluates new fetish requests from Twitter DMs",
    similes: ["CHECK_REQUEST", "VALIDATE_REQUEST"],

    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            // چک کردن اینکه پیام از دایرکت توییتر اومده
            if (!message.source || message.source !== "twitter_dm") {
                return false;
            }

            // چک کردن اینکه پیام حاوی درخواست و لینک تراکنش سولانا است
            return (
                message.content.text?.includes("request:") &&
                message.content.text?.includes("transaction:")
            );
        } catch (error) {
            elizaLogger.error(
                "Error in fetishRequestEvaluator validate:",
                error
            );
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;
            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("Twitter client not available");
                return false;
            }

            const text = message.content.text;
            const requestMatch = text.match(
                /request:\s*(.+?)(?=\s*transaction:|$)/i
            );
            const transactionMatch = text.match(/transaction:\s*([\w-]+)/i);

            if (!requestMatch || !transactionMatch) {
                // ارسال پیام راهنمایی به کاربر
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Invalid format! Please use this format:\n\nrequest: [your request]\ntransaction: [solana transaction ID]`
                );
                return false;
            }

            const transactionId = transactionMatch[1];

            // استفاده از پلاگین سولانا برای بررسی تراکنش
            const solanaProvider = runtime.providers.find(
                (p) => p.id === "solanaProvider"
            );
            if (!solanaProvider) {
                elizaLogger.error("Solana provider not found");
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Sorry, our transaction verification service is currently unavailable. Please try again later.`
                );
                return false;
            }

            // ساخت یک Memory object برای استفاده در provider
            const txMemory: Memory = {
                id: transactionId,
                userId: message.userId,
                roomId: message.roomId,
                content: { text: transactionId },
                createdAt: Date.now(),
                source: "twitter_dm",
            };

            const transaction = (await solanaProvider.get(
                runtime,
                txMemory
            )) as SolanaTransaction;

            if (!transaction || transaction.status !== "confirmed") {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Transaction not confirmed! Please make sure your transaction is confirmed on Solana network and try again.`
                );
                return false;
            }

            const request: FetishRequest = {
                id: uuidv4(),
                userId: message.userId,
                request: requestMatch[1].trim(),
                bountyAmount: transaction.amount,
                timestamp: Date.now(),
                isValid: true,
                transactionId: transactionId,
            };

            // بررسی اعتبار درخواست
            if (request.bountyAmount < 100) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Bounty amount must be at least 100 tokens!`
                );
                return false;
            }

            if (request.request.length < 10) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Request description is too short! Please provide more details.`
                );
                return false;
            }

            // ذخیره در لیست درخواست‌ها
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            // ارسال پیام تایید
            const confirmationLink = `https://solscan.io/tx/${transactionId}`;
            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                `✅ Your request has been validated!\n\nTransaction: ${confirmationLink}\nRequest ID: ${request.id}\n\nYour request will be posted soon!`
            );

            return true;
        } catch (error) {
            elizaLogger.error("Error processing fetish request:", error);

            // ارسال پیام خطا به کاربر
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;
            if (runtimeWithTwitter.twitterClient) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ An error occurred while processing your request. Please try again later.`
                );
            }
            return false;
        }
    },

    examples: [
        {
            context: "User sends fetish request via Twitter DM",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "request: Show feet with red nail polish\ntransaction: 5KjdKMWvJu2xCAQXxS2vpkib79x",
                        source: "twitter_dm",
                    },
                },
            ],
            outcome:
                "Request validated and stored with transaction verification",
        },
    ],
};
