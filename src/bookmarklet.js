(function() {
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743447179/ui.js';
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
    const STATE = { isAnalyzing: false, currentEndpoint: 0, currentProxy: 0, retryCount: 0, maxRetries: 2 };

    function log(message) {
        const logPanel = document.getElementById('gemini-log-panel');
        if (logPanel) window.showLog(logPanel, message);
        else console.log(`[HCK V3 Log] ${message}`);
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
        return Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.startsWith('http') && 
                !IMAGE_FILTERS.blocked.some(p => p.test(src)) && 
                IMAGE_FILTERS.allowed.some(p => p.test(src)))
            .slice(0, 50);
    }

    function buildPrompt(question, images = []) {
        return `Analise esta questão e responda apenas com a alternativa correta (A, B, C, D ou E), sem explicações:\n\n${question}` + 
               (images.length > 0 ? `\n\nImagens relacionadas (URLs):\n${images.slice(0, 3).join('\n')}` : '');
    }

    async function analyzeQuestion() {
        if (STATE.isAnalyzing) return;
        const { input, responsePanel, analyzeOption } = window.createUI();
        const question = input.value.trim();
        if (!question) return window.showResponse(responsePanel, '', 'Por favor, cole a questão');

        STATE.isAnalyzing = true;
        analyzeOption.disabled = true;
        analyzeOption.innerHTML = '<span style="margin-right: 6px;">⏳</span>Analisando...';
        analyzeOption.style.opacity = '0.7';

        try {
            const prompt = buildPrompt(question, extractImages());
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
            const { menuBtn, analyzeOption, clearOption, input } = window.createUI();
            menuBtn.onclick = () => {
                const menu = document.getElementById('gemini-menu');
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };
            analyzeOption.onclick = analyzeQuestion;
            clearOption.onclick = () => {
                input.value = '';
                document.getElementById('gemini-response-panel')?.style.display = 'none';
            };
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('gemini-menu');
                if (menu?.style.display === 'block' && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });
            log('Bookmarklet inicializado');
        };
        script.onerror = () => console.error('Falha ao carregar o script da UI');
        document.head.appendChild(script);
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();
