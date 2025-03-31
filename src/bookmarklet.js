(function() {
    if (window.location.hostname !== 'saladofuturo.educacao.sp.gov.br') return;

    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743421705/ui.js';

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

                const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
                unwantedTags.forEach(tag => {
                    const elements = contentArea.querySelectorAll(tag);
                    elements.forEach(el => el.remove());
                });

                const images = Array.from(document.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http') && !src.includes('edusp-static.ip.tv/sala-do-futuro') && !src.includes('s3.sa-east-1.amazonaws.com/edusp-static.ip.tv') && !src.includes('edusp-static.ip.tv/tms'))
                    .slice(0, 50);

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
                    const response = await fetch(`${PROXY_URL}${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
                    const answerText = '';

                    return { answer: answerText, correctAlternative };
                } catch (error) {
                    console.error('Erro na API:', error);
                    return { answer: '', correctAlternative: 'Erro' };
                } finally {
                    setIsAnalyzing(false);
                }
            }

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
