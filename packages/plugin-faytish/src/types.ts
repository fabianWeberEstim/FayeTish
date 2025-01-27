import { IAgentRuntime, Memory as CoreMemory } from "@elizaos/core";

// گسترش Memory
export interface Memory {
    userId: string;
    roomId: string;
    content: {
        text?: string;
    };
    createdAt: number;
    source: string;
    displayName?: string;
}

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
    sendDirectMessage: (userId: string, text: string) => Promise<void>;
}

export interface ExtendedMemory extends Memory {
    displayName?: string;
}

// تغییر ساختار ExtendedRuntime به RuntimeWithTwitter
export interface RuntimeWithTwitter extends IAgentRuntime {
    twitterClient?: TwitterClient;
}

// اضافه کردن interface جدید
export interface FetishRequest {
    id: string;
    userId: string;
    request: string;
    bountyAmount: number;
    timestamp: number;
    isValid: boolean;
    postId?: string;
    transactionId: string;
    winnerSelected?: boolean;
}
