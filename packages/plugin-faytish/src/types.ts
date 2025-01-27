import { IAgentRuntime } from "@elizaos/core";

interface Content {
    text: string;
}

// تعریف CoreMemory
export interface CoreMemory {
    userId: string;
    roomId: string;
    agentId: string;
    type: string;
    content: Content;
    createdAt: number;
}

// گسترش Memory
export interface Memory extends CoreMemory {
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

// اصلاح Provider
export interface Provider {
    type: string;
    get: (runtime: IAgentRuntime, memory: Memory) => Promise<any>;
}
