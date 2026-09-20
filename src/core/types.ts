export type Operation =
  | 'CLICK'
  | 'TYPE_TEXT'
  | 'SELECT'
  | 'SCROLL_UP'
  | 'SCROLL_DOWN'
  | 'WAIT'
  | 'DONE'
  | 'BLOCKED';

export type Risk = 'none' | 'reversible' | 'sensitive' | 'irreversible';

export type ElementNode = {
  nodeId: string;
  role: string;
  name: string;
  value?: string;
  checked?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  visible: boolean;
  operations: Operation[];
  options?: Array<{ id: string; label: string; value: string; disabled?: boolean }>;
  risk: Risk;
};

export type PageSnapshot = {
  snapshotId: string;
  fingerprint: string;
  url: string;
  title: string;
  text: string;
  elements: ElementNode[];
};

export type OperationGroup = {
  operation: Operation;
  criteria: Record<string, string>;
};

export type ClassificationResult = {
  operation: Operation;
  targetId: string | null;
  probabilities: Record<string, number>;
  confidence?: number;
  shouldStop: boolean;
  shouldStopProbability: number;
};

export type RuntimeState = {
  snapshot: PageSnapshot;
  decision: ClassificationResult;
};

export function serializeRuntimeState(state: RuntimeState): string {
  return JSON.stringify(state);
}
