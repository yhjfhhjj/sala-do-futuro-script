(function() {
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743446046/ui.js';

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
            /lh7-rt\.googleusercontent\.com/i // Novo padrão para Google URLs
        ]
    };

    const STATE = {
        isAnalyzing: false,
        currentEndpoint: 0,
        currentProxy: 0,
        retryCount: 0,
        maxRetries: 2
    };

    // Função para registrar logs
    function log(message) {
        const logPanel = document.getElementById('gemini-log-panel');
        if (logPanel) {
            window.showLog(logPanel, message);
        } else {
            console.log(`[HCK V3 Log] ${message}`);
        }
    }

    // Métodos para Contornar CORS
    async function tryDirectRequest(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        log(`Tentando requisição direta para ${endpoint}`);
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
            log('Requisição direta bem-sucedida');
            return await response.json();
        } catch (error) {
            log(`Erro na requisição direta: ${error.message}`);
            throw error;
        }
    }

    async function tryWithProxy(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        const proxy = CORS_PROXIES[STATE.currentProxy];
        log(`Tentando proxy ${proxy} para ${endpoint}`);
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
            log(`Proxy ${proxy} bem-sucedido`);
            return await response.json();
        } catch (error) {
            log(`Erro no proxy ${proxy}: ${error.message}`);
            throw error;
        }
    }

    async function tryWithModifiedHeaders(prompt) {
        const endpoint = `${API_ENDPOINTS[STATE.currentEndpoint]}?key=${GEMINI_API_KEY}`;
        log(`Tentando com headers modificados para ${endpoint}`);
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
                    log('Requisição com headers modificados bem-sucedida');
                    return JSON.parse(text);
                } catch {
                    throw new Error('Resposta opaca inválida');
                }
            }
            log('Requisição com headers modificados bem-sucedida');
            return await response.json();
        } catch (error) {
            log(`Erro com headers modificados: ${error.message}`);
            throw error;
        }
    }

    async function tryWithXMLHttpRequest(prompt) {
        log(`Tentando XMLHttpRequest para ${API_ENDPOINTS[STATE.currentEndpoint]}`);
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
                            log('XMLHttpRequest bem-sucedido');
                            resolve(JSON.parse(xhr.responseText));
                        } catch {
                            log('Erro ao parsear resposta do XMLHttpRequest');
                            reject(new Error('Resposta inválida'));
                        }
                    } else {
                        log(`Erro no XMLHttpRequest: HTTP ${xhr.status}`);
                        reject(new Error(`HTTP ${xhr.status}`));
                    }
                }
            };
            xhr.onerror = () => {
                log('Erro na requisição XMLHttpRequest');
                reject(new Error('Erro na requisição XHR'));
            };
            xhr.send(JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
            }));
        });
    }

    // Método principal para enviar requisições com fallback
    async function sendRequest(prompt) {
        try {
            // Primeiro tenta requisição direta
            return await tryDirectRequest(prompt);
        } catch (error1) {
            log(`Falha na requisição direta: ${error1.message}`);
            
            // Se falhar, tenta com proxies
            try {
                return await tryWithProxy(prompt);
            } catch (error2) {
                log(`Falha com proxy: ${error2.message}`);
                
                // Se falhar, tenta com headers modificados
                try {
                    return await tryWithModifiedHeaders(prompt);
                } catch (error3) {
                    log(`Falha com headers modificados: ${error3.message}`);
                    
                    // Último recurso: XMLHttpRequest
                    try {
                        return await tryWithXMLHttpRequest(prompt);
                    } catch (error4) {
                        log(`Falha com XMLHttpRequest: ${error4.message}`);
                        
                        // Rotaciona endpoints e proxies para tentar novamente
                        if (STATE.retryCount < STATE.maxRetries) {
                            STATE.retryCount++;
                            STATE.currentEndpoint = (STATE.currentEndpoint + 1) % API_ENDPOINTS.length;
                            STATE.currentProxy = (STATE.currentProxy + 1) % CORS_PROXIES.length;
                            log(`Tentando novamente (${STATE.retryCount}/${STATE.maxRetries}) com novo endpoint/proxy`);
                            return await sendRequest(prompt);
                        } else {
                            throw new Error('Todos os métodos falharam após várias tentativas');
                        }
                    }
                }
            }
        }
    }

    // Função para extrair imagens da página
    function extractImages() {
        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => {
                if (!src || !src.startsWith('http')) return false;
                return !IMAGE_FILTERS.blocked.some(pattern => pattern.test(src)) && 
                       IMAGE_FILTERS.allowed.some(pattern => pattern.test(src));
            })
            .slice(0, 50);
        return images;
    }

    // Função para construir o prompt para o Gemini
    function buildPrompt(question, images = []) {
        let prompt = `Analise esta questão e responda apenas com a alternativa correta (A, B, C, D ou E), sem explicações:\n\n${question}`;
        
        if (images.length > 0) {
            prompt += `\n\nImagens relacionadas (URLs):\n${images.slice(0, 3).join('\n')}`;
        }
        
        return prompt;
    }

    // Função principal para analisar a questão
    async function analyzeQuestion() {
        if (STATE.isAnalyzing) return;
        
        const { input, responsePanel, analyzeOption } = window.createUI();
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
            const images = extractImages();
            const prompt = buildPrompt(question, images);
            log(`Enviando prompt: ${prompt.substring(0, 100)}...`);
            
            const response = await sendRequest(prompt);
            log(`Resposta recebida: ${JSON.stringify(response)}`);
            
            if (response && response.candidates && response.candidates[0].content.parts[0].text) {
                const answer = response.candidates[0].content.parts[0].text.trim();
                const match = answer.match(/^[A-E]/i);
                const correctAlternative = match ? match[0].toUpperCase() : 'Resposta não encontrada';
                
                window.showResponse(responsePanel, answer, correctAlternative);
                log(`Alternativa correta: ${correctAlternative}`);
            } else {
                throw new Error('Resposta inválida da API');
            }
        } catch (error) {
            log(`Erro na análise: ${error.message}`);
            window.showResponse(responsePanel, '', `Erro: ${error.message}`);
        } finally {
            STATE.isAnalyzing = false;
            analyzeOption.disabled = false;
            analyzeOption.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
            analyzeOption.style.opacity = '1';
        }
    }

    // Carrega a UI e configura os eventos
    function initialize() {
        if (window.location.hostname !== TARGET_SITE) return;
        
        // Carrega o script da UI
        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        script.onload = () => {
            const { menuBtn, analyzeOption, clearOption, input } = window.createUI();
            
            // Configura eventos
            menuBtn.onclick = () => {
                const menu = document.getElementById('gemini-menu');
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };
            
            analyzeOption.onclick = analyzeQuestion;
            
            clearOption.onclick = () => {
                input.value = '';
                const responsePanel = document.getElementById('gemini-response-panel');
                if (responsePanel) responsePanel.style.display = 'none';
            };
            
            // Fecha o menu ao clicar fora
            document.addEventListener('click', (event) => {
                const menu = document.getElementById('gemini-menu');
                const menuBtn = document.getElementById('gemini-menu-btn');
                if (menu && menu.style.display === 'block' && 
                    !menu.contains(event.target) && 
                    !menuBtn.contains(event.target)) {
                    menu.style.display = 'none';
                }
            });
            
            log('Bookmarklet inicializado com sucesso');
        };
        
        script.onerror = () => {
            console.error('Falha ao carregar o script da UI');
        };
        
        document.head.appendChild(script);
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
