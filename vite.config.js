import { defineConfig, loadEnv } from 'vite';

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', reject);
    });
}

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            {
                name: 'local-groq-api',
                configureServer(server) {
                    server.middlewares.use('/api/groq', async (req, res, next) => {
                        if (req.method !== 'POST') {
                            res.setHeader('Allow', 'POST');
                            sendJson(res, 405, { error: 'Method not allowed' });
                            return;
                        }

                        const apiKey = env.GROQ_API_KEY;

                        if (!apiKey) {
                            sendJson(res, 500, { error: 'Missing GROQ_API_KEY environment variable' });
                            return;
                        }

                        try {
                            const requestBody = await readJsonBody(req);
                            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${apiKey}`
                                },
                                body: JSON.stringify(requestBody)
                            });

                            const data = await groqResponse.json().catch(() => ({}));

                            if (!groqResponse.ok) {
                                sendJson(res, groqResponse.status, {
                                    error: data.error?.message || 'Groq API request failed'
                                });
                                return;
                            }

                            sendJson(res, 200, data);
                        } catch (error) {
                            sendJson(res, 500, {
                                error: error.message || 'Unexpected server error'
                            });
                        }
                    });
                }
            }
        ]
    };
});
