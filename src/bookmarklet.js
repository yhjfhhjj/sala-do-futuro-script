javascript:(function() {
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        TARGET_SITE: 'saladofuturo.educacao.sp.gov.br',
        BLACKBOX_API: 'https://www.blackbox.ai/api/chat',
        UI_SCRIPT_URL: 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743459158/ui.js',
        TIMEOUT: 15000, 
        MAX_RETRIES: 2 
    };

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
        verify: function(src) {
            if (!src || !src.startsWith('http')) return false;
            return !this.blocked.some(r => r.test(src)) && 
                   this.allowed.some(r => r.test(src));
        }
    };

    // ===== ESTADO GLOBAL =====
    const STATE = {
        isAnalyzing: false,
        images: [],
        lastError: null
    };

    // ===== UTILITÁRIOS =====
    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), ms)
            )
        ]);
    }

    async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await withTimeout(fetch(url, options), CONFIG.TIMEOUT);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) {
                STATE.lastError = error;
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Backoff exponencial
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
        return `RESPONDA DIRETO COM A ALTERNATIVA COMPLETA (Ex: "B) 120") SEM EXPLICAR:

        QUESTÃO: ${question}
        
        ${STATE.images.length ? `IMAGENS: ${STATE.images.slice(0, 2).join(' | ')}` : ''}
        
        RESPOSTA:`;
    }

    async function queryBlackbox(prompt) {
        try {
            const response = await fetchWithRetry(CONFIG.BLACKBOX_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; HCK-Blackbox/1.0)',
                    'Origin': window.location.origin // Tenta ajudar com CORS
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'blackbox',
                    stream: false
                })
            });

            const data = await response.json();
            const answer = data.message?.content || 'Sem resposta';

            const match = answer.match(/[A-Ea-e]\)\s*.+/) || 
                         answer.match(/Alternativa\s*([A-Ea-e])/i);
            return match ? match[0] : answer.substring(0, 100);
        } catch (error) {
            console.error('Erro Blackbox:', error);
            return `Erro: ${error.message}${error.message.includes('CORS') ? ' (CORS bloqueado)' : ''}`;
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
            const { input, analyzeOption, responsePanel, imagesContainer } = window.createUI();

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
                    const answer = await queryBlackbox(prompt);
                    window.showResponse(responsePanel, answer);
                } finally {
                    STATE.isAnalyzing = false;
                    analyzeOption.disabled = false;
                    analyzeOption.textContent = '🔍 Analisar';
                }
            };

            imagesContainer.onclick = () => {
                extractImages();
                window.updateImageButtons(STATE.images);
                window.showResponse(responsePanel, `${STATE.images.length} imagens encontradas`);
            };

            extractImages();
            window.updateImageButtons(STATE.images);
        };
        document.head.appendChild(script);
    }

    // ===== INICIAR =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
