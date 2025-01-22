import {
    Action,
    IAgentRuntime,
    Memory,
    elizaLogger,
    ActionExample,
    Content
} from "@elizaos/core";

export const lotteryAction: Action = {
    name: "RUN_LOTTERY",
    description: "Selects winner from challenge participants",
    similes: ["SELECT_WINNER", "CHOOSE_WINNER"],

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        try {
            const lastPost = await runtime.databaseAdapter.get("last_challenge_post");
            if (!lastPost) {
                elizaLogger.debug("No previous challenge post found");
                return false;
            }

            const submissions = await runtime.databaseAdapter.query("foot_submissions", {
                timestamp: {
                    $gt: lastPost.timestamp
                }
            });

            elizaLogger.debug(`Found ${submissions.length} valid submissions`);
            return submissions.length > 0;
        } catch (error) {
            elizaLogger.error("Error validating lottery:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime): Promise<void> => {
        try {
            const submissions = await getAllValidSubmissions(runtime);
            if (submissions.length === 0) {
                elizaLogger.debug("No valid submissions found for lottery");
                return;
            }

            const winner = submissions[Math.floor(Math.random() * submissions.length)];

            const replyText = `🎉 Congratulations @${winner.username}!\n\nYou're today's challenge winner! Please DM your wallet address to receive your tokens! 🎁\n\n#FootChallenge #Winner`;

            elizaLogger.debug(`Selected winner: ${winner.username}`);
            await runtime.twitterClient.reply(replyText, winner.tweetId);

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
                    text: "Selecting the winner for today's challenge!",
                    action: "RUN_LOTTERY"
                }
            }
        ]
    ] as ActionExample[][]
};

async function getAllValidSubmissions(runtime: IAgentRuntime) {
    const lastPost = await runtime.databaseAdapter.get("last_challenge_post");
    return await runtime.databaseAdapter.query("foot_submissions", {
        timestamp: {
            $gt: lastPost.timestamp
        }
    });
}