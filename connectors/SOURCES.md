# Connector sources

Official documentation checked on 2026-09-14 for each connector's base URL, authentication and model listing / test endpoints.
Brand colors (`color`) were **not** checked against official brand guidelines; they are approximate.

## AI

### openai
- https://developers.openai.com/api/docs/models (current models)
- https://developers.openai.com/api/reference/resources/models/methods/list (`GET https://api.openai.com/v1/models`, Bearer)

### anthropic
- https://platform.claude.com/docs/en/about-claude/models/overview (model IDs)
- https://platform.claude.com/docs/en/api/models/list (`GET /v1/models`, `x-api-key`, `anthropic-version: 2023-06-01`)

### gemini
- https://ai.google.dev/gemini-api/docs/models (model IDs)
- https://ai.google.dev/api/models (`GET /v1beta/models`, `x-goog-api-key`)

### azure-openai
- https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle (v1 API: `https://{resource}.openai.azure.com/openai/v1/`, `api-key` header)
- https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/models (`GET {endpoint}/openai/v1/models`)

### deepseek
- https://api-docs.deepseek.com/ (base `https://api.deepseek.com`, Bearer, models)
- https://api-docs.deepseek.com/api/list-models (`GET /models`)

### groq
- https://console.groq.com/docs/models (base `https://api.groq.com/openai/v1`, `/models`, model IDs)

### mistral
- https://docs.mistral.ai/api/ (base `https://api.mistral.ai/v1`, Bearer)
- https://docs.mistral.ai/api/endpoint/models (`GET /v1/models`)
- https://docs.mistral.ai/getting-started/models/ and https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04 (model IDs)

### xai
- https://docs.x.ai/docs/models (model IDs)
- https://docs.x.ai/docs/api-reference (base `https://api.x.ai/v1`, Bearer)
- https://docs.x.ai/developers/rest-api-reference/inference/models (`GET /v1/models`)

### openrouter
- https://openrouter.ai/docs/quickstart (base `https://openrouter.ai/api/v1`, Bearer, `GET /api/v1/models`)
- https://openrouter.ai/api/v1/models (live model IDs)

### together
- https://docs.together.ai/docs/openai-api-compatibility (base `https://api.together.ai/v1`, Bearer, `GET /v1/models`)
- https://docs.together.ai/docs/serverless-models (model IDs)

### fireworks
- https://docs.fireworks.ai/tools-sdks/openai-compatibility (base `https://api.fireworks.ai/inference/v1`, Bearer)
- https://docs.fireworks.ai/guides/querying-text-models (example model ID)
- https://docs.fireworks.ai/api-reference/list-models (account API only, `/v1/accounts/{id}/models`; the inference `/models` endpoint is not documented, so `listable: false`)

### perplexity
- https://docs.perplexity.ai/docs/router/quickstart (Router: base `https://api.perplexity.ai/router/v1`, Bearer, `/chat/completions`, `/models`, model IDs)
- https://docs.perplexity.ai/getting-started/models and https://docs.perplexity.ai/docs/resources/changelog (Sonar Chat Completions becomes the Agent API; Sonar is supported until 2026-09-27)
- https://docs.perplexity.ai/api-reference/models-get (`GET /v1/models` for the Agent API)

### cerebras
- https://inference-docs.cerebras.ai/models/overview (base `https://api.cerebras.ai/v1`, model IDs)
- https://inference-docs.cerebras.ai/api-reference/models (`GET /v1/models`)

### moonshot
- https://platform.kimi.ai/docs/api/chat (base `https://api.moonshot.ai/v1`, Bearer, model IDs)
- https://platform.kimi.ai/docs/api/list-models (`GET /v1/models`)

### qwen
- https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope (compatible-mode, Bearer)
- https://www.alibabacloud.com/help/en/model-studio/base-url (Singapore: legacy `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` is still available; `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` is recommended)
- https://www.alibabacloud.com/help/en/model-studio/models (model IDs)

### zhipu
- https://docs.z.ai/guides/overview/quick-start and https://docs.z.ai/api-reference/introduction (base `https://api.z.ai/api/paas/v4`, Bearer, model IDs; no models endpoint documented)

### cohere
- https://docs.cohere.com/docs/compatibility-api (base `https://api.cohere.ai/compatibility/v1`; chat, embeddings and transcriptions only)
- https://docs.cohere.com/docs/models (model IDs)

### nvidia
- https://docs.api.nvidia.com/nim/reference/llm-apis (base `https://integrate.api.nvidia.com`, `POST /v1/chat/completions`, model IDs)
- https://docs.api.nvidia.com/nim/reference/models-1 (models section)

### huggingface
- https://huggingface.co/docs/inference-providers/index (base `https://router.huggingface.co/v1`, Bearer HF token, `GET /v1/models`, model IDs)

### ollama
- https://docs.ollama.com/api/openai-compatibility (`http://localhost:11434/v1/`, `/v1/models`, the key is ignored)

### lmstudio
- https://lmstudio.ai/docs/app/api/endpoints/openai (`http://localhost:1234/v1`, `/v1/models`)

### custom-openai
- Generic; no provider docs.

### github-models (not created)
- https://docs.github.com/en/rest/models/inference
- https://github.blog/changelog/2026-07-30-github-models-is-now-retired/ (GitHub Models was fully retired on 2026-07-30)

## API

### custom-rest
- Generic; no provider docs.

### github
- https://docs.github.com/en/rest/about-the-rest-api/api-versions (`X-GitHub-Api-Version: 2026-03-10` is the latest)
- https://docs.github.com/en/rest/users/users#get-the-authenticated-user (`GET /user`, standard headers)
- https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user (`GET /user/repos`)
- https://docs.github.com/en/rest/activity/notifications#list-notifications-for-the-authenticated-user (`GET /notifications`)

### notion
- https://developers.notion.com/reference/versioning (`Notion-Version: 2026-03-11` is the latest)
- https://developers.notion.com/reference/get-self (`GET /v1/users/me`)
- https://developers.notion.com/reference/get-users (`GET /v1/users`)
- https://developers.notion.com/reference/post-search (`POST /v1/search`)

### stripe
- https://docs.stripe.com/api/authentication (bearer auth accepted)
- https://docs.stripe.com/api/balance/balance_retrieve (`GET /v1/balance`)
- https://docs.stripe.com/api/customers/list (`GET /v1/customers`)
- https://docs.stripe.com/api/charges/list (`GET /v1/charges`)
