(function() {
    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const BLACKBOX_API = 'https://www.blackbox.ai/api/chat';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743453180/bookmark1.js';
    const STATE = { 
        isAnalyzing: false,
        images: [] 
    };

    // ===== FUNÇÕES UTILITÁRIAS =====
    function log(message) {
        console.log(`[HCK Blackbox] ${message}`);
    }

    function buildPrompt(question, images = []) {
        return `ANÁLISE EXATA - RESPONDA APENAS COM A ALTERNATIVA COMPLETA CORRETA (Ex: "B) 120").
NÃO EXPLIQUE, NÃO COMENTE, NÃO FORMATE.

Questão: ${question}
${images.length ? `Imagens referenciais: ${images.slice(0,2).join(' | ')}` : ''}

Responda estritamente com a alternativa correta no formato "X) ...":`;
    }

    // ===== SISTEMA DE IMAGENS =====
    function extractImages() {
        STATE.images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.startsWith('http'))
            .slice(0, 5); // Limite reduzido (Blackbox)
        return STATE.images;
    }

    // ===== INTEGRAÇÃO COM BLACKBOX =====
    async function queryBlackbox(prompt) {
        try {
            const response = await fetch(BLACKBOX_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'blackbox',
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return extractBlackboxAnswer(data);
        } catch (error) {
            throw error;
        }
    }

    function extractBlackboxAnswer(data) {
        // Padrões de resposta esperados
        const answerPatterns = [
            /([A-Ea-e]\)\s*.+)/,  // Padrão "X) ..."
            /Alternativa\s*([A-Ea-e])/i  // Padrão "Alternativa X"
        ];

        const rawAnswer = data?.message?.content || '';
        for (const pattern of answerPatterns) {
            const match = rawAnswer.match(pattern);
            if (match) return match[0].trim();
        }
        return rawAnswer.substring(0, 50); // Fallback
    }

    // ===== FUNÇÃO PRINCIPAL DE ANÁLISE =====
    async function analyzeQuestion(input, analyzeOption, responsePanel) {
        if (STATE.isAnalyzing) return;
        const question = input.value.trim();
        if (!question) {
            window.showResponse(responsePanel, '', 'Cole a questão primeiro');
            return;
        }

        STATE.isAnalyzing = true;
        analyzeOption.disabled = true;
        analyzeOption.innerHTML = '⏳ Analisando...';

        try {
            const prompt = buildPrompt(question, STATE.images);
            log(`Enviando: ${prompt.substring(0, 60)}...`);
            
            const answer = await queryBlackbox(prompt);
            window.showResponse(responsePanel, answer, answer || 'Resposta não reconhecida');
        } catch (error) {
            window.showResponse(responsePanel, '', `Erro: ${error.message}`);
        } finally {
            STATE.isAnalyzing = false;
            analyzeOption.disabled = false;
            analyzeOption.innerHTML = '🔍 Analisar';
        }
    }

    // ===== INICIALIZAÇÃO =====
    function initialize() {
        if (!window.location.hostname.includes(TARGET_SITE)) return;

        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        script.onload = () => {
            const { input, analyzeOption, clearOption, updateImagesOption, responsePanel } = window.createUI();

            analyzeOption.onclick = () => analyzeQuestion(input, analyzeOption, responsePanel);
            clearOption.onclick = () => {
                input.value = '';
                responsePanel.style.display = 'none';
            };
            updateImagesOption.onclick = () => {
                extractImages();
                window.updateImageButtons(STATE.images);
            };

            // UI modificada (Blackbox)
            document.getElementById('hck-toggle-btn').textContent = 'HCK Blackbox';
            log('Modo Blackbox ativado');
        };
        document.head.appendChild(script);
    }

    // ===== INICIAR =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
