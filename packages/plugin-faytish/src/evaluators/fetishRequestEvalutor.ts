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

const requestTemplate = `
TASK: Validate fetish request from Twitter DM.

Request Format:
- Must start with "request:"
- Must include transaction ID
- Must be related to feet/nails content
- Must be appropriate and clear

Please validate:
1. Format Validation
- Correct request format
- Valid transaction ID
- Clear description

2. Content Validation
- Related to feet/nails
- Appropriate content
- Clear requirements

3. Request Details:
{{request}}
Transaction: {{transaction}}
`;

interface RequestValidation {
    isValid: boolean;
    hasValidFormat: boolean;
    hasValidContent: boolean;
    errorMessage?: string;
}

interface TwitterDMContent {
    text: string;
    isDM: boolean;
    conversationId: string;
    senderId: string;
    senderScreenName: string;
}

function validateRequest(text: string): boolean {
    const requestMatch = text.toLowerCase().match(/^request:\s*(.+)/i);
    if (!requestMatch) return false;

    const requestText = requestMatch[1].trim().toLowerCase();
    const validKeywords = ["feet", "foot", "nails", "toes"];
    return validKeywords.some((keyword) => requestText.includes(keyword));
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
                !extendedMessage.content.isDM ||
                !extendedMessage.content.conversationId
            ) {
                elizaLogger.debug("Message is not from Twitter DM");
                return false;
            }

            return validateRequest(message.content.text);
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
        const content = message.content as TwitterDMContent;

        try {
            elizaLogger.debug("=== Starting Twitter DM Processing ===");

            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("❌ Twitter client not available");
                return false;
            }

            const requestMatch = content.text.match(/^request:\s*(.+)/i);
            const requestText = requestMatch[1].trim();

            const request: FetishRequest = {
                id: uuidv4(),
                userId: content.senderId,
                userScreenName: content.senderScreenName,
                request: requestText,
                bountyAmount: 0,
                timestamp: Date.now(),
                isValid: true,
                conversationId: content.conversationId,
                transactionId: "", // Empty for now
            };

            // Save request with conversation details
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            // Send response using conversationId
            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                content.senderId,
                `✅ Request Accepted!\n\n🔍 ID: ${request.id}\n👤 User: @${content.senderScreenName}\n📝 Request: ${requestText}\n\n⏳ Your request will be posted soon.`,
                content.conversationId
            );

            elizaLogger.debug(
                `New request registered - ID: ${request.id} - Conversation: ${content.conversationId}`
            );
            return true;
        } catch (error) {
            elizaLogger.error("Error processing request:", error);
            try {
                await runtimeWithTwitter.twitterClient?.sendDirectMessage(
                    content.senderId,
                    "❌ An error occurred. Please try again with format: request: [your request]",
                    content.conversationId
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
