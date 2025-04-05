javascript:(function() {
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        TARGET_SITE: 'saladofuturo.educacao.sp.gov.br',
        GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
        GEMINI_MODELS: ['gemini-2.0-flash:generateContent', 'gemini-pro:generateContent'],
        API_KEY: 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY',
        UI_SCRIPT_URL: 'AQUI',
        TIMEOUT: 15000,
        MAX_RETRIES: 3,
        TEMPERATURE: 0.5,
        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 HCK-V5/1.0'
    };

    // ===== PROXIES CORS PÚBLICAS FUNCIONAIS =====
    const CORS_PROXIES = [
        '',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://yacdn.org/proxy/',
        'https://cors.bridged.cc/',
        'https://proxy.cors.sh/',
        'https://corsproxy.io/?',
        'https://allorigins.win/api/v1/fetch?url=',
        'https://jsonp.afeld.me/?url=',
        'https://crossorigin.me/',
        'https://www.whateverorigin.org/get?url=',
        'https://api.allorigins.win/raw?url=',
        'https://cors.eu.org/',
        'https://cors.now.sh/',
        'https://gimmeproxy.com/api/getProxy?country=BR',
        'https://cors.io/'
    ];

    // ===== FILTROS DE IMAGEM =====
    const IMAGE_FILTERS = {
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i,
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

    // ===== MÉTODO BYPASS CORS =====
    async function queryGeminiWithBypass(prompt) {
        const model = CONFIG.GEMINI_MODELS[0];
        let url = `${CONFIG.GEMINI_API_BASE}${model}?key=${CONFIG.API_KEY}`;

        for (let i = STATE.currentProxyIndex; i < CORS_PROXIES.length; i++) {
            try {
                const proxyUrl = CORS_PROXIES[i] ? `${CORS_PROXIES[i]}${encodeURIComponent(url)}` : url;
                const response = await fetchWithRetry(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': CONFIG.USER_AGENT,
                        'Accept': 'application/json',
                        'Referer': 'https://educacao.sp.gov.br',
                        'Origin': 'https://educacao.sp.gov.br'
                    },
                    body: JSON.stringify(prompt)
                });

                const data = await response.json();
                const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
                STATE.currentProxyIndex = i;
                return answer;
            } catch (error) {
                console.error(`Erro com proxy ${CORS_PROXIES[i]}:`, error);
                if (i === CORS_PROXIES.length - 1) {
                    console.log('Tentando métodos alternativos de bypass...');
                }
            }
        }

        try {
            const jsonpUrl = `https://jsonp.afeld.me/?url=${encodeURIComponent(url)}`;
            const response = await fetchWithRetry(jsonpUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': CONFIG.USER_AGENT
                }
            });
            const data = await response.json();
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
            return answer;
        } catch (error) {
            console.error('Erro com JSONP:', error);
        }

        try {
            const webrtcUrl = 'https://your-webrtc-tunnel.example.com/proxy';
            const response = await fetchWithRetry(webrtcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': CONFIG.USER_AGENT
                },
                body: JSON.stringify({ url, data: prompt })
            });
            const data = await response.json();
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
            return answer;
        } catch (error) {
            console.error('Erro com WebRTC:', error);
        }

        return `Erro: Não foi possível contornar CORS. Tente configurar um túnel local (ex.: ngrok).`;
    }

    // ===== FUNÇÕES DE FORMATAÇÃO E ANÁLISE =====
    function detectAlternativesFormat(input) {
        const alternativesPattern = /[A-E]\)\s*[^A-E\)]+/g; // Ex.: "A) 10", "B) 15", "C) Texto"
        const matches = input.match(alternativesPattern);
        return matches ? matches : null; // Retorna as alternativas ou null se não houver
    }

    function formatResponse(answer, alternatives) {
        if (!alternatives) {
            // Se não houver alternativas no formato "A) 10", retorna apenas o valor
            return answer;
        }
        // Se houver alternativas, retorna no formato "C) 10" correspondente ao valor da resposta
        const matchedAlternative = alternatives.find(alt => {
            const value = alt.split(')')[1].trim();
            return value == answer || parseFloat(value) == parseFloat(answer);
        });
        return matchedAlternative || answer; // Retorna a alternativa correspondente ou o valor bruto
    }

    // ===== FUNÇÕES PRINCIPAIS =====
    function extractImages() {
        STATE.images = [...document.querySelectorAll('img, [data-image]')]
            .map(el => el.src || el.getAttribute('data-image'))
            .filter(src => IMAGE_FILTERS.verify(src))
            .slice(0, 10);
        return STATE.images;
    }

    function buildPrompt(question, images) {
        return {
            contents: [{
                parts: [{
                    text: `
                        Você é um assistente especializado em resolver questões de provas acadêmicas. Analise a questão abaixo e forneça a resposta correta. Se houver alternativas no formato "A) valor", "B) valor", etc., retorne apenas o valor ou texto da alternativa correta (ex.: "10" ou "Texto"). Se não houver alternativas, retorne apenas o resultado final (ex.: "10"). Forneça uma explicação breve e clara, se aplicável.

                        Questão: ${question}

                        ${images.length ? 'Imagens relacionadas: ' + images.join(', ') : ''}
                    `
                },
                ...images.map(url => ({ inlineData: { mimeType: 'image/jpeg', data: url } }))]
            }],
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                maxOutputTokens: 100
            }
        };
    }

    async function queryGemini(prompt) {
        try {
            const answer = await queryGeminiWithBypass(prompt);
            return answer;
        } catch (error) {
            console.error('Erro geral:', error);
            return `Erro: ${error.message}`;
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
            const { input, analyzeOption, clearOption, updateImagesOption, responsePanel, imagesContainer } = window.createUI();

            analyzeOption.onclick = async () => {
                if (STATE.isAnalyzing || !input.value.trim()) {
                    window.showResponse(responsePanel, 'Digite uma questão válida!');
                    return;
                }

                STATE.isAnalyzing = true;
                analyzeOption.disabled = true;
                analyzeOption.textContent = '🔍 Analisando...';

                try {
                    const images = extractImages();
                    const alternatives = detectAlternativesFormat(input.value.trim());
                    const prompt = buildPrompt(input.value.trim(), images);
                    const answer = await queryGemini(prompt);

                    // Separa a resposta e a explicação (assumindo que a IA retorna "resposta\nexplicação")
                    const [answerValue, ...explanationParts] = answer.split('\n').filter(line => line.trim());
                    const explanation = explanationParts.join('\n');

                    // Formata a resposta com base nas alternativas
                    const formattedAnswer = formatResponse(answerValue, alternatives);

                    // Monta a resposta final com explicação
                    const finalResponse = `${formattedAnswer}${explanation ? '\n\nExplicação: ' + explanation : ''}`;
                    window.showResponse(responsePanel, finalResponse);
                } catch (error) {
                    window.showResponse(responsePanel, `Erro: ${error.message}`);
                } finally {
                    STATE.isAnalyzing = false;
                    analyzeOption.disabled = false;
                    analyzeOption.textContent = '🔍 Analisar';
                }
            };

            clearOption.onclick = () => {
                input.value = '';
                imagesContainer.innerHTML = '<div style="color: #FFFFFF; text-align: center; padding: 6px;">Nenhuma imagem</div>';
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
