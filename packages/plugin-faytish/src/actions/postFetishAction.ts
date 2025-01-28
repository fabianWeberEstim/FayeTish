import {
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    HandlerCallback,
    ActionExample,
    type Action,
} from "@elizaos/core";
import { FetishRequest } from "../types";
import TwitterPostClient from "@elizaos/client-twitter";

export const postFetishAction: Action = {
    name: "POST_FETISH_REQUEST",
    similes: ["POST_REQUEST", "MAKE_POST"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating fetish post from user:", message.userId);
        return true;
    },
    description: "Posts a fetish request from the queue",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting POST_FETISH_REQUEST handler...");

        try {
            // دریافت درخواست‌های معتبر از کش
            const requests = await runtime.cacheManager.get<FetishRequest[]>(
                "valid_fetish_requests",
                []
            );
            const lastPostedRequest = requests.find((req) => req.postId);

            // اگر آخرین پست وجود دارد و از زمان آن 6 ساعت گذشته است
            if (
                lastPostedRequest &&
                Date.now() - lastPostedRequest.timestamp >= 6 * 60 * 60 * 1000
            ) {
                const request = requests.find((req) => !req.postId);
                if (request) {
                    // استفاده از TwitterPostClient برای ارسال توییت
                    const twitterClient = new TwitterPostClient(runtime);
                    const postResult = await twitterClient.postTweet(
                        request.request
                    );

                    request.postId = postResult.id;
                    request.timestamp = Date.now();
                    await runtime.cacheManager.set(
                        "valid_fetish_requests",
                        requests
                    );
                    elizaLogger.log("Post successful:", postResult);
                    return true;
                }
            }
            // اگر هیچ پستی قبلا ارسال نشده است
            else if (!lastPostedRequest) {
                const request = requests.find((req) => !req.postId);
                if (request) {
                    // استفاده از TwitterPostClient برای ارسال توییت
                    const twitterClient = new TwitterPostClient(runtime);
                    const postResult = await twitterClient.postTweet(
                        request.request
                    );

                    request.postId = postResult.id;
                    request.timestamp = Date.now();
                    await runtime.cacheManager.set(
                        "valid_fetish_requests",
                        requests
                    );
                    elizaLogger.log("Post successful:", postResult);
                    return true;
                }
            }

            return false;
        } catch (error) {
            elizaLogger.error("Error during fetish post:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Post the next fetish request",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Posting new fetish request!",
                    action: "POST_FETISH_REQUEST",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully posted fetish request: Check out this new fetish request!",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
