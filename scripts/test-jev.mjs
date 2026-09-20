import { experimental_evaluate as evaluate } from 'ai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

if (!apiKey) {
  console.error(
    'Missing AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN). Create a Vercel AI Gateway key and export it before running npm run test:jev.'
  );
  process.exitCode = 2;
}

if (apiKey) {
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    state: JSON.stringify({
      goal: 'Open the product pricing page',
      page: {
        url: 'https://example.com',
        title: 'Example',
      },
      candidates: [
        { id: 'open-pricing', kind: 'CLICK', name: 'Pricing' },
        { id: 'open-docs', kind: 'CLICK', name: 'Documentation' },
        { id: 'stop', kind: 'DONE', name: 'Finish' },
      ],
    }),
    questions: {
      nextAction: {
        type: 'choice',
        instructions: 'Choose the single safest next action that best advances the goal.',
        criteria: {
          'open-pricing': 'Click the Pricing link.',
          'open-docs': 'Click the Documentation link.',
          stop: 'Stop because the goal is already complete.',
        },
      },
      shouldStop: {
        type: 'boolean',
        instructions: 'Is the goal already complete?',
        criteria: {
          true: 'The requested pricing page is already open.',
          false: 'The requested pricing page is not open yet.',
        },
      },
    },
  });

  const nextAction = result.answers?.nextAction;
  const shouldStop = result.answers?.shouldStop;
  const routing = result.providerMetadata?.gateway?.routing;
  console.log(JSON.stringify({
    ok: true,
    model: result.response?.modelId ?? 'typesafe-ai/jev',
    nextAction: nextAction?.choice ?? null,
    nextActionProbabilities: nextAction?.probabilities ?? {},
    shouldStopProbability: shouldStop?.probability ?? null,
    usage: result.usage ?? null,
    provider: routing?.finalProvider ?? null,
    warnings: result.warnings ?? [],
  }, null, 2));
}
