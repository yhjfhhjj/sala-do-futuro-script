(function() {
    // Configurações principais
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js';
    
    // Múltiplos endpoints e proxies para fallback
    const API_ENDPOINTS = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];
    
    const CORS_PROXIES = [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://thingproxy.freeboard.io/fetch/'
    ];

    // Estado global melhorado
    const STATE = {
        isAnalyzing: false,
        currentStrategy: 0,
        currentEndpoint: 0,
        currentProxy: 0,
        lastSuccessfulStrategy: null
    };

    // ======================
    // FUNÇÕES PARA CONTORNAR CORS (ATUALIZADAS)
    // ======================

    async function tryDirectRequest(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                }),
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store'
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // Salvar estratégia bem-sucedida
            STATE.lastSuccessfulStrategy = 'direct';
            return await response.json();
        } catch (error) {
            console.log('Falha na requisição direta:', error.message);
            throw error;
        }
    }

    async function tryWithProxy(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        const proxy = CORS_PROXIES[STATE.currentProxy];
        
        try {
            const response = await fetch(`${proxy}${encodeURIComponent(endpoint)}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                }),
                cache: 'no-store'
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // Salvar estratégia bem-sucedida
            STATE.lastSuccessfulStrategy = 'proxy';
            return await response.json();
        } catch (error) {
            console.log(`Falha no proxy ${proxy}:`, error.message);
            throw error;
        }
    }

    async function makeApiRequest(prompt) {
        const strategies = [
            STATE.lastSuccessfulStrategy === 'direct' ? tryDirectRequest : tryWithProxy,
            STATE.lastSuccessfulStrategy === 'proxy' ? tryWithProxy : tryDirectRequest
        ];
        
        // Resetar estado para nova tentativa
        STATE.currentStrategy = 0;
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                STATE.currentStrategy = i;
                console.log(`Tentando estratégia ${strategies[i].name}`);
                
                // Rotacionar endpoints e proxies
                STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                
                const result = await strategies[i](prompt);
                if (result) return result;
                
            } catch (error) {
                console.warn(`Falha na estratégia ${strategies[i].name}:`, error);
                
                // Pequeno delay entre tentativas
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (i === strategies.length - 1) {
                    throw new Error("Todas as estratégias falharam");
                }
            }
        }
    }

    // ======================
    // FUNÇÕES PRINCIPAIS (MANTIDAS)
    // ======================

    function extractPageContent() {
        // ... (manter a mesma implementação anterior)
    }

    async function analyzeContent(content, question) {
        // ... (manter a mesma implementação anterior)
    }

    // ======================
    // INICIALIZAÇÃO DA UI (COM MELHORIAS)
    // ======================

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            // Pré-aquecimento da conexão
            setTimeout(() => {
                fetch(`${API_ENDPOINTS[0]}?key=${GEMINI_API_KEY}`, {
                    method: 'OPTIONS',
                    mode: 'cors',
                    credentials: 'omit'
                }).catch(() => {});
            }, 1000);

            analyzeOption.addEventListener('click', async () => {
                if (STATE.isAnalyzing) return;
                STATE.isAnalyzing = true;

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                    STATE.isAnalyzing = false;
                    return;
                }

                analyzeOption.disabled = true;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">⏳</span>Analisando...';
                analyzeOption.style.opacity = '0.7';

                try {
                    const content = extractPageContent();
                    const { answer, correctAlternative } = await analyzeContent(content, question);
                    window.showResponse(responsePanel, answer, correctAlternative);
                } catch (error) {
                    console.error('Erro na análise:', error);
                    window.showResponse(responsePanel, '', 'Erro na análise. Tente novamente.');
                } finally {
                    analyzeOption.disabled = false;
                    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
                    analyzeOption.style.opacity = '1';
                    STATE.isAnalyzing = false;
                }
            });

            // ... (manter outros event listeners)
        })
        .catch(error => {
            console.error('Erro ao carregar ui.js:', error);
            // ... (manter fallback básico)
        });
})();
