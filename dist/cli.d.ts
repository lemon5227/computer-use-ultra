#!/usr/bin/env node
import { type PlannerMode } from './setup.js';
export type DoctorReportInput = {
    packageName: string;
    version: string;
    nodeVersion: string;
    credentialConfigured: boolean;
    credentialValue?: string;
    planner?: PlannerMode;
    plannerConfig?: PlannerMode;
    skillInstalled?: boolean;
    layaAvailable?: boolean;
};
export type SetupReportInput = {
    planner: PlannerMode;
    credential: 'configured' | 'missing' | 'not-selected';
    skills: string[];
    laya: 'available' | 'missing' | 'not-selected';
    credentialValue?: string;
    warning?: string;
};
export type CliArgs = {
    command: 'setup' | 'doctor' | 'help';
    planner: PlannerMode;
    apiKey?: string;
    noPrompt: boolean;
    forceCredential: boolean;
};
export declare function formatDoctorReport(input: DoctorReportInput): string;
export declare function formatSetupReport(input: SetupReportInput): string;
export declare function promptForJevKey(ask: (message: string) => Promise<string>): Promise<string | undefined>;
export declare function parseCliArgs(argv: string[]): CliArgs;
//# sourceMappingURL=cli.d.ts.map