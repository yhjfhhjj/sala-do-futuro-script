(function() {
    // ======================
    // CONFIGURAÇÕES PRINCIPAIS
    // ======================
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js';
    const ACTIVITY_URL_PATTERN = /\/atividade\/\d+\?eExame=true/i;

    // ======================
    // CONFIGURAÇÕES DE IMAGENS
    // ======================
    const IMAGE_FILTERS = {
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /(conteudo_logo|logo|icon|favicon)\.(png|jpg|jpeg|svg)$/i,
            /\/icons?\//i,
            /\/logos?\//i,
            /\/buttons?\//i,
            /\/assets\//i,
            /\/banners?\//i,
            /\/spinners?\//i
        ],
        allowed: [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            ACTIVITY_URL_PATTERN,
            /\/questions?\//i,
            /\/problems?\//i,
            /\.(jpg|png|jpeg|gif|webp|bmp)$/i
        ]
    };

    // ======================
    // FUNÇÕES AUXILIARES
    // ======================
    function isTargetSite() {
        return window.location.hostname === TARGET_SITE;
    }

    function isActivityPage() {
        return ACTIVITY_URL_PATTERN.test(window.location.pathname + window.location.search);
    }

    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        // Verificar lista de bloqueados primeiro
        for (const pattern of IMAGE_FILTERS.blocked) {
            if (pattern.test(url)) return false;
        }
        
        // Verificar lista de permitidos
        for (const pattern of IMAGE_FILTERS.allowed) {
            if (pattern.test(url)) return true;
        }
        
        return false;
    }

    // ======================
    // FUNÇÕES DE EXTRACAÇÃO DE CONTEÚDO
    // ======================
    function extractPageContent() {
        const contentArea = document.querySelector('body') || document.documentElement;
        if (!contentArea) return { text: '', images: [] };

        // Remove elementos não desejados
        const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
        unwantedTags.forEach(tag => {
            const elements = contentArea.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });

        // Filtra imagens conforme regras específicas
        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(shouldIncludeImage)
            .slice(0, 50);

        // Limita o texto para evitar payloads muito grandes
        const text = (contentArea.textContent || '').replace(/\s+/g, ' ').substring(0, 15000);
        
        return { text, images };
    }

    // ======================
    // FUNÇÕES DE COMUNICAÇÃO COM API
    // ======================
    async function makeApiRequest(prompt) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        maxOutputTokens: 2, 
                        temperature: 0.1,
                        topP: 0.3
                    }
                }),
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição direta:', error);
            throw error;
        }
    }

    // ======================
    // FUNÇÃO PRINCIPAL DE ANÁLISE
    // ======================
    async function analyzeContent(content, question) {
        if (!question.trim()) {
            return { answer: '', correctAlternative: 'Por favor, cole uma pergunta com alternativas.' };
        }

        const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
        const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

        const prompt = `
ANÁLISE DE QUESTÃO - DIRETRIZES ESTRITAS:

1. FOCO: Analise exclusivamente a questão e o contexto fornecido.
2. FORMATO: Retorne APENAS a letra da alternativa correta (A, B, C, D ou E).
3. CONTEXTO: Considere o texto da página e as imagens relacionadas.
4. IMAGENS: Utilize como suporte visual quando relevante.

QUESTÃO:
${cleanedQuestion}

CONTEXTO DA PÁGINA:
${content.text}

IMAGENS DISPONÍVEIS:
${content.images.join('\n')}
${imageUrl ? `\nIMAGEM ADICIONAL:\n${imageUrl}` : ''}

RESPOSTA (APENAS A LETRA):`.trim();

        try {
            const data = await makeApiRequest(prompt);
            const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            const match = fullAnswer.match(/^[A-E]/);
            return { 
                answer: '', 
                correctAlternative: match ? match[0].toUpperCase() : 'Erro' 
            };
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

            let isAnalyzing = false;

            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            // Configurar eventos da UI
            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            analyzeOption.addEventListener('click', async () => {
                if (isAnalyzing) return;
                isAnalyzing = true;

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                    isAnalyzing = false;
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
                    isAnalyzing = false;
                    
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, () => { isAnalyzing = false; });
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
})();,
