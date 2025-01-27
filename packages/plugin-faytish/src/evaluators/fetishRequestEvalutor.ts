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
            elizaLogger.debug("Message source:", message.source);
            elizaLogger.debug("Message type:", message.content.type);
            elizaLogger.debug("Is DM:", message.content.isDM);

            if (message.source === "twitter_dm" || message.content.isDM) {
                elizaLogger.debug("✅ پیام از دایرکت مسیج توییتر تایید شد");
                return true;
            }

            elizaLogger.debug("❌ پیام از دایرکت مسیج توییتر نیست");
            return false;
        } catch (error) {
            elizaLogger.error("خطا در اعتبارسنجی:", error);
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
                elizaLogger.error("کلاینت توییتر در دسترس نیست");
                return false;
            }

            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                "✅ درخواست شما دریافت شد! در حال پردازش..."
            );

            return true;
        } catch (error) {
            elizaLogger.error("خطا در پردازش درخواست:", error);
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
