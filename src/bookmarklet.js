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

    // Configurações de imagem
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
            /\.(jpg|png|jpeg|gif|webp)$/i
        ]
    };

    // Estado global
    const STATE = {
        isAnalyzing: false,
        currentEndpoint: 0,
        currentProxy: 0,
        retryCount: 0,
        maxRetries: 3
    };

    // ======================
    // FUNÇÕES PARA CONTORNAR CORS
    // ======================

    async function tryDirectRequest(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                }),
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.log(`Falha no proxy ${proxy}:`, error.message);
            throw error;
        }
    }

    async function tryWithModifiedHeaders(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Accept': '*/*',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': window.location.origin,
                    'User-Agent': navigator.userAgent
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                }),
                mode: 'no-cors'
            });
            
            if (response.type === 'opaque') {
                const text = await response.text();
                try {
                    return JSON.parse(text);
                } catch {
                    throw new Error('Resposta opaca inválida');
                }
            }
            return await response.json();
        } catch (error) {
            console.log('Falha com headers modificados:', error.message);
            throw error;
        }
    }

    async function makeApiRequest(prompt) {
        const strategies = [tryDirectRequest, tryWithProxy, tryWithModifiedHeaders];
        
        // Resetar contagem de tentativas para cada nova requisição
        STATE.retryCount = 0;
        
        while (STATE.retryCount < STATE.maxRetries) {
            for (const strategy of strategies) {
                try {
                    STATE.retryCount++;
                    console.log(`Tentativa ${STATE.retryCount} com estratégia ${strategy.name}`);
                    
                    // Rotacionar endpoints e proxies
                    STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                    STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                    
                    const result = await strategy(prompt);
                    if (result) return result;
                    
                } catch (error) {
                    console.warn(`Falha na estratégia ${strategy.name}:`, error);
                    
                    // Pequeno delay entre tentativas
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
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

    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        for (const pattern of IMAGE_FILTERS.blocked) {
            if (pattern.test(url)) return false;
        }
        
        for (const pattern of IMAGE_FILTERS.allowed) {
            if (pattern.test(url)) return true;
        }
        
        return window.location.hostname === TARGET_SITE;
    }

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
            .filter(shouldIncludeImage)
            .slice(0, 50);

        const text = (contentArea.textContent || '').replace(/\s+/g, ' ').substring(0, 15000);
        return { text, images };
    }

    async function analyzeContent(content, question) {
        if (!question.trim()) return { answer: '', correctAlternative: 'Por favor, cole uma pergunta com alternativas.' };

        const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
        const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

        const prompt = `Você é um assistente especializado em questões de múltipla escolha. Analise a pergunta e o conteúdo da página e retorne APENAS a letra da alternativa correta (ex.: "A", "B", "C", "D" ou "E"). NÃO inclua explicações, texto adicional ou qualquer outro caractere. Use a imagem como contexto adicional, se fornecida.\n\nPergunta:\n${cleanedQuestion}\n\nConteúdo:\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}${imageUrl ? `\nImagem adicional: ${imageUrl}` : ''}\n\nResposta:`;

        try {
            const data = await makeApiRequest(prompt);
            const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erro';
            const match = fullAnswer.match(/[A-E]/i);
            return { answer: '', correctAlternative: match ? match[0].toUpperCase() : 'Erro' };
        } catch (error) {
            console.error('Erro na análise:', error);
            return { answer: '', correctAlternative: 'Erro' };
        }
    }

    // ======================
    // INICIALIZAÇÃO DA UI
    // ======================

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            menuBtn.addEventListener('click', () => {
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
                    
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, () => { STATE.isAnalyzing = false; });
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = 'none';
            });

            document.addEventListener('click', e => {
                const menu = document.getElementById('gemini-menu');
                if (menu && !e.target.closest('#gemini-helper-container') && !e.target.closest('#gemini-response-panel')) {
                    menu.style.display = 'none';
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar ui.js:', error);
            // Fallback básico
            const fallbackBtn = document.createElement('button');
            fallbackBtn.innerHTML = 'Ajuda HCK';
            Object.assign(fallbackBtn.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: '999999',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #FF6F61, #D946EF)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)'
            });
            
            fallbackBtn.addEventListener('click', () => {
                const question = prompt('Cole a questão com alternativas:');
                if (question) {
                    alert('Análise em andamento... Recarregue a página para tentar carregar a UI completa.');
                }
            });
            
            document.body.appendChild(fallbackBtn);
        });
})();
