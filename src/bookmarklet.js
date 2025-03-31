(function() {
    // Configurações avançadas
    const CONFIG = {
        TARGET_SITE: 'saladofuturo.educacao.sp.gov.br',
        ACTIVITY_URL_PATTERN: /\/atividade\/\d+\?eExame=true/i,
        GEMINI_API_KEY: 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY',
        API_ENDPOINTS: [
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
        ],
        UI_SCRIPT_URL: 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js',
        IMAGE_FILTERS: {
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
                /\/atividade\/\d+\?eExame=true/i,
                /\/questions?\//i,
                /\/problems?\//i,
                /\.(jpg|png|jpeg|gif|webp|bmp)$/i
            ]
        },
        MAX_TEXT_LENGTH: 20000,
        MAX_IMAGES: 50
    };

    // ======================
    // FUNÇÕES DE PROCESSAMENTO
    // ======================

    function isActivityPage() {
        return CONFIG.ACTIVITY_URL_PATTERN.test(window.location.pathname + window.location.search);
    }

    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        // Verificar lista de bloqueados primeiro
        for (const pattern of CONFIG.IMAGE_FILTERS.blocked) {
            if (pattern.test(url)) {
                console.log(`Imagem bloqueada: ${url} (padrão: ${pattern})`);
                return false;
            }
        }
        
        // Verificar lista de permitidos
        for (const pattern of CONFIG.IMAGE_FILTERS.allowed) {
            if (pattern.test(url)) {
                console.log(`Imagem permitida: ${url} (padrão: ${pattern})`);
                return true;
            }
        }
        
        // Permitir outras imagens apenas em páginas de atividade
        return isActivityPage();
    }

    function extractPageContent() {
        const contentSelectors = isActivityPage() 
            ? ['#question-container', '.question-content', '.exercise-text', 'body']
            : ['main', '.content-area', '.exercise-container', 'body'];
        
        let contentArea = null;
        for (const selector of contentSelectors) {
            contentArea = document.querySelector(selector);
            if (contentArea) break;
        }

        if (!contentArea) return { text: '', images: [] };

        // Clonar o elemento para não modificar o DOM original
        const clone = contentArea.cloneNode(true);
        
        // Remover elementos indesejados
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'svg', 'iframe', 'head',
            'nav', 'footer', 'header', '.navbar', '.footer', '.ad',
            '.tooltip', '.modal', '.notification', '.menu', '.sidebar'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Extrair texto limpo
        const text = (clone.textContent || '')
            .replace(/\s+/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\s*([.,;:!?])\s*/g, '$1 ')
            .trim()
            .substring(0, CONFIG.MAX_TEXT_LENGTH);

        // Extrair e filtrar imagens de múltiplas fontes
        const imageSources = new Set();
        
        // 1. Tags <img> tradicionais
        Array.from(clone.querySelectorAll('img')).forEach(img => {
            if (img.src && shouldIncludeImage(img.src)) {
                imageSources.add(img.src);
            }
        });
        
        // 2. Background images
        Array.from(clone.querySelectorAll('[style*="background-image"]')).forEach(el => {
            const style = window.getComputedStyle(el);
            const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
            if (match && shouldIncludeImage(match[1])) {
                imageSources.add(match[1]);
            }
        });
        
        // 3. Links para imagens
        Array.from(clone.querySelectorAll('a')).forEach(a => {
            if (a.href && shouldIncludeImage(a.href)) {
                imageSources.add(a.href);
            }
        });
        
        // Converter para array e limitar
        const images = Array.from(imageSources).slice(0, CONFIG.MAX_IMAGES);

        return { text, images };
    }

    // ======================
    // INTEGRAÇÃO COM API GEMINI
    // ======================

    async function analyzeContent(content, question) {
        if (!question.trim()) {
            return { answer: '', correctAlternative: 'Por favor, cole uma pergunta com alternativas.' };
        }

        // Extrair informações da pergunta
        const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
        const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

        // Construir prompt otimizado
        const prompt = `
Você é um especialista em análise de questões educacionais. Siga rigorosamente estas instruções:

1. ANALISE a pergunta abaixo e o contexto da página.
2. IDENTIFIQUE o assunto principal e os conceitos envolvidos.
3. CONSIDERE todas as imagens fornecidas como contexto adicional.
4. AVALIE cada alternativa criticamente.
5. RETORNE apenas a letra da alternativa correta (A, B, C, D ou E).

FORMATO DE RESPOSTA:
\`\`\`
[LETRA DA ALTERNATIVA CORRETA]
\`\`\`

DADOS DA QUESTÃO:
${cleanedQuestion}

CONTEXTO DA PÁGINA:
${content.text}

IMAGENS DISPONÍVEIS:
${content.images.join('\n')}
${imageUrl ? `\nIMAGEM ADICIONAL DA QUESTÃO:\n${imageUrl}` : ''}

ANÁLISE CRÍTICA (interna):
`.trim();

        try {
            const response = await fetch(`${CONFIG.API_ENDPOINTS[0]}?key=${CONFIG.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        maxOutputTokens: 2,
                        temperature: 0.1,
                        topP: 0.3
                    }
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            
            // Extrair a alternativa de forma robusta
            const match = fullAnswer.match(/^[A-Ea-e]/);
            const correctAlternative = match ? match[0].toUpperCase() : 'Erro';
            
            return { answer: '', correctAlternative };

        } catch (error) {
            console.error('Erro na API:', error);
            return { answer: '', correctAlternative: 'Erro' };
        }
    }

    // ======================
    // CARREGAMENTO DA UI
    // ======================

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            // Configurar eventos
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
                    console.error(error);
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
                window.clearUI(input, responsePanel, analyzeOption);
                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = 'none';
            });

            // Adicionar atalho de teclado
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter' && input.value.trim()) {
                    analyzeOption.click();
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar a UI:', error);
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

    // Monitorar alterações na página (para SPAs)
    if (isActivityPage()) {
        const observer = new MutationObserver(() => {
            if (document.getElementById('gemini-helper-container')) return;
            const uiScript = document.createElement('script');
            uiScript.src = UI_SCRIPT_URL;
            document.head.appendChild(uiScript);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
