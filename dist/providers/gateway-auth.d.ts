export type GatewayCredential = {
    value: string;
    variable: 'AI_GATEWAY_API_KEY' | 'VERCEL_OIDC_TOKEN';
};
export declare function parseGatewayCredentialFile(content: string): GatewayCredential | undefined;
export declare function loadGatewayCredential(cwd?: string): Promise<GatewayCredential | undefined>;
//# sourceMappingURL=gateway-auth.d.ts.map