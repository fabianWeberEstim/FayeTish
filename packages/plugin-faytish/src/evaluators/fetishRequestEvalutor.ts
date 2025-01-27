import {
    Evaluator,
    IAgentRuntime,
    elizaLogger,
    ActionExample,
    Memory as BaseMemory,
    Provider,
} from "@elizaos/core";
import {
    Memory,
    RuntimeWithTwitter,
    FetishRequest,
    ExtendedProvider,
} from "../types";
import { v4 as uuidv4 } from "uuid";

interface SolanaTransaction {
    signature: string;
    status: "confirmed" | "pending" | "failed";
    amount: number;
}

export const fetishRequestEvaluator: Evaluator = {
    name: "fetishRequestEvaluator",
    description: "Evaluates new fetish requests from Twitter DMs",
    similes: [
        "CHECK_REQUEST",
        "VALIDATE_REQUEST",
        "DM_REQUEST",
        "DIRECT_MESSAGE",
    ],

    validate: async (
        runtime: IAgentRuntime,
        message: BaseMemory
    ): Promise<boolean> => {
        try {
            elizaLogger.debug("Validating message:", message);

            const extendedMessage = message as Memory;
            if (
                extendedMessage.content.type !== "twitter_dm" &&
                extendedMessage.source !== "twitter_dm" &&
                !extendedMessage.content.isDM
            ) {
                elizaLogger.debug("Message is not from Twitter DM");
                return false;
            }

            const hasRequest = message.content.text
                ?.toLowerCase()
                .includes("request:");
            const hasTransaction = message.content.text
                ?.toLowerCase()
                .includes("transaction:");

            elizaLogger.debug(
                `Message validation - hasRequest: ${hasRequest}, hasTransaction: ${hasTransaction}`
            );

            return hasRequest && hasTransaction;
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
        message: BaseMemory
    ): Promise<boolean> => {
        try {
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;
            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("Twitter client not available");
                return false;
            }

            elizaLogger.debug("Processing DM request:", message);

            const text = message.content.text;
            const requestMatch = text.match(
                /request:\s*(.+?)(?=\s*transaction:|$)/i
            );
            const transactionMatch = text.match(/transaction:\s*([\w-]+)/i);

            if (!requestMatch || !transactionMatch) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Invalid format! Please use this format:\n\nrequest: [your request]\ntransaction: [solana transaction ID]`
                );
                return false;
            }

            const transactionId = transactionMatch[1];
            const requestText = requestMatch[1].trim();

            elizaLogger.debug(`Received request: ${requestText}`);
            elizaLogger.debug(`Transaction ID: ${transactionId}`);

            if (requestText.length < 10) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Your request is too short! Please provide more details.`
                );
                return false;
            }

            const solanaProvider = runtime.providers.find(
                (p) => (p as ExtendedProvider).type === "solanaProvider"
            );
            if (!solanaProvider) {
                elizaLogger.error("Solana provider not found");
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Sorry, our transaction verification service is currently unavailable. Please try again later.`
                );
                return false;
            }

            const txMemory: BaseMemory = {
                userId: message.userId,
                roomId: message.roomId,
                content: { text: transactionId || "" },
                createdAt: Date.now(),
                agentId: message.agentId,
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
                request: requestText,
                bountyAmount: transaction.amount,
                timestamp: Date.now(),
                isValid: true,
                transactionId: transactionId,
            };

            if (request.bountyAmount < 100) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Bounty amount must be at least 100 tokens!`
                );
                return false;
            }

            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            const confirmationLink = `https://solscan.io/tx/${transactionId}`;
            elizaLogger.log("link of confirmation", confirmationLink);
            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                `✅ Processing your request...\nTransaction ID: ${transactionId}\n\nPlease wait while we verify your transaction.`
            );

            return true;
        } catch (error) {
            elizaLogger.error("Error processing fetish request:", error);

            try {
                const runtimeWithTwitter = runtime as RuntimeWithTwitter;
                await runtimeWithTwitter.twitterClient?.sendDirectMessage(
                    message.userId,
                    `❌ An error occurred while processing your request. Please try again later.`
                );
            } catch (dmError) {
                elizaLogger.error("Error sending error DM:", dmError);
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
                        type: "twitter_dm",
                        isDM: true,
                    },
                },
            ],
            outcome:
                "Request validated and stored with transaction verification",
        },
    ],
};
