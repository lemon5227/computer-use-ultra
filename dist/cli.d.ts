#!/usr/bin/env node
export type DoctorReportInput = {
    packageName: string;
    version: string;
    nodeVersion: string;
    credentialConfigured: boolean;
    credentialValue?: string;
};
export declare function formatDoctorReport(input: DoctorReportInput): string;
//# sourceMappingURL=cli.d.ts.map