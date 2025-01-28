import { Plugin } from "@elizaos/core";
import { postFetishAction } from "./actions/postFetishAction";
import { chooseFetishPicAction } from "./actions/chooseFetishPicAction";
import { fetishRequestEvaluator } from "./evaluators/fetishRequestEvalutor";
import { fetishPicEvaluator } from "./evaluators/fetishPicEvaluator";
import { userSubmissionProvider } from "./providers/userProfileStatusProvider";

export * from "./types";
export * as actions from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const fayetishPlugin: Plugin = {
    name: "fayetish",
    description: "Plugin for fetish request and submission management",
    actions: [postFetishAction, chooseFetishPicAction],
    evaluators: [fetishRequestEvaluator, fetishPicEvaluator],
    providers: [userSubmissionProvider],
};
