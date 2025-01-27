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

function validateRequest(text: string): RequestValidation {
    const requestMatch = text.match(/request:\s*(.+?)(?=\s*transaction:|$)/i);
    // const transactionMatch = text.match(/transaction:\s*([\w-]+)/i);

    // if (!requestMatch || !transactionMatch) {
    if (!requestMatch) {
        return {
            isValid: false,
            hasValidFormat: false,
            hasValidContent: false,
            errorMessage:
                // "Invalid format! Use: request: [request] transaction: [ID]",
                "Invalid format! Use: request: [request]",
        };
    }

    const requestText = requestMatch[1].trim().toLowerCase();
    const validKeywords = ["feet", "foot", "nails", "toes"];
    const hasValidKeywords = validKeywords.some((keyword) =>
        requestText.includes(keyword)
    );

    if (!hasValidKeywords) {
        return {
            isValid: false,
            hasValidFormat: true,
            hasValidContent: false,
            errorMessage: "Request must be related to feet or nails content",
        };
    }

    return {
        isValid: true,
        hasValidFormat: true,
        hasValidContent: true,
    };
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

            const validation = validateRequest(message.content.text);
            return validation.isValid;
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

            const validation = validateRequest(message.content.text);
            if (!validation.isValid) {
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    message.userId,
                    `❌ ${validation.errorMessage}`
                );
                return false;
            }

            const requestMatch = message.content.text.match(
                /request:\s*(.+?)(?=\s*transaction:|$)/i
            );
            // const transactionMatch = message.content.text.match(
            //     /transaction:\s*([\w-]+)/i
            // );
            const requestText = requestMatch[1].trim();
            // const transactionId = transactionMatch[1];

            // Create new request
            const request: FetishRequest = {
                id: uuidv4(),
                userId: message.userId,
                request: requestText,
                bountyAmount: 0, // Default value for now
                timestamp: Date.now(),
                isValid: true,
                transactionId: "pending", // temporary placeholder
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
                `✅ Request Accepted!\n\n🔍 ID: ${request.id}\n📝 Request: ${requestText}\n\n⏳ Your request will be posted soon.`
            );

            elizaLogger.debug(`New request registered - ID: ${request.id}`);
            return true;
        } catch (error) {
            elizaLogger.error("Error processing DM:", error);
            try {
                await runtimeWithTwitter.twitterClient?.sendDirectMessage(
                    message.userId,
                    "❌ An error occurred. Please try again."
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
