import {
    Action,
    IAgentRuntime,
    Memory,
    ActionExample,
    elizaLogger
} from "@elizaos/core";

export const lotteryAction: Action = {
    name: "RUN_LOTTERY",
    description: "Selects winner from challenge participants",
    similes: ["SELECT_WINNER", "CHOOSE_WINNER"],

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        try {
            const lastPost = await runtime.cacheManager.get("last_challenge_post");
            if (!lastPost) {
                elizaLogger.debug("No previous challenge post found");
                return false;
            }

            // Get all submissions from the active submissions list
            const submissions = await runtime.cacheManager.lrange('active_foot_submissions', 0, -1);

            // Filter submissions after last post
            const validSubmissions = submissions.filter(sub => sub.timestamp > lastPost.timestamp);

            elizaLogger.debug(`Found ${validSubmissions.length} valid submissions after last post`);
            return validSubmissions.length > 0;
        } catch (error) {
            elizaLogger.error("Error validating lottery:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime): Promise<void> => {
        try {
            const lastPost = await runtime.cacheManager.get("last_challenge_post");
            if (!lastPost) return;

            // Get all submissions and filter by timestamp
            const submissions = await runtime.cacheManager.get('active_foot_submissions');
            const validSubmissions = submissions.filter(sub => sub.timestamp > lastPost.timestamp);

            if (validSubmissions.length === 0) {
                elizaLogger.debug("No valid submissions found for lottery");
                return;
            }

            // Select random winner
            const winner = validSubmissions[Math.floor(Math.random() * validSubmissions.length)];

            const replyText = `🎉 Congratulations @${winner.username}!\n\nYou're today's winner! DM your wallet address to receive tokens! 🎁\n\n#FootChallenge #Winner`;

            elizaLogger.debug(`Selected winner: ${winner.username}`);
            await runtime.twitterClient.reply(replyText, winner.tweetId);

            // Clear the active submissions after selecting winner
            await runtime.cacheManager.del('active_foot_submissions');

        } catch (error) {
            elizaLogger.error("Error running lottery:", error);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Let's pick today's winner" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Selecting the winner!",
                    action: "RUN_LOTTERY"
                }
            }
        ]
    ] as ActionExample[][]
};