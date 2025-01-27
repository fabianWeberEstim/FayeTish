import { Evaluator, IAgentRuntime, elizaLogger } from "@elizaos/core";
import { Memory, RuntimeWithTwitter, FetishRequest } from "../types";

export const fetishRequestEvaluator: Evaluator = {
    name: "fetishRequestEvaluator",
    description: "Evaluates new fetish requests from Twitter DMs",
    similes: ["CHECK_REQUEST", "VALIDATE_REQUEST", "DM_REQUEST"],

    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            elizaLogger.debug("=== Twitter DM Validation Start ===");
            elizaLogger.debug(
                "Full message object:",
                JSON.stringify(message, null, 2)
            );
            elizaLogger.debug("Message content:", message.content);
            elizaLogger.debug("Message source:", message.source);
            elizaLogger.debug("Message type:", message.content.type);
            elizaLogger.debug("Is DM:", message.content.isDM);

            if (message.content.isDM || message.source === "twitter_dm") {
                elizaLogger.debug("✅ Message validated as Twitter DM");
                return true;
            }

            elizaLogger.debug("❌ Message is not from Twitter DM");
            return false;
        } catch (error) {
            elizaLogger.error("Error in validate:", error);
            elizaLogger.error("Error details:", JSON.stringify(error, null, 2));
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            elizaLogger.debug("=== Twitter DM Handler Start ===");
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;

            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("❌ Twitter client not available");
                return false;
            }

            elizaLogger.debug("Twitter client available ✅");
            elizaLogger.debug("Processing message:", message.content.text);

            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                "✅ I received your message! Processing your request..."
            );

            elizaLogger.debug("✅ Response DM sent successfully");
            return true;
        } catch (error) {
            elizaLogger.error("Error in handler:", error);
            elizaLogger.error("Error details:", JSON.stringify(error, null, 2));
            return false;
        }
    },

    examples: [
        {
            context: "User sends message via Twitter DM",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hello",
                        isDM: true,
                    },
                },
            ],
            outcome: "Message received and processed",
        },
    ],
};
