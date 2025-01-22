import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
    elizaLogger
} from "@elizaos/core";
import { FootSubmission } from "../types";

export const userSubmissionProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<FootSubmission | null> => {
        try {
            const submission = await runtime.cacheManager.get(
                `foot_submissions/${message.userId}/last_submission`
            );

            if (!submission) {
                elizaLogger.debug(`No previous submission found for user ${message.userId}`);
                return null;
            }

            elizaLogger.debug(`Found submission for user ${message.userId}`);
            return submission as FootSubmission;
        } catch (error) {
            elizaLogger.error("Error fetching user submission:", error);
            return null;
        }
    }
};