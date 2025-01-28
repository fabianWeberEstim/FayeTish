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

    initialize: async (runtime: IAgentRuntime) => {
        setInterval(async () => {
            try {
                const requests =
                    (await runtime.cacheManager.get<FetishRequest[]>(
                        "valid_fetish_requests"
                    )) || [];
                const lastPostedRequest = requests.find((req) => req.postId);

                // اگر آخرین پست وجود دارد و از زمان آن 6 ساعت گذشته است
                if (
                    lastPostedRequest &&
                    Date.now() - lastPostedRequest.timestamp >=
                        6 * 60 * 60 * 1000
                ) {
                    const shouldPost = await postFetishAction.validate(runtime);
                    if (shouldPost) {
                        await postFetishAction.handler(runtime);
                    }
                }
                // اگر هیچ پستی قبلا ارسال نشده است
                else if (!lastPostedRequest) {
                    const shouldPost = await postFetishAction.validate(runtime);
                    if (shouldPost) {
                        await postFetishAction.handler(runtime);
                    }
                }
            } catch (error) {
                elizaLogger.error("Error in scheduled post:", error);
            }
        }, 60 * 1000); // هر 1 دقیقه چک کن (برای دقت بیشتر)
    },

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

            // بروزرسانی درخواست با شناسه پست و زمان ارسال
            nextRequest.postId = tweet.id;
            nextRequest.timestamp = Date.now(); // زمان فعلی را ذخیره کنید
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
