(function() {
    // 1. CONFIGURAÇÕES (Mantidas do original com aprimoramentos)
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js';
    
    // Novos: Proxies CORS adicionados
    const CORS_PROXIES = [
        '',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest='
    ];

    // 2. ESTADO GLOBAL (Aprimorado)
    const STATE = {
        isAnalyzing: false,
        currentProxy: 0,
        retryCount: 0,
        menuOpen: false
    };

    // 3. FUNÇÕES DE BYPASS CORS (Novas)
    async function makeApiRequest(prompt) {
        const proxies = [...CORS_PROXIES]; // Clone para evitar mutação
        let lastError = null;

        for (let i = 0; i < proxies.length; i++) {
            STATE.currentProxy = i;
            const proxy = proxies[i];
            const url = proxy ? `${proxy}${GEMINI_API_URL}?key=${GEMINI_API_KEY}` 
                             : `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

            try {
                const response = await fetch(url, {
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
                console.warn(`Tentativa ${i+1} falhou (proxy: ${proxy || 'direto'})`, error);
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay entre tentativas
            }
        }
        throw lastError || new Error("Todas as tentativas falharam");
    }

    // 4. FUNÇÕES ORIGINAIS (Mantidas com melhorias)
    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        // Padrões originais mantidos
        const blocked = [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /conteudo_logo\.png$/i
        ];
        
        const allowed = [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            /\.(jpg|png|jpeg)$/i
        ];
        
        for (const pattern of blocked) if (pattern.test(url)) return false;
        for (const pattern of allowed) if (pattern.test(url)) return true;
        
        return window.location.hostname === TARGET_SITE;
    }

    function extractPageContent() {
        const contentArea = document.querySelector('body') || document.documentElement;
        if (!contentArea) return { text: '', images: [] };

        // Original: Remoção de elementos não desejados
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

    // 5. UI E EVENTOS (Aprimorados)
    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);
            
            // Garantir que a UI seja criada
            if (!window.createUI) {
                console.error('Função createUI não encontrada');
                return;
            }

            const ui = window.createUI();
            if (!ui) {
                console.error('Falha ao criar UI');
                return;
            }

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            // Gerenciamento de estado do menu
            function toggleMenu() {
                STATE.menuOpen = !STATE.menuOpen;
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = STATE.menuOpen ? 'flex' : 'none';
            }

            // Event listeners aprimorados
            menuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMenu();
            });

            analyzeOption.addEventListener('click', async function() {
                if (STATE.isAnalyzing) return;
                
                STATE.isAnalyzing = true;
                analyzeOption.disabled = true;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">⏳</span>Analisando...';
                analyzeOption.style.opacity = '0.7';

                try {
                    const question = input.value.trim();
                    if (!question) {
                        window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                        return;
                    }

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

            // Fechar menu ao clicar fora
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#gemini-helper-container')) {
                    STATE.menuOpen = false;
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });

            // Tecla ESC para fechar menu
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && STATE.menuOpen) {
                    toggleMenu();
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar ui.js:', error);
            // Fallback básico
            const fallbackBtn = document.createElement('button');
            fallbackBtn.innerHTML = 'Ajuda HCK';
            fallbackBtn.style = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 999999;
                padding: 10px 16px;
                background: linear-gradient(135deg, #FF6F61, #D946EF);
                color: #FFFFFF;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                boxShadow: 0 4px 12px rgba(217, 70, 239, 0.3);
            `;
            document.body.appendChild(fallbackBtn);
        });

    // 6. FUNÇÃO DE ANÁLISE (Aprimorada)
    async function analyzeContent(content, question) {
        if (!question.trim()) return { answer: '', correctAlternative: 'Por favor, cole uma pergunta com alternativas.' };

        const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
        const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

        const prompt = `ANÁLISE DE QUESTÃO - Retorne APENAS a letra da alternativa correta (A-E):\n\nPergunta:\n${cleanedQuestion}\n\nContexto:\n${content.text}\n\nImagens:\n${content.images.join(', ')}${imageUrl ? `\nImagem adicional: ${imageUrl}` : ''}\n\nResposta:`;

        try {
            STATE.retryCount = 0;
            const data = await makeApiRequest(prompt);
            const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erro';
            const match = fullAnswer.match(/[A-E]/i);
            return { answer: '', correctAlternative: match ? match[0].toUpperCase() : 'Erro' };
        } catch (error) {
            console.error('Erro na API:', error);
            return { answer: '', correctAlternative: 'Erro' };
        }
    }
})();
