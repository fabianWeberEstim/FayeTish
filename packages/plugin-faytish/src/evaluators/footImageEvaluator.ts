import {
    Evaluator,
    IAgentRuntime,
    Memory,
    ModelClass,
    generateObjectArray,
    State,
    elizaLogger,
    composeContext
} from "@elizaos/core";
import { FootSubmission } from "../types";

const footAnalysisTemplate = `
TASK: Analyze foot image for authenticity and compliance.

Image URL: {{imageUrl}}

Please analyze the image and extract information in these categories:

1. Image Authentication
- Is it a real foot photo
- Is it a human foot
- Image quality check
- Inappropriate content check
- Duplicate detection

2. Foot Health Analysis
- General foot condition
- Hygiene level
- Visible health concerns

3. Biometric Verification
- Foot structure verification
- Natural foot characteristics
- Anatomical consistency

Format the response as an array with a single object:
[{
    "authentication": {
        "isRealFootPhoto": boolean,
        "isHumanFoot": boolean,
        "imageQuality": "high" | "medium" | "low",
        "isAppropriate": boolean,
        "isDuplicate": boolean,
        "confidence": {
            "realPhoto": number,
            "humanFoot": number,
            "quality": number,
            "appropriate": number,
            "uniqueness": number
        }
    },
    "healthAnalysis": {
        "condition": string,
        "hygieneLevel": "good" | "acceptable" | "poor",
        "healthConcerns": string[] | null,
        "confidence": {
            "condition": number,
            "hygiene": number,
            "concerns": number
        }
    },
    "biometricVerification": {
        "structureValid": boolean,
        "naturalCharacteristics": boolean,
        "anatomicallyConsistent": boolean,
        "confidence": {
            "structure": number,
            "characteristics": number,
            "consistency": number
        }
    }
}]

For each field:
1. Include a confidence score (0.0-1.0)
2. Only include health concerns if clearly visible
3. Return an empty array if image cannot be properly analyzed
`;

interface FootAnalysis {
    authentication: {
        isRealFootPhoto: boolean;
        isHumanFoot: boolean;
        imageQuality: string;
        isAppropriate: boolean;
        isDuplicate: boolean;
        confidence: Record<string, number>;
    };
    healthAnalysis: {
        condition: string;
        hygieneLevel: string;
        healthConcerns: string[] | null;
        confidence: Record<string, number>;
    };
    biometricVerification: {
        structureValid: boolean;
        naturalCharacteristics: boolean;
        anatomicallyConsistent: boolean;
        confidence: Record<string, number>;
    };
}

export const footImageEvaluator: Evaluator = {
    name: "footImageEvaluator",
    similes: ["VALIDATE_FOOT_IMAGE", "CHECK_FOOT_PHOTO"],
    description: "Evaluates foot images for authenticity and compliance",

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            const media = message.content.media as string[];
            if (!media?.length) {
                elizaLogger.debug("No media found in message");
                return false;
            }

            // Check submission cooldown
            const lastSubmission = await runtime.cacheManager.get(
                `foot_submissions:${message.userId}:last_submission`
            );

            if (lastSubmission) {
                const hoursSinceLastSubmission = (Date.now() - lastSubmission.timestamp) / (1000 * 60 * 60);
                if (hoursSinceLastSubmission < 24) {
                    elizaLogger.debug(`User ${message.userId} attempted submission before 24h cooldown`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error in footImageEvaluator validate:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            const submission: FootSubmission = {
                userId: message.userId,
                displayName: message.displayName || message.userId,
                tweetId: message.id,
                imageUrl: message.content.media[0],
                timestamp: Date.now()
            };

            // Get current submissions
            const submissions = await runtime.cacheManager.get<FootSubmission[]>('active_foot_submissions') || [];

            // Add new submission
            submissions.push(submission);

            // Store updated list
            await runtime.cacheManager.set('active_foot_submissions', submissions);

            return true;
        } catch (error) {
            elizaLogger.error("Error in footImageEvaluator handler:", error);
            return false;
        }
    },

    examples: [
        {
            context: "User submits a foot photo",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Here's my foot photo for the challenge",
                        media: ["image_url"]
                    }
                }
            ],
            outcome: "Photo validated successfully with biometric analysis"
        }
    ]
};

function isValidAnalysis(analysis: FootAnalysis): boolean {
    // Check authentication
    if (!analysis.authentication ||
        typeof analysis.authentication.isRealFootPhoto !== 'boolean' ||
        typeof analysis.authentication.isHumanFoot !== 'boolean' ||
        typeof analysis.authentication.isAppropriate !== 'boolean') {
        return false;
    }

    // Check confidence scores
    const minConfidence = 0.7;
    return (
        analysis.authentication.confidence.realPhoto >= minConfidence &&
        analysis.authentication.confidence.humanFoot >= minConfidence &&
        analysis.biometricVerification.confidence.structure >= minConfidence
    );
}