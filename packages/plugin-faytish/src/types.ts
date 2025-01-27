import { IAgentRuntime, Memory as BaseMemory, Provider } from "@elizaos/core";

interface Content {
    text: string;
}

// گسترش Memory از BaseMemory
export interface Memory extends BaseMemory {
    source?: string;
    displayName?: string;
    id?: `${string}-${string}-${string}-${string}-${string}`;
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

export interface RuntimeWithTwitter extends IAgentRuntime {
    twitterClient?: TwitterClient;
}

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

export interface ExtendedProvider extends Provider {
    type: string;
}
