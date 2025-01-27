import {
    Action,
    IAgentRuntime,
    Memory,
    ActionExample,
    elizaLogger,
} from "@elizaos/core";
import { FetishRequest, RuntimeWithTwitter } from "../types";

export const postFetishAction: Action = {
    name: "POST_FETISH_REQUEST",
    description: "Posts fetish request from queue",
    similes: ["POST_REQUEST", "MAKE_POST"],

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        try {
            // چک کردن درخواست‌های معتبر در صف
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            const pendingRequests = requests.filter(
                (req) => !req.postId && req.isValid
            );

            return pendingRequests.length > 0;
        } catch (error) {
            elizaLogger.error("Error validating fetish post:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime): Promise<void> => {
        try {
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;
            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("Twitter client not available");
                return;
            }

            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            const nextRequest = requests.find(
                (req) => !req.postId && req.isValid
            );

            if (!nextRequest) return;

            const tweetText = `🎭 New Fetish Request!\n\n${nextRequest.request}\n\nReply with your submission! Winner gets ${nextRequest.bountyAmount} tokens! 💰\n\nRequest ID: ${nextRequest.id}`;

            const tweet =
                await runtimeWithTwitter.twitterClient.tweet(tweetText);

            // بروزرسانی درخواست با شناسه پست
            nextRequest.postId = tweet.id;
            await runtime.cacheManager.set("valid_fetish_requests", requests);

            elizaLogger.log(
                `Posted fetish request ${nextRequest.id} with tweet ID: ${tweet.id}`
            );
        } catch (error) {
            elizaLogger.error("Error posting fetish request:", error);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Time to post next request" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Posting new fetish request!",
                    action: "POST_FETISH_REQUEST",
                },
            },
        ],
    ] as ActionExample[][],
};
