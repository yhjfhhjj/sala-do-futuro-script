javascript:(function() {
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        TARGET_SITE: 'saladofuturo.educacao.sp.gov.br',
        GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
        GEMINI_MODELS: ['gemini-2.0-flash:generateContent', 'gemini-pro:generateContent'],
        API_KEY: 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY',
        UI_SCRIPT_URL: 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743460592/ui.js', // Atualize com o link do UI.js
        TIMEOUT: 15000,
        MAX_RETRIES: 2,
        TEMPERATURE: 0.5,
        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 HCK-Gemini/1.0' // User-Agent mascarado
    };

    // ===== PROXIES (CORS PÚBLICAS) FUNCIONAIS =====
    const CORS_PROXIES = [
        '', // Sem proxy (tentativa direta)
        'https://cors-anywhere.herokuapp.com/', // Amplamente usada, mas requer ativação manual às vezes
        'https://api.codetabs.com/v1/proxy/?quest=', // Confiável e rápida
        'https://thingproxy.freeboard.io/fetch/', // Simples e funcional
        'https://yacdn.org/proxy/', // Leve e estável
        'https://cors.bridged.cc/', // Moderna e eficiente
        'https://proxy.cors.sh/', // Suporte ativo, boa para APIs
        'https://corsproxy.io/?', // Nova e robusta
        'https://allorigins.win/api/v1/fetch?url=', // Boa para contornar CORS
        'https://jsonp.afeld.me/?url=', // Alternativa com JSONP
        'https://crossorigin.me/', // Clássica, mas pode ser instável
        'https://www.whateverorigin.org/get?url=', // Simples, mas menos confiável
        'https://api.allorigins.win/raw?url=' // Versão raw da AllOrigins
    ];

    // ===== FILTROS DE IMAGEM =====
    const IMAGE_FILTERS = {
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /conteudo_logo\.png$/i,
            /\/icons?\//i,
            /\/logos?\//i,
            /\/buttons?\//i,
            /\/assets\//i,
            /\/banners?\//i,
            /_thumb(?:nail)?\./i
        ],
        allowed: [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            /\/atividade\/\d+\?eExame=true/i,
            /\.(jpg|png|jpeg|gif|webp)$/i,
            /lh[0-9]-[a-z]+\.googleusercontent\.com/i,
            /\/media\//i,
            /\/questao_\d+/i
        ],
        verify(src) {
            if (!src || !src.startsWith('http')) return false;
            return !this.blocked.some(r => r.test(src)) && 
                   this.allowed.some(r => r.test(src));
        }
    };

    // ===== ESTADO GLOBAL =====
    const STATE = {
        isAnalyzing: false,
        images: [],
        lastError: null,
        currentProxyIndex: 0
    };

    // ===== UTILITÁRIOS =====
    const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

    async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await withTimeout(fetch(url, options), CONFIG.TIMEOUT);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) {
                STATE.lastError = error;
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // ===== FUNÇÕES PRINCIPAIS =====
    function extractImages() {
        STATE.images = [...document.querySelectorAll('img, [data-image]')]
            .map(el => el.src || el.getAttribute('data-image'))
            .filter(src => IMAGE_FILTERS.verify(src))
            .slice(0, 10);
        return STATE.images;
    }

    function buildPrompt(question) {
        return {
            contents: [{
                parts: [{
                    text: `Responda diretamente com a alternativa completa (exemplo: "B) 120"), sem explicações adicionais ou texto desnecessário. Questão: ${question}${STATE.images.length ? `\nImagens associadas: ${STATE.images.slice(0, 2).join(' | ')}` : ''}`
                }]
            }],
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                maxOutputTokens: 100
            }
        };
    }

    async function queryGemini(prompt) {
        const model = CONFIG.GEMINI_MODELS[0]; // Usa gemini-2.0-flash por padrão
        let url = `${CONFIG.GEMINI_API_BASE}${model}?key=${CONFIG.API_KEY}`;

        for (let i = STATE.currentProxyIndex; i < CORS_PROXIES.length; i++) {
            try {
                const proxyUrl = CORS_PROXIES[i] ? `${CORS_PROXIES[i]}${encodeURIComponent(url)}` : url;
                const response = await fetchWithRetry(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': CONFIG.USER_AGENT, // User-Agent mascarado
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(prompt)
                });

                const data = await response.json();
                const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
                const match = answer.match(/[A-Ea-e]\)\s*.+/) || 
                             answer.match(/Alternativa\s*([A-Ea-e])/i);
                STATE.currentProxyIndex = i; // Salva o proxy que funcionou
                return match ? match[0] : answer.substring(0, 100);
            } catch (error) {
                console.error(`Erro com proxy ${CORS_PROXIES[i]}:`, error);
                if (i === CORS_PROXIES.length - 1) {
                    return `Erro: ${error.message}${error.message.includes('CORS') ? ' (CORS bloqueado)' : ''}`;
                }
            }
        }
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        if (!window.location.hostname.includes(CONFIG.TARGET_SITE)) {
            alert('Este bookmarklet funciona apenas em ' + CONFIG.TARGET_SITE);
            return;
        }

        const script = document.createElement('script');
        script.src = CONFIG.UI_SCRIPT_URL;
        script.onerror = () => alert('Erro ao carregar UI');
        script.onload = () => {
            const { input, analyzeOption, clearOption, updateImagesOption, responsePanel } = window.createUI();

            analyzeOption.onclick = async () => {
                if (STATE.isAnalyzing || !input.value.trim()) {
                    window.showResponse(responsePanel, 'Digite uma questão válida!');
                    return;
                }

                STATE.isAnalyzing = true;
                analyzeOption.disabled = true;
                analyzeOption.textContent = 'Analisando...';

                try {
                    const prompt = buildPrompt(input.value.trim());
                    const answer = await queryGemini(prompt);
                    window.showResponse(responsePanel, answer);
                } finally {
                    STATE.isAnalyzing = false;
                    analyzeOption.disabled = false;
                    analyzeOption.textContent = '🔍 Analisar';
                }
            };

            clearOption.onclick = () => {
                input.value = '';
                responsePanel.style.display = 'none';
            };

            updateImagesOption.onclick = () => {
                extractImages();
                window.updateImageButtons(STATE.images);
                window.showResponse(responsePanel, `${STATE.images.length} imagens atualizadas`);
            };

            extractImages();
            window.updateImageButtons(STATE.images);
        };
        document.head.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
