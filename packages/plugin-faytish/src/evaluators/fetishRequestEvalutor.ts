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
            elizaLogger.debug("Received message:", {
                content: message.content,
                source: message.source,
            });

            if (message.content.isDM || message.source === "twitter_dm") {
                elizaLogger.debug("Message is from Twitter DM");
                return true;
            }

            elizaLogger.debug("Message is not from Twitter DM");
            return false;
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
            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("Twitter client not available");
                return false;
            }

            elizaLogger.debug("Processing message:", message.content.text);

            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                "✅ I received your message! Processing your request..."
            );

            return true;
        } catch (error) {
            elizaLogger.error("Error in handler:", error);
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
