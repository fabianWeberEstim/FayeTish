import { IAgentRuntime, Memory } from "@elizaos/core";

export interface FootSubmission {
    userId: string;
    displayName: string;
    tweetId: string;
    imageUrl: string;
    timestamp: number;
}

export interface ChallengePost {
    tweetId: string;
    timestamp: number;
}

export interface TwitterClient {
    tweet: (text: string) => Promise<{ id: string }>;
    reply: (text: string, replyToId: string) => Promise<void>;
}

export interface ExtendedMemory extends Memory {
    displayName?: string;
}

// تغییر ساختار ExtendedRuntime به RuntimeWithTwitter
export interface RuntimeWithTwitter extends IAgentRuntime {
    twitterClient?: TwitterClient;
}