import { IAgentRuntime, Memory as BaseMemory, Provider } from "@elizaos/core";

export interface Content {
    text: string;
    tweetId?: string;
    media?: Array<{
        url: string;
        type: string;
    }>;
    inReplyTo?: string;
    type?: string;
    isDM?: boolean;
    senderId?: string;
}

// استفاده از Partial برای فیلدهای اختیاری
export type Memory = BaseMemory & {
    source?: string;
    displayName?: string;
    id?: `${string}-${string}-${string}-${string}-${string}`;
    content: Content;
    roomId?: string;
    userId?: string;
    agentId?: string;
    conversationId: string;
    senderScreenName?: string;
};

export interface FootSubmission {
    userId: string;
    displayName: string;
    tweetId: string;
    imageUrl: string;
    timestamp: number;
    requestId: string;
}

export interface ChallengePost {
    tweetId: string;
    timestamp: number;
}

export interface TwitterClient {
    tweet: (text: string) => Promise<{ id: string }>;
    reply: (text: string, replyToId: string) => Promise<void>;
    sendDirectMessage: (conversationId: string, text: string) => Promise<void>;
}

export interface ExtendedMemory extends Memory {
    displayName?: string;
}

export interface RuntimeWithTwitter extends IAgentRuntime {
    twitterClient?: TwitterClient;
}

export interface FetishRequest {
    id: string;
    postId?: string;
    winnerSelected?: boolean;
    userId: string;
    userScreenName: string;
    request: string;
    bountyAmount: number;
    timestamp: number;
    isValid: boolean;
    conversationId: string;
    transactionId: string;
}

export interface ExtendedProvider extends Provider {
    type: string;
}
