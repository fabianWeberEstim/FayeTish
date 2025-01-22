import {
    Action,
    IAgentRuntime,
    Memory,
    ActionExample,
    elizaLogger
} from "@elizaos/core";
import { ChallengePost, RuntimeWithTwitter } from "../types";

export const postChallengeAction: Action = {
    name: "POST_CHALLENGE",
    description: "Posts daily foot photo challenge",
    similes: ["DAILY_CHALLENGE", "FOOT_CHALLENGE"],

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        try {
            const lastPost = await runtime.cacheManager.get<ChallengePost>("last_challenge_post");
            if (lastPost) {
                const hoursSinceLastPost = (Date.now() - lastPost.timestamp) / (1000 * 60 * 60);
                elizaLogger.debug(`Hours since last challenge post: ${hoursSinceLastPost}`);
                return hoursSinceLastPost >= 24;
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error validating challenge post:", error);
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

            const challengeText = "🦶 Daily Foot Challenge!\n\nReply with a photo of your feet for a chance to win tokens! 🎉\n\n#FootChallenge #CryptoGiveaway";

            elizaLogger.debug("Posting new challenge tweet");
            const tweet = await runtimeWithTwitter.twitterClient.tweet(challengeText);

            const newPost: ChallengePost = {
                timestamp: Date.now(),
                tweetId: tweet.id
            };

            await runtime.cacheManager.set("last_challenge_post", newPost);
            await runtime.cacheManager.set('active_foot_submissions', []);

            elizaLogger.debug(`Challenge post created with ID: ${tweet.id}`);
        } catch (error) {
            elizaLogger.error("Error posting challenge:", error);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Time for a new challenge" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Posting new foot challenge!",
                    action: "POST_CHALLENGE"
                }
            }
        ]
    ] as ActionExample[][]
};