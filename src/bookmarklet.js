(function() {
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743452745/ui.js';
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
            const startTime = performance.now();
            const response = await fetch(url, options);
            const corsStatus = response.headers.get('access-control-allow-origin') ? '✅ CORS Direto' : '🔁 Proxy CORS';
            
            if (!response.ok) throw new Error(`${corsStatus} | HTTP ${response.status}`);
            
            const data = await response.json();
            log(`${corsStatus} | ${(performance.now()-startTime).toFixed(0)}ms`);
            return data;
        } catch (error) {
            throw error;
        }
    }

    // ===== MELHORIA NO PROMPT =====
    function buildPrompt(question, images = []) {
        return `ANÁLISE ESTATÍSTICA - RESPONDA APENAS COM A ALTERNATIVA COMPLETA CORRETA NO FORMATO "X) ...".
NÃO INCLUA QUALQUER OUTRO TEXTO, EXPLICAÇÃO OU FORMATAÇÃO.

Questão: ${question}
${images.length > 0 ? `\nReferências visuais: ${images.slice(0, 2).join(' | ')}` : ''}

Responda estritamente no formato: "X) ..." onde X é a letra correta:`;
    }

    function extractCompleteAnswer(response) {
        const rawAnswer = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!rawAnswer) return null;
        
        // Procura por padrão "X) ..." onde X é A-E
        const answerMatch = rawAnswer.match(/^([A-Ea-e]\))\s*(.+)$/m);
        return answerMatch ? `${answerMatch[1]} ${answerMatch[2]}`.trim() : rawAnswer;
    }

    async function sendRequest(prompt) {
        const methods = [tryDirectRequest, tryWithProxy];
        for (const method of methods) {
            try {
                const response = await method(prompt);
                return extractCompleteAnswer(response);
            } catch (error) {
                log(`Falha: ${error.message}`);
                if (STATE.retryCount < STATE.maxRetries) {
                    STATE.retryCount++;
                    STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                    STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                    log(`Tentativa ${STATE.retryCount}/${STATE.maxRetries}`);
                    return await sendRequest(prompt);
                }
            }
        }
        throw new Error('Todos os métodos falharam');
    }

    async function tryDirectRequest(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        return tryRequest(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,  // Baixa temperatura para respostas determinísticas
                    maxOutputTokens: 10 // Suficiente para a alternativa completa
                }
            })
        });
    }

    async function tryWithProxy(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        const proxy = CORS_PROXIES[STATE.currentProxy];
        return tryRequest(`${proxy}${encodeURIComponent(endpoint)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 10
                }
            })
        });
    }

    // ===== FUNÇÕES PRINCIPAIS (MANTIDAS) =====
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

    async function analyzeQuestion(input, analyzeOption, responsePanel) {
        if (STATE.isAnalyzing) return;
        const question = input.value.trim();
        if (!question) {
            window.showResponse(responsePanel, '', 'Por favor, cole a questão');
            return;
        }

        STATE.isAnalyzing = true;
        analyzeOption.disabled = true;
        analyzeOption.innerHTML = '<span style="margin-right: 4px;">⏳</span>Analisando...';

        try {
            const prompt = buildPrompt(question, STATE.images);
            log(`Prompt: ${prompt.substring(0, 80)}...`);
            const answer = await sendRequest(prompt);
            window.showResponse(responsePanel, answer || 'Resposta não reconhecida', answer || 'Erro na análise');
        } catch (error) {
            window.showResponse(responsePanel, '', `Erro: ${error.message}`);
        } finally {
            STATE.isAnalyzing = false;
            analyzeOption.disabled = false;
            analyzeOption.innerHTML = '<span style="margin-right: 4px;">🔍</span>Analisar';
        }
    }

    // ===== INICIALIZAÇÃO (MANTIDA) =====
    function initialize() {
        if (window.location.hostname !== TARGET_SITE) return;

        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        script.onload = () => {
            const { input, analyzeOption, clearOption, updateImagesOption, responsePanel } = window.createUI();

            analyzeOption.onclick = () => analyzeQuestion(input, analyzeOption, responsePanel);
            clearOption.onclick = () => {
                input.value = '';
                responsePanel.style.display = 'none';
            };
            updateImagesOption.onclick = () => {
                const images = extractImages();
                window.updateImageButtons(images);
                window.showResponse(responsePanel, '', images.length > 0 ? `${images.length} imagens encontradas` : 'Nenhuma imagem encontrada');
            };

            extractImages();
            window.updateImageButtons(STATE.images);
            log('HCK V4 Premium inicializado');
        };
        document.head.appendChild(script);
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();
