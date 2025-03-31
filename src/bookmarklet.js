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
        'https://thingproxy.freeboard.io/fetch/',
        'https://yacdn.org/proxy/',
        'https://cors.bridged.cc/'
    ];

    // Estado global
    const STATE = {
        isAnalyzing: false,
        currentEndpoint: 0,
        currentProxy: 0,
        retryCount: 0,
        maxRetries: 3,
        lastSuccess: null
    };

    // ======================
    // FUNÇÕES PARA CONTORNAR CORS
    // ======================

    // Estratégia 1: Tentativa direta
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
            STATE.lastSuccess = 'direct';
            return await response.json();
        } catch (error) {
            console.log('Falha na requisição direta:', error.message);
            throw error;
        }
    }

    // Estratégia 2: Usando proxy CORS
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
            STATE.lastSuccess = 'proxy';
            return await response.json();
        } catch (error) {
            console.log(`Falha no proxy ${proxy}:`, error.message);
            throw error;
        }
    }

    // Estratégia 3: Web Worker
    async function tryWithWorker(prompt) {
        return new Promise((resolve) => {
            const workerCode = `
                const API_ENDPOINTS = ${JSON.stringify(API_ENDPOINTS)};
                const CORS_PROXIES = ${JSON.stringify(CORS_PROXIES)};
                const API_KEY = '${GEMINI_API_KEY}';
                
                async function tryFetch(url, options, proxyIndex = 0) {
                    try {
                        // Tentar direto primeiro
                        const response = await fetch(url, options);
                        if (response.ok) return await response.json();
                        
                        // Se falhar, tentar com proxy
                        if (proxyIndex < CORS_PROXIES.length) {
                            const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(url);
                            const proxyResponse = await fetch(proxyUrl, options);
                            if (proxyResponse.ok) return await proxyResponse.json();
                            return tryFetch(url, options, proxyIndex + 1);
                        }
                        
                        throw new Error('All proxies failed');
                    } catch (error) {
                        if (proxyIndex < CORS_PROXIES.length) {
                            return tryFetch(url, options, proxyIndex + 1);
                        }
                        throw error;
                    }
                }
                
                self.onmessage = async function(e) {
                    try {
                        const endpoint = API_ENDPOINTS[0] + '?key=' + API_KEY;
                        const options = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: e.data }] }],
                                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                            })
                        };
                        
                        const data = await tryFetch(endpoint, options);
                        postMessage({ success: true, data });
                    } catch (error) {
                        postMessage({ success: false, error: error.message });
                    }
                };
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);
            
            worker.onmessage = function(e) {
                if (e.data.success) {
                    STATE.lastSuccess = 'worker';
                    resolve(e.data.data);
                } else {
                    resolve({ error: e.data.error });
                }
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };
            
            worker.postMessage(prompt);
        });
    }

    // Estratégia 4: JSONP (fallback)
    async function tryWithJsonp(prompt) {
        return new Promise((resolve) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                STATE.lastSuccess = 'jsonp';
                resolve(data);
            };

            script.src = `${API_ENDPOINTS[0]}?key=${GEMINI_API_KEY}&callback=${callbackName}`;
            document.body.appendChild(script);
            
            setTimeout(() => {
                resolve({ error: "Timeout no JSONP" });
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                }
            }, 5000);
        });
    }

    // Gerenciador de requisições
    async function makeApiRequest(prompt) {
        // Ordenar estratégias pela última bem-sucedida
        const strategies = [
            STATE.lastSuccess === 'direct' ? tryDirectRequest : null,
            STATE.lastSuccess === 'proxy' ? tryWithProxy : null,
            tryWithWorker,
            tryWithJsonp
        ].filter(Boolean);

        STATE.retryCount = 0;
        
        while (STATE.retryCount < STATE.maxRetries) {
            for (const strategy of strategies) {
                try {
                    STATE.retryCount++;
                    console.log(`Tentativa ${STATE.retryCount} com ${strategy.name}`);
                    
                    // Rotacionar recursos
                    STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                    STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                    
                    const result = await strategy(prompt);
                    if (result && !result.error) return result;
                    
                } catch (error) {
                    console.warn(`Falha na estratégia ${strategy.name}:`, error);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    if (STATE.retryCount >= STATE.maxRetries) {
                        throw new Error("Todas as tentativas falharam");
                    }
                }
            }
        }
        
        throw new Error("Todas as estratégias falharam após várias tentativas");
    }

    // ======================
    // FUNÇÕES PRINCIPAIS
    // ======================

    function extractPageContent() {
        const contentArea = document.querySelector('body') || document.documentElement;
        if (!contentArea) return { text: '', images: [] };

        const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
        unwantedTags.forEach(tag => {
            const elements = contentArea.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });

        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.startsWith('http'))
            .slice(0, 50);

        const text = (contentArea.textContent || '').replace(/\s+/g, ' ').substring(0, 15000);
        return { text, images };
    }

    async function analyzeContent(content, question) {
        if (!question.trim()) return { answer: '', correctAlternative: 'Por favor, cole uma pergunta com alternativas.' };

        const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
        const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

        const prompt = `ANÁLISE DE QUESTÃO - Retorne APENAS a letra da alternativa correta (A-E):\n\nPergunta:\n${cleanedQuestion}\n\nContexto:\n${content.text}\n\nImagens:\n${content.images.join(', ')}${imageUrl ? `\nImagem adicional: ${imageUrl}` : ''}\n\nResposta:`;

        try {
            const data = await makeApiRequest(prompt);
            const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erro';
            const match = fullAnswer.match(/[A-E]/i);
            return { answer: '', correctAlternative: match ? match[0].toUpperCase() : 'Erro' };
        } catch (error) {
            console.error('Erro na API:', error);
            return { answer: '', correctAlternative: 'Erro' };
        }
    }

    // ======================
    // INICIALIZAÇÃO DA UI
    // ======================

    // Função para criar fallback UI
    function createFallbackUI() {
        const container = document.createElement('div');
        container.id = 'gemini-helper-container';
        container.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            font-family: 'Poppins', sans-serif;
        `;

        const menuBtn = document.createElement('button');
        menuBtn.id = 'gemini-menu-btn';
        menuBtn.innerHTML = 'HCK';
        menuBtn.style = `
            padding: 10px 16px;
            background: linear-gradient(135deg, #FF6F61, #D946EF);
            color: #FFFFFF;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            align-self: flex-end;
        `;

        const menu = document.createElement('div');
        menu.id = 'gemini-menu';
        menu.style = `
            display: none;
            background: rgba(28, 37, 38, 0.95);
            border-radius: 20px;
            padding: 12px;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
            position: fixed;
            bottom: 70px;
            right: 20px;
            flex-direction: column;
            gap: 10px;
            width: 300px;
            max-width: 80vw;
            border: 1px solid rgba(217, 70, 239, 0.2);
        `;

        menuBtn.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        });

        container.appendChild(menuBtn);
        container.appendChild(menu);
        document.body.appendChild(container);

        return {
            menuBtn,
            menu
        };
    }

    // Carregar a UI
    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            // Pré-aquecimento de conexão
            fetch(API_ENDPOINTS[0], { method: 'OPTIONS' }).catch(() => {});

            eval(script);
            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            // Configurar eventos da UI
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

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
                    window.showResponse(responsePanel, '', 'Erro na análise. Tente novamente.');
                } finally {
                    analyzeOption.disabled = false;
                    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
                    analyzeOption.style.opacity = '1';
                    STATE.isAnalyzing = false;
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#gemini-helper-container') {
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });

            // Adicionar tecla ESC para fechar menu
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar ui.js:', error);
            createFallbackUI();
        });
})();
