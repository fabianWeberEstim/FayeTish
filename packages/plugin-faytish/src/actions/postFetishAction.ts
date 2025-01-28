import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    HandlerCallback,
    ActionExample,
} from "@elizaos/core";
import { FetishRequest } from "../types";
import { Scraper } from "agent-twitter-client";

async function postFetishTweet(content: string): Promise<{ id: string }> {
    const scraper = new Scraper();
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;
    const twitter2faSecret = process.env.TWITTER_2FA_SECRET;

    if (!username || !password) {
        elizaLogger.error("Twitter credentials not configured in environment");
        throw new Error("Twitter credentials not configured");
    }

    await scraper.login(username, password, email, twitter2faSecret);
    if (!(await scraper.isLoggedIn())) {
        elizaLogger.error("Failed to login to Twitter");
        throw new Error("Failed to login to Twitter");
    }

    elizaLogger.log("Attempting to send tweet:", content);
    const result = await scraper.sendTweet(content);

    const body = await result.json();
    elizaLogger.log("Tweet response:", body);

    if (body.errors) {
        const error = body.errors[0];
        elizaLogger.error(
            `Twitter API error (${error.code}): ${error.message}`
        );
        throw new Error(`Twitter API error: ${error.message}`);
    }

    if (!body?.data?.create_tweet?.tweet_results?.result) {
        elizaLogger.error("Failed to post tweet: No tweet result in response");
        throw new Error("Failed to post tweet: No tweet result in response");
    }

    return { id: body?.data?.create_tweet?.tweet_results?.result.rest_id };
}

export const postFetishAction: Action = {
    name: "POST_FETISH_REQUEST",
    similes: ["POST_REQUEST", "MAKE_POST"],
    description: "Posts a fetish request from the queue",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        const hasCredentials =
            !!process.env.TWITTER_USERNAME && !!process.env.TWITTER_PASSWORD;
        elizaLogger.log(`Has credentials: ${hasCredentials}`);

        return hasCredentials;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting POST_FETISH_REQUEST handler...");

        try {
            const requests = await runtime.cacheManager.get<FetishRequest[]>(
                "valid_fetish_requests"
            );
            const lastPostedRequest = requests.find((req) => req.postId);

            // اگر آخرین پست وجود دارد و از زمان آن 6 ساعت گذشته است
            if (
                lastPostedRequest &&
                Date.now() - lastPostedRequest.timestamp >= 6 * 60 * 60 * 1000
            ) {
                const request = requests.find((req) => !req.postId);
                if (request) {
                    const postResult = await postFetishTweet(request.request);
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
                    const postResult = await postFetishTweet(request.request);
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
                content: { text: "Post the next fetish request" },
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
