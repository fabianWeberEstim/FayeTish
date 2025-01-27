import {
    Evaluator,
    IAgentRuntime,
    Memory,
    ModelClass,
    generateObjectArray,
    elizaLogger,
    composeContext,
} from "@elizaos/core";
import { FootSubmission, FetishRequest, ExtendedMemory } from "../types";

const imageAnalysisTemplate = `
TASK: Analyze submission image for fetish request compliance.

Request Details:
{{request}}

Image URL: {{imageUrl}}

Please analyze the image and verify:

1. Content Validation
- Does the image match the fetish request?
- Is it a valid submission type?
- Is it appropriate content?
- Image quality check
- Duplicate detection

2. Request Compliance
- Meets specific request requirements
- Follows submission guidelines
- Contains required elements

3. Technical Verification
- Image authenticity
- Manipulation check
- Quality standards

Format response as an array with a single object:
[{
    "contentValidation": {
        "matchesRequest": boolean,
        "isValidType": boolean,
        "isAppropriate": boolean,
        "imageQuality": "high" | "medium" | "low",
        "isDuplicate": boolean,
        "confidence": {
            "requestMatch": number,
            "validType": number,
            "appropriate": number,
            "quality": number,
            "uniqueness": number
        }
    },
    "requestCompliance": {
        "meetsRequirements": boolean,
        "followsGuidelines": boolean,
        "hasRequiredElements": boolean,
        "confidence": {
            "requirements": number,
            "guidelines": number,
            "elements": number
        }
    },
    "technicalVerification": {
        "isAuthentic": boolean,
        "isUnmanipulated": boolean,
        "meetsQualityStandards": boolean,
        "confidence": {
            "authenticity": number,
            "manipulation": number,
            "quality": number
        }
    }
}]
`;

interface ImageAnalysis {
    contentValidation: {
        matchesRequest: boolean;
        isValidType: boolean;
        isAppropriate: boolean;
        imageQuality: string;
        isDuplicate: boolean;
        confidence: Record<string, number>;
    };
    requestCompliance: {
        meetsRequirements: boolean;
        followsGuidelines: boolean;
        hasRequiredElements: boolean;
        confidence: Record<string, number>;
    };
    technicalVerification: {
        isAuthentic: boolean;
        isUnmanipulated: boolean;
        meetsQualityStandards: boolean;
        confidence: Record<string, number>;
    };
}

function isValidSubmission(analysis: ImageAnalysis): boolean {
    // چک کردن اعتبار محتوا
    if (
        !analysis.contentValidation.matchesRequest ||
        !analysis.contentValidation.isValidType ||
        !analysis.contentValidation.isAppropriate
    ) {
        return false;
    }

    // چک کردن تطابق با درخواست
    if (
        !analysis.requestCompliance.meetsRequirements ||
        !analysis.requestCompliance.hasRequiredElements
    ) {
        return false;
    }

    // چک کردن اعتبار فنی
    if (
        !analysis.technicalVerification.isAuthentic ||
        !analysis.technicalVerification.meetsQualityStandards
    ) {
        return false;
    }

    // چک کردن سطح اطمینان
    const minConfidence = 0.7;
    return (
        analysis.contentValidation.confidence.requestMatch >= minConfidence &&
        analysis.requestCompliance.confidence.requirements >= minConfidence &&
        analysis.technicalVerification.confidence.authenticity >= minConfidence
    );
}

export const fetishPicEvaluator: Evaluator = {
    name: "fetishPicEvaluator",
    description: "Evaluates submission pictures for fetish requests",
    similes: ["CHECK_SUBMISSION", "VALIDATE_SUBMISSION"],

    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            // چک کردن وجود تصویر در پیام
            if (!message.content.media?.length) {
                return false;
            }

            // چک کردن اینکه پیام در پاسخ به یک درخواست معتبر است
            if (!message.content.inReplyTo) {
                return false;
            }

            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            const request = requests.find(
                (req) => req.postId === message.content.inReplyTo
            );

            if (!request || request.winnerSelected) {
                return false;
            }

            // چک کردن اینکه کاربر قبلاً برای این درخواست شرکت نکرده باشد
            const submissions =
                (await runtime.cacheManager.get<
                    Record<string, FootSubmission[]>
                >("submissions_by_request")) || {};
            const requestSubmissions = submissions[request.id] || [];

            return !requestSubmissions.some(
                (sub) => sub.userId === message.userId
            );
        } catch (error) {
            elizaLogger.error("Error in fetishPicEvaluator validate:", error);
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            const extendedMessage = message as ExtendedMemory;
            const requests =
                (await runtime.cacheManager.get<FetishRequest[]>(
                    "valid_fetish_requests"
                )) || [];
            const request = requests.find(
                (req) => req.postId === message.content.inReplyTo
            );

            if (!request) return false;

            // آنالیز تصویر و تطابق با درخواست
            const context = composeContext({
                template: imageAnalysisTemplate,
                params: {
                    request: request.request,
                    imageUrl: message.content.media[0],
                },
            });

            const analysisResult = await generateObjectArray<ImageAnalysis>({
                context,
                modelClass: ModelClass.LARGE,
                runtime,
            });

            if (
                !analysisResult.length ||
                !isValidSubmission(analysisResult[0])
            ) {
                elizaLogger.log("Submission failed validation checks");
                return false;
            }

            const submission: FootSubmission = {
                userId: message.userId,
                displayName: extendedMessage.displayName || message.userId,
                tweetId: message.id,
                imageUrl: message.content.media[0],
                timestamp: Date.now(),
                requestId: request.id,
            };

            // ذخیره شرکت‌کننده جدید
            const submissions =
                (await runtime.cacheManager.get<
                    Record<string, FootSubmission[]>
                >("submissions_by_request")) || {};
            if (!submissions[request.id]) {
                submissions[request.id] = [];
            }
            submissions[request.id].push(submission);

            await runtime.cacheManager.set(
                "submissions_by_request",
                submissions
            );

            return true;
        } catch (error) {
            elizaLogger.error("Error in fetishPicEvaluator handler:", error);
            return false;
        }
    },
};
