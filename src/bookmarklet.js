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
        // URLs que devem ser sempre bloqueadas (elementos do site)
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /conteudo_logo\.png$/i,
            /\/icons?\//i,
            /\/logos?\//i,
            /\/buttons?\//i,
            /\/assets\//i
        ],
        
        // URLs que devem ser sempre permitidas (conteúdo educacional)
        allowed: [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            /\.jpg$/i,
            /\.png$/i,
            /\.jpeg$/i
        ]
    };

    // Verifica se uma URL de imagem deve ser incluída
    function shouldIncludeImage(url) {
        if (!url || !url.startsWith('http')) return false;
        
        // Primeiro verifica se está na lista de bloqueados
        for (const pattern of IMAGE_FILTERS.blocked) {
            if (pattern.test(url)) return false;
        }
        
        // Depois verifica se está na lista de permitidos
        for (const pattern of IMAGE_FILTERS.allowed) {
            if (pattern.test(url)) return true;
        }
        
        // Se não estiver em nenhuma lista, inclui apenas no site alvo
        return isTargetSite;
    }

    // Estratégias para contornar CORS
    async function makeApiRequest(prompt) {
        // Tenta diferentes estratégias sequencialmente
        const strategies = [
            tryDirectRequest,
            tryWithModifiedHeaders,
            tryWithWorker
        ];
        
        for (const strategy of strategies) {
            try {
                const result = await strategy(prompt);
                if (result && !result.error) return result;
            } catch (error) {
                console.warn(`Falha na estratégia ${strategy.name}:`, error);
            }
        }
        
        return { error: "Não foi possível conectar à API após várias tentativas" };
    }

    // 1. Tentativa direta
    async function tryDirectRequest(prompt) {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
            }),
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    // 2. Tentativa com cabeçalhos modificados
    async function tryWithModifiedHeaders(prompt) {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Accept': 'application/json, text/plain, */*',
                'X-Requested-With': 'XMLHttpRequest',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
            }),
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    // 3. Tentativa com Web Worker
    async function tryWithWorker(prompt) {
        return new Promise((resolve) => {
            const workerCode = `
                self.onmessage = async function(e) {
                    try {
                        const response = await fetch('${GEMINI_API_URL}?key=${GEMINI_API_KEY}', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: e.data }] }],
                                generationConfig: { maxOutputTokens: 2, temperature: 0.1 }
                            })
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            postMessage({ success: true, data });
                        } else {
                            postMessage({ success: false, error: 'Erro na API: ' + response.status });
                        }
                    } catch (error) {
                        postMessage({ success: false, error: error.message });
                    }
                };
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);
            
            worker.onmessage = function(e) {
                if (e.data.success) {
                    resolve(e.data.data);
                } else {
                    resolve({ error: e.data.error });
                }
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };
            
            worker.postMessage(prompt);
        });
    }

    // Carregar a UI
    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            let isAnalyzing = false;

            function setIsAnalyzing(value) {
                isAnalyzing = value;
            }

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
                    const correctAlternative = match ? match[0].toUpperCase() : 'Erro';
                    const answerText = '';

                    return { answer: answerText, correctAlternative };
                } catch (error) {
                    console.error('Erro na API:', error);
                    return { answer: '', correctAlternative: 'Erro' };
                } finally {
                    setIsAnalyzing(false);
                }
            }

            // O restante do código da UI permanece o mesmo...
            const ui = window.createUI();
            if (!ui) return;

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = ui;

            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                if (menu) {
                    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
                }
            });

            analyzeOption.addEventListener('click', async () => {
                if (isAnalyzing) return;

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, '', 'Por favor, cole uma pergunta com alternativas.');
                    return;
                }

                setIsAnalyzing(true);
                analyzeOption.disabled = true;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">⏳</span>Analisando...';
                analyzeOption.style.opacity = '0.7';

                const content = extractPageContent();
                const { answer, correctAlternative } = await analyzeContent(content, question);

                window.showResponse(responsePanel, answer, correctAlternative);

                analyzeOption.disabled = false;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
                analyzeOption.style.opacity = '1';

                const menu = document.getElementById('gemini-menu');
                if (menu) menu.style.display = 'none';
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, setIsAnalyzing);
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
