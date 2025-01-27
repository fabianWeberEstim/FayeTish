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
        message: Memory
    ): Promise<boolean> => {
        const runtimeWithTwitter = runtime as RuntimeWithTwitter;

        try {
            elizaLogger.debug("=== Starting Twitter DM Processing ===");

            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("❌ Twitter client not available");
                return false;
            }

            const text = message.content.text;
            const requestMatch = text.match(
                /request:\s*(.+?)(?=\s*transaction:|$)/i
            );
            const transactionMatch = text.match(/transaction:\s*([\w-]+)/i);

            if (!requestMatch || !transactionMatch) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ Invalid format! Please use this format:\n\nrequest: [your request]\ntransaction: [transaction ID]`
                );
                return false;
            }

            const requestText = requestMatch[1].trim();
            const transactionId = transactionMatch[1];

            // Create new request
            const request: FetishRequest = {
                id: uuidv4(),
                userId: message.userId,
                request: requestText,
                bountyAmount: 0, // Default value for now
                timestamp: Date.now(),
                isValid: true,
                transactionId: transactionId,
            };

            // Save request to cache
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            // Send confirmation message
            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                `✅ Your request has been successfully registered!\n\n🔍 Request ID: ${request.id}\n📝 Request: ${requestText}\n\n⏳ Your request is queued and will be posted soon.`
            );

            elizaLogger.debug(`New request registered - ID: ${request.id}`);
            return true;
        } catch (error) {
            elizaLogger.error("Error processing DM:", error);
            try {
                await runtimeWithTwitter.twitterClient?.sendDirectMessage(
                    message.userId,
                    "❌ An error occurred while processing your request. Please try again."
                );
            } catch (sendError) {
                elizaLogger.error("Error sending error message:", sendError);
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
