## Gemini Flash API

### Requirements
- Node.js 20 or later
- A valid `GEMINI_API_KEY` from Google AI Studio (save it in a `.env` file or export it in your shell)

### Install dependencies
```bash
npm install
```

### Run the API server
```bash
GEMINI_API_KEY=your-key node index.js
```
The server listens on `http://localhost:3000` by default. Override the port with the `PORT` environment variable if needed.

### Use the OpenAPI spec locally
The OpenAPI definition lives at `api-spec.yaml`. Use the bundled Swagger UI watcher to preview and test endpoints:
```bash
npx swagger-ui-watcher api-spec.yaml
```
This serves interactive docs (default: <http://127.0.0.1:8000>) so you can hit the API via "Try it out". Start the API server beforehand. Alternatively, render the spec with Redoc:
```bash
npx @redocly/cli preview-docs api-spec.yaml
```
