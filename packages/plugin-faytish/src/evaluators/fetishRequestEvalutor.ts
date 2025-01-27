import {
    Evaluator,
    IAgentRuntime,
    elizaLogger,
    ActionExample,
    Memory as BaseMemory,
    Provider,
    stringToUuid,
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
            const extendedMessage = message as Memory;
            return (
                extendedMessage.content.isDM &&
                validateRequest(message.content.text)
            );
        } catch (error) {
            elizaLogger.error("Error in validate:", error);
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;
            const requestMatch =
                message.content.text.match(/^request:\s*(.+)/i);
            const requestText = requestMatch[1].trim();

            const request: FetishRequest = {
                id: uuidv4(),
                userId: message.userId,
                request: requestText,
                bountyAmount: 0,
                timestamp: Date.now(),
                isValid: true,
                transactionId: "",
                conversationId: message.conversationId,
                userScreenName: message.senderScreenName,
            };

            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            requests.push(request);
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            const responseMessage: Memory = {
                id: stringToUuid(uuidv4()),
                agentId: runtime.agentId,
                content: {
                    text: `✅ Request Accepted!\n\n🔍 ID: ${request.id}\n📝 Request: ${requestText}\n\n⏳ Your request will be posted soon.`,
                    type: "dm",
                    isDM: true,
                },
                roomId: stringToUuid(`twitter_dm_${message.userId}`),
                userId: message.userId,
                conversationId: message.conversationId,
                source: "twitter_dm",
            };
            elizaLogger.log(
                "responseMessage *************** :",
                responseMessage
            );
            // ارسال پیام با استفاده از handleMessage
            const jvb =
                await runtimeWithTwitter.twitterClient.handleMessage(
                    responseMessage
                );
            elizaLogger.log("jvb *************** :", jvb);
            elizaLogger.debug(`New request registered - ID: ${request.id}`);
            return true;
        } catch (error) {
            elizaLogger.error("Error processing request:", error);
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
                        text: "request: Show feet with red nail polish",
                        type: "twitter_dm",
                        isDM: true,
                    },
                },
            ],
            outcome: "Request validated and stored",
        },
    ],
};
