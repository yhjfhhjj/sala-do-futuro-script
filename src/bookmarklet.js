(function() {
    // Configurações específicas para o site Sala do Futuro
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const isTargetSite = window.location.hostname === TARGET_SITE;
    
    // Configurações da API Gemini
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js';

    // Padrões de URLs de imagens para filtrar
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
            /\.jpg$/i,
            /\.png$/i,
            /\.jpeg$/i
        ]
    };

    // Verifica se uma URL de imagem deve ser incluída
    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        for (const pattern of IMAGE_FILTERS.blocked) {
            if (pattern.test(url)) return false;
        }
        
        for (const pattern of IMAGE_FILTERS.allowed) {
            if (pattern.test(url)) return true;
        }
        
        return isTargetSite;
    }

    // Carregar a UI
    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            window.isAnalyzing = false; // Mantido como global para compatibilidade

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

                const prompt = `ANÁLISE DE QUESTÃO - Retorne APENAS a letra da alternativa correta (A, B, C, D ou E):\n\nPergunta:\n${cleanedQuestion}\n\nContexto:\n${content.text}\n\nImagens:\n${content.images.join(', ')}${imageUrl ? `\nImagem adicional: ${imageUrl}` : ''}\n\nResposta:`;

                try {
                    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                        })
                    });

                    if (!response.ok) throw new Error('Erro na API');
                    
                    const data = await response.json();
                    const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Erro';
                    const match = fullAnswer.match(/[A-E]/i);
                    const correctAlternative = match ? match[0].toUpperCase() : 'Erro';
                    
                    return { answer: '', correctAlternative };
                } catch (error) {
                    console.error('Erro na API:', error);
                    return { answer: '', correctAlternative: 'Erro' };
                }
            }

            // Integração com a UI
            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            analyzeOption.addEventListener('click', async () => {
                if (window.isAnalyzing) return;
                window.isAnalyzing = true;

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                    window.isAnalyzing = false;
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
                    window.isAnalyzing = false;
                    
                    const menu = document.getElementById('gemini-menu');
                    if (menu) menu.style.display = 'none';
                }
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, () => { window.isAnalyzing = false; });
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
        .catch(error => console.error('Erro ao carregar ui.js:', error));
})();
