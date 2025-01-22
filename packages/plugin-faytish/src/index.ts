import { Plugin } from "@elizaos/core";
import { postChallengeAction } from "./actions/postChallenge";
import { lotteryAction } from "./actions/lottery";
import { footImageEvaluator } from "./evaluators/footImageEvaluator";
import { userSubmissionProvider } from "./providers/userProfileStatusProvider";

export * from "./types";
export * as actions from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const faytishPlugin: Plugin = {
    name: "faytish",
    description: "Plugin for foot photo challenge and lottery system",
    actions: [
        postChallengeAction,
        lotteryAction
    ],
    evaluators: [footImageEvaluator],
    providers: [userSubmissionProvider]
};