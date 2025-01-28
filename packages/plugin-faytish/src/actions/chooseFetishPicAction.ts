import {
    Action,
    IAgentRuntime,
    Memory,
    ActionExample,
    elizaLogger,
} from "@elizaos/core";
import { FootSubmission, RuntimeWithTwitter, FetishRequest } from "../types";

export const chooseFetishPicAction: Action = {
    name: "RUN_LOTTERY",
    description: "Selects winner from fetish request submissions",
    similes: ["SELECT_WINNER", "CHOOSE_WINNER"],

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        try {
            // دریافت درخواست‌های فعال
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];

            const activeRequests = requests.filter((req) => {
                if (!req.postId || req.winnerSelected) return false;
                const hoursSincePost =
                    (Date.now() - req.timestamp) / (1000 * 60 * 60);
                return hoursSincePost >= 24; // فقط درخواست‌هایی که 24 ساعت گذشته‌اند
            });

            if (activeRequests.length === 0) {
                elizaLogger.log("No eligible requests for lottery");
                return false;
            }

            // چک کردن وجود شرکت‌کنندگان معتبر
            const submissions =
                (await runtime.cacheManager.get<FootSubmission[]>(
                    "submissions_by_request"
                )) || {};
            return Object.keys(submissions).length > 0;
        } catch (error) {
            elizaLogger.error("Error validating lottery:", error);
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

            // دریافت درخواست‌های واجد شرایط
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            const submissions =
                (await runtime.cacheManager.get<
                    Record<string, FootSubmission[]>
                >("submissions_by_request")) || {};

            for (const request of requests) {
                if (!request.postId || request.winnerSelected) continue;

                const hoursSincePost =
                    (Date.now() - request.timestamp) / (1000 * 60 * 60);
                if (hoursSincePost < 24) continue;

                const requestSubmissions = submissions[request.id] || [];
                if (requestSubmissions.length === 0) {
                    elizaLogger.log(`No submissions for request ${request.id}`);
                    continue;
                }

                // انتخاب برنده تصادفی
                const winner =
                    requestSubmissions[
                        Math.floor(Math.random() * requestSubmissions.length)
                    ];

                const replyText = `🎉 Congratulations @${winner.displayName}!\n\nYou've won ${request.bountyAmount} tokens for request #${request.id}!\n\nPlease DM your wallet address to claim your prize! 🎁`;

                await runtimeWithTwitter.twitterClient.reply(
                    replyText,
                    winner.tweetId
                );

                // بروزرسانی وضعیت درخواست
                request.winnerSelected = true;
                await runtime.cacheManager.set(
                    "valid_fetish_requests",
                    requests
                );

                // پاک کردن شرکت‌کنندگان این درخواست
                delete submissions[request.id];
                await runtime.cacheManager.set(
                    "submissions_by_request",
                    submissions
                );

                elizaLogger.log(
                    `Selected winner for request ${request.id}: ${winner.displayName}`
                );
            }
        } catch (error) {
            elizaLogger.error("Error running lottery:", error);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Let's pick today's winner" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Selecting the winner!",
                    action: "RUN_LOTTERY",
                },
            },
        ],
    ] as ActionExample[][],
};
