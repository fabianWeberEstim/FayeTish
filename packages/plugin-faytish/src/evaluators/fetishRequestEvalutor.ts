import {
    Evaluator,
    IAgentRuntime,
    elizaLogger,
    booleanFooter,
    composeContext,
    ActionExample,
    Memory as BaseMemory,
    Provider,
    generateObjectArray,
    generateTrueOrFalse,
    ModelClass,
    stringToUuid,
} from "@elizaos/core";

import {
    Memory,
    RuntimeWithTwitter,
    FetishRequest,
    ExtendedProvider,
} from "../types";
import { v4 as uuidv4 } from "uuid";

const requestValidationTemplate =
    `
TASK: Validate if the request is related to feet style or appearance.

Look for requests that:
- Mention specific style or appearance keywords
- Contain words related to feet, nails, or toes
- Express clear requirements about style or appearance

Based on the following request, is it related to feet style or appearance? YES or NO

{{request}}

Is the request related to feet style or appearance? ` + booleanFooter;

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

async function validateRequest(
    runtime: IAgentRuntime,
    text: string,
    conversationId: string
): Promise<boolean> {
    const runtimeWithTwitter = runtime as RuntimeWithTwitter;
    const requestMatch = text.toLowerCase().match(/^request:\s*(.+)/i);
    if (!requestMatch) return false;
    const styleKeywords = [
        "style",
        "appearance",
        "look",
        "design",
        "polish",
        "color",
        "shape",
        "nails",
        "toes",
        "pedicure",
        "art",
        "decoration",
        "shoes",
        "socks",
        "sneakers",
        "boots",
        "sandals",
        "heels",
        "footwear",
        "footwear style",
        "footwear design",
        "footwear polish",
        "footwear color",
        "footwear shape",
        "footwear size",
        "footwear brand",
        "footwear shape",
    ];
    const requestText = requestMatch[1].trim();
    const isStyleRelated = styleKeywords.some((keyword) =>
        requestText.includes(keyword)
    );
    if (!isStyleRelated) {
        await runtimeWithTwitter.twitterClient.sendDirectMessage(
            conversationId,
            "⚠️ We only accept requests related to feet style or appearance. Please modify your request to include style-related keywords."
        );
    }

    return isStyleRelated;
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
        message: Memory
    ): Promise<boolean> => {
        try {
            const extendedMessage = message as Memory;
            return (
                extendedMessage.content.isDM &&
                validateRequest(
                    runtime,
                    message.content.text,
                    message.conversationId
                )
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

            // Check user's previous requests
            const userRequests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    `user_requests_${message.userId}`
                )) || [];

            // If user has sent a request in the last 6 hours
            const lastRequest = userRequests[userRequests.length - 1];
            if (
                lastRequest &&
                Date.now() - lastRequest.timestamp < 6 * 60 * 60 * 1000
            ) {
                const responseMessage: Memory = {
                    id: stringToUuid(uuidv4()),
                    agentId: runtime.agentId,
                    content: {
                        text: `⏳ You have already submitted a request. Please wait 6 hours before submitting a new one.`,
                        type: "dm",
                        isDM: true,
                    },
                    roomId: stringToUuid(`twitter_dm_${message.userId}`),
                    userId: message.userId,
                    conversationId: message.conversationId,
                    source: "twitter_dm",
                };

                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    responseMessage.conversationId,
                    responseMessage.content.text
                );
                return false;
            }

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

            // Save user's request
            userRequests.push(request);
            await runtime.cacheManager.set(
                `user_requests_${message.userId}`,
                userRequests
            );

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
                    text: `✅ Your request has been saved!\n\n🔍 ID: ${request.id}\n📝 Request: ${requestText}\n\n⏳ You can submit a new request after 6 hours.`,
                    type: "dm",
                    isDM: true,
                },
                roomId: stringToUuid(`twitter_dm_${message.userId}`),
                userId: message.userId,
                conversationId: message.conversationId,
                source: "twitter_dm",
            };

            const jvb =
                await runtimeWithTwitter.twitterClient.sendDirectMessage(
                    responseMessage.conversationId,
                    responseMessage.content.text
                );

            elizaLogger.log(`New request registered - ID: ${request.id}`);
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
