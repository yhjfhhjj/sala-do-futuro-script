(function() {
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743448950/ui.js';
    const API_ENDPOINTS = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];
    const CORS_PROXIES = [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://api.allorigins.win/raw?url=',
        'https://gobetween.oklabs.org/',
        'https://corsproxy.io/?'
    ];
    const IMAGE_FILTERS = {
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /conteudo_logo\.png$/i,
            /\/icons?\//i,
            /\/logos?\//i,
            /\/buttons?\//i,
            /\/assets\//i
        ],
        allowed: [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            /\/atividade\/\d+\?eExame=true/i,
            /\.(jpg|png|jpeg|gif|webp)$/i,
            /lh7-rt\.googleusercontent\.com/i
        ]
    };
    const STATE = { isAnalyzing: false, currentEndpoint: 0, currentProxy: 0, retryCount: 0, maxRetries: 2, images: [] };

    function log(message) {
        const logPanel = document.getElementById('hck-log-panel');
        if (logPanel) window.showLog(logPanel, message);
        else console.log(`[HCK V4 Log] ${message}`);
    }

    async function tryRequest(url, options) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async function tryDirectRequest(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        log(`Tentando requisição direta para ${endpoint}`);
        return tryRequest(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2, temperature: 0.1 } }),
            mode: 'cors',
            credentials: 'omit'
        });
    }

    async function tryWithProxy(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        const proxy = CORS_PROXIES[STATE.currentProxy];
        log(`Tentando proxy ${proxy} para ${endpoint}`);
        return tryRequest(`${proxy}${encodeURIComponent(endpoint)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2, temperature: 0.1 } })
        });
    }

    async function sendRequest(prompt) {
        const methods = [tryDirectRequest, tryWithProxy];
        for (const method of methods) {
            try {
                return await method(prompt);
            } catch (error) {
                log(`Falha: ${error.message}`);
                if (STATE.retryCount < STATE.maxRetries) {
                    STATE.retryCount++;
                    STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                    STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                    log(`Tentando novamente (${STATE.retryCount}/${STATE.maxRetries})`);
                    return await sendRequest(prompt);
                }
            }
        }
        throw new Error('Todos os métodos falharam');
    }

    function extractImages() {
        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.startsWith('http') && 
                !IMAGE_FILTERS.blocked.some(p => p.test(src)) && 
                IMAGE_FILTERS.allowed.some(p => p.test(src)))
            .slice(0, 50);
        STATE.images = images;
        return images;
    }

    function buildPrompt(question, images = []) {
        return `Analise esta questão e responda apenas com a alternativa correta (A, B, C, D ou E), sem explicações:\n\n${question}` + 
               (images.length > 0 ? `\n\nImagens relacionadas (URLs):\n${images.slice(0, 3).join('\n')}` : '');
    }

    async function analyzeQuestion(input, analyzeOption, responsePanel) {
        if (STATE.isAnalyzing) return;
        const question = input.value.trim();
        if (!question) {
            window.showResponse(responsePanel, '', 'Por favor, cole a questão');
            return;
        }

        STATE.isAnalyzing = true;
        analyzeOption.disabled = true;
        analyzeOption.innerHTML = '<span style="margin-right: 6px;">⏳</span>Analisando...';
        analyzeOption.style.opacity = '0.7';

        try {
            const prompt = buildPrompt(question, STATE.images);
            log(`Enviando prompt: ${prompt.substring(0, 100)}...`);
            const response = await sendRequest(prompt);
            const answer = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            const match = answer?.match(/^[A-E]/i);
            window.showResponse(responsePanel, answer, match ? match[0].toUpperCase() : 'Resposta não encontrada');
        } catch (error) {
            window.showResponse(responsePanel, '', `Erro: ${error.message}`);
        } finally {
            STATE.isAnalyzing = false;
            analyzeOption.disabled = false;
            analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
            analyzeOption.style.opacity = '1';
        }
    }

    function initialize() {
        if (window.location.hostname !== TARGET_SITE) return;

        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        script.onload = () => {
            const { input, analyzeOption, clearOption, updateImagesOption, imageOptions, copyUrlOptions, responsePanel } = window.createUI();

            // Conectar os botões às funções
            analyzeOption.onclick = () => analyzeQuestion(input, analyzeOption, responsePanel);
            clearOption.onclick = () => {
                input.value = '';
                responsePanel.style.display = 'none';
            };
            updateImagesOption.onclick = () => {
                extractImages();
                window.updateImageButtons(STATE.images); // Atualizar botões de imagem dinamicamente
                window.showResponse(responsePanel, '', STATE.images.length > 0 ? `${STATE.images.length} imagens encontradas` : 'Nenhuma imagem encontrada');
            };
            imageOptions.forEach((btn, index) => {
                btn.onclick = () => {
                    if (STATE.images[index]) {
                        const imgWindow = window.open('', '_blank');
                        imgWindow.document.write(`
                            <html>
                                <body style="margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #000;">
                                    <img src="${STATE.images[index]}" style="max-width: 90%; max-height: 90%;" />
                                </body>
                            </html>
                        `);
                        imgWindow.document.close();
                    } else {
                        window.showResponse(responsePanel, '', 'Imagem não disponível');
                    }
                };
            });
            copyUrlOptions.forEach((btn, index) => {
                btn.onclick = () => {
                    if (STATE.images[index]) {
                        navigator.clipboard.writeText(STATE.images[index]).then(() => {
                            const currentText = input.value.trim();
                            input.value = currentText ? `${currentText}\n${STATE.images[index]}` : STATE.images[index];
                            window.showResponse(responsePanel, '', `URL da Imagem ${index + 1} copiada e adicionada à pergunta`);
                        }).catch(() => {
                            window.showResponse(responsePanel, '', 'Erro ao copiar URL');
                        });
                    } else {
                        window.showResponse(responsePanel, '', 'Imagem não disponível');
                    }
                };
            });

            // Inicializar imagens ao carregar
            extractImages();
            window.updateImageButtons(STATE.images);
            log('HCK V4 inicializado');
        };
        script.onerror = () => console.error('Falha ao carregar o script da UI');
        document.head.appendChild(script);
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();
