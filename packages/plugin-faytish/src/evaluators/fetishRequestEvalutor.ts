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
            elizaLogger.log("=== Twitter DM Validation Start ===");
            elizaLogger.log("Full message:", JSON.stringify(message, null, 2));
            elizaLogger.log("Message source:", message.source);
            elizaLogger.log("Message type:", message.content.type);
            elizaLogger.log("Is DM:", message.content.isDM);

            // بررسی دقیق‌تر نوع پیام
            if (
                message.source === "twitter_dm" ||
                message.content.isDM ||
                message.content.type === "dm"
            ) {
                elizaLogger.log("✅ پیام به عنوان DM توییتر تایید شد");
                return true;
            }

            elizaLogger.log("❌ پیام DM توییتر نیست");
            return false;
        } catch (error) {
            elizaLogger.error("خطا در اعتبارسنجی:", error);
            elizaLogger.error("جزئیات خطا:", JSON.stringify(error, null, 2));
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            elizaLogger.log("=== شروع پردازش DM توییتر ===");
            const runtimeWithTwitter = runtime as RuntimeWithTwitter;

            if (!runtimeWithTwitter.twitterClient) {
                elizaLogger.error("❌ کلاینت توییتر در دسترس نیست");
                return false;
            }

            elizaLogger.log("✅ پردازش پیام DM:", message.content.text);

            // ارسال پاسخ به کاربر
            await runtimeWithTwitter.twitterClient.sendDirectMessage(
                message.userId,
                "✅ پیام شما دریافت شد! در حال پردازش درخواست شما هستم..."
            );

            elizaLogger.log("✅ پاسخ DM با موفقیت ارسال شد");
            return true;
        } catch (error) {
            elizaLogger.error("خطا در پردازش DM:", error);
            elizaLogger.error("جزئیات خطا:", JSON.stringify(error, null, 2));
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
