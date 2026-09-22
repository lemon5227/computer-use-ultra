export type VercelCliOptions = {
    capture?: (args: string[]) => Promise<string>;
    interactive?: (args: string[]) => Promise<void>;
    onLoginRequired?: () => void;
};
export declare function extractGatewayApiKey(output: string): string | undefined;
export declare function createGatewayKeyWithVercelCli(options?: VercelCliOptions): Promise<string>;
//# sourceMappingURL=vercel-cli.d.ts.map