javascript:(function() {
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const BLACKBOX_API = 'https://www.blackbox.ai/api/chat';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743457974/ui.js'; // ATUALIZE COM SEU UI.js

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
        images: []
    };

    // ===== FUNÇÕES PRINCIPAIS =====
    function extractImages() {
        STATE.images = [...document.querySelectorAll('img, [data-image]')]
            .map(el => el.src || el.getAttribute('data-image'))
            .filter(src => IMAGE_FILTERS.verify(src))
            .slice(0, 10); // Limite de 10 imagens
        return STATE.images;
    }

    function buildPrompt(question) {
        return `RESPONDA DIRETO COM A ALTERNATIVA COMPLETA (Ex: "B) 120") SEM EXPLICAR:

        QUESTÃO: ${question}
        
        ${STATE.images.length ? `IMAGENS: ${STATE.images.slice(0,2).join(' | ')}` : ''}
        
        RESPOSTA:`;
    }

    async function queryBlackbox(prompt) {
        try {
            const response = await fetch(BLACKBOX_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'blackbox',
                    stream: false
                })
            });

            if (!response.ok) throw new Error('Erro na API');
            
            const data = await response.json();
            const answer = data.message?.content;
            
            // Extrai a resposta formatada
            const match = answer.match(/[A-Ea-e]\)\s*.+/) || 
                         answer.match(/Alternativa\s*([A-Ea-e])/i);
            return match ? match[0] : answer.substring(0, 100);
            
        } catch (error) {
            console.error("Erro Blackbox:", error);
            return `Erro: ${error.message}`;
        }
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        if (!window.location.hostname.includes(TARGET_SITE)) return;

        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        script.onload = () => {
            const { input, analyzeOption, updateImagesOption, responsePanel } = window.createUI();

            analyzeOption.onclick = async () => {
                if (STATE.isAnalyzing || !input.value.trim()) return;
                
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
                    analyzeOption.textContent = 'Analisar';
                }
            };

            updateImagesOption.onclick = () => {
                extractImages();
                window.updateImageButtons(STATE.images);
                window.showResponse(responsePanel, `${STATE.images.length} imagens encontradas`);
            };

            // Carrega imagens automaticamente
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
