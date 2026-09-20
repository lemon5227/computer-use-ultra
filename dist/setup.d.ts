export type PlannerMode = 'auto' | 'jev' | 'laya';
export type SetupPaths = {
    homeDir?: string;
    configDir?: string;
    packageRoot?: string;
};
export type CommandRunner = (command: string, args: string[], options?: {
    timeout?: number;
}) => Promise<unknown>;
export declare function resolvePlanner(requested: PlannerMode, credentialConfigured: boolean, _layaAvailable: boolean): PlannerMode;
export declare function readPlannerConfig(options?: SetupPaths): Promise<PlannerMode | undefined>;
export declare function writePlannerConfig(mode: PlannerMode, options?: SetupPaths): Promise<void>;
export declare function installPackagedSkills(options?: SetupPaths): Promise<{
    installed: string[];
}>;
export declare function writeGatewayCredential(value: string, options?: SetupPaths & {
    force?: boolean;
}): Promise<{
    path: string;
    written: boolean;
}>;
export declare function detectLaya(options?: {
    python?: string;
}): Promise<{
    python: string;
    available: boolean;
    reason?: string;
}>;
export declare function installLaya(options?: {
    python?: string;
    run?: CommandRunner;
}): Promise<void>;
//# sourceMappingURL=setup.d.ts.map