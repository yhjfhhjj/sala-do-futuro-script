(function() {
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743443406/ui.js';

    const API_ENDPOINTS = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    ];

    const CORS_PROXIES = [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://api.allorigins.win/raw?url='
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
            /\.(jpg|png|jpeg|gif|webp)$/i
        ]
    };

    const STATE = {
        isAnalyzing: false,
        currentEndpoint: 0,
        currentProxy: 0,
        retryCount: 0,
        maxRetries: 2
    };

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
            console.log('Falha na requisição direta:', error);
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
            console.log(`Falha no proxy ${proxy}:`, error);
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
            console.log('Falha com headers modificados:', error);
            throw error;
        }
    }

    async function tryWithXMLHttpRequest(prompt) {
        return new Promise((resolve, reject) => {
            const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
            const xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch {
                            reject(new Error('Resposta inválida'));
                        }
                    } else {
                        reject(new Error(`HTTP ${xhr.status}`));
                    }
                }
            };
            xhr.onerror = () => reject(new Error('Erro na requisição XHR'));
            xhr.send(JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
            }));
        });
    }

    async function tryWithAllOrigins(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        const proxy = 'https://api.allorigins.win/raw?url=';
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
            console.log('Falha com AllOrigins:', error);
            throw error;
        }
    }

    async function makeApiRequest(prompt) {
        const strategies = [tryDirectRequest, tryWithProxy, tryWithModifiedHeaders, tryWithXMLHttpRequest, tryWithAllOrigins];
        for (const strategy of strategies) {
            try {
                STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                const result = await strategy(prompt);
                if (result) {
                    STATE.retryCount = 0; // Resetar contagem de retries
                    return result;
                }
            } catch (error) {
                console.warn(`Falha na estratégia ${strategy.name}:`, error);
            }
        }
        throw new Error("Todas as estratégias falharam");
    }

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
            if (STATE.retryCount < STATE.maxRetries) {
                STATE.retryCount++;
                console.log(`Tentando novamente (${STATE.retryCount}/${STATE.maxRetries})...`);
                return await analyzeContent(content, question); // Retry
            }
            return { answer: '', correctAlternative: 'Erro: Falha na análise. Instale a extensão "CORS Unblock" ou tente novamente.' };
        }
    }

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            const ui = window.createUI();
            if (!ui) {
                console.error('Falha ao criar UI');
                return;
            }

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            analyzeOption.addEventListener('click', async () => {
                if (STATE.isAnalyzing) return;
                STATE.isAnalyzing = true;
                STATE.retryCount = 0; // Resetar contagem de retries

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                    STATE.isAnalyzing = false;
                    return;
                }

                analyzeOption.disabled = true;
                analyzeOption.innerHTML = '<span style="margin-right: 6px;">⏳</span>Analisando...';
                analyzeOption.style.opacity = '0.7';

                try {
                    const content = extractPageContent();
                    const { answer, correctAlternative } = await analyzeContent(content, question);
                    window.showResponse(responsePanel, answer, correctAlternative);
                } catch (error) {
                    window.showResponse(responsePanel, '', 'Erro na análise. Tente novamente ou instale a extensão "CORS Unblock".');
                } finally {
                    analyzeOption.disabled = false;
                    analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
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
            const fallbackBtn = document.createElement('button');
            fallbackBtn.innerHTML = 'Ajuda';
            Object.assign(fallbackBtn.style, {
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                zIndex: '9999',
                padding: '8px 12px',
                background: '#0056D2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Arial, sans-serif'
            });

            fallbackBtn.addEventListener('click', () => {
                alert('Não foi possível carregar o assistente. Instale a extensão "CORS Unblock" no Chrome e recarregue a página.');
            });

            document.body.appendChild(fallbackBtn);
        });
})();
