(function() {
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743173090/ui.js';

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            function extractPageContent() {
                let contentArea = document.querySelector('body') || document.documentElement;
                const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
                unwantedTags.forEach(tag => {
                    contentArea.querySelectorAll(tag).forEach(el => el.remove());
                });

                const images = Array.from(document.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http'))
                    .slice(0, 5);

                const text = (contentArea.textContent || '')
                    .replace(/\s+/g, ' ')
                    .substring(0, 15000);

                return { text, images };
            }

            async function analyzeContent(content, question = '') {
                if (!question.trim()) {
                    return 'Por favor, cole uma pergunta com alternativas para analisar.';
                }

                const prompt = `Responda à seguinte pergunta com base no conteúdo da página:\n\nPergunta:\n${question}\n\nConteúdo:\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`;

                try {
                    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { maxOutputTokens: 200, temperature: 0.3 }
                        })
                    });
                    const data = await response.json();
                    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Resposta não encontrada';
                } catch (error) {
                    console.error('Erro na API:', error);
                    return 'Erro ao analisar o conteúdo';
                }
            }

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = window.createUI();

            // Toggle do menu
            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            // Ação de analisar
            analyzeOption.addEventListener('click', async () => {
                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, 'Por favor, cole uma pergunta com alternativas.');
                    return;
                }

                analyzeOption.disabled = true;
                analyzeOption.innerHTML = 'Analisando...';
                analyzeOption.style.opacity = '0.7';

                const content = extractPageContent();
                const answer = await analyzeContent(content, question);

                window.showResponse(responsePanel, answer);

                analyzeOption.disabled = false;
                analyzeOption.innerHTML = 'Analisar';
                analyzeOption.style.opacity = '1';
                document.getElementById('gemini-menu').style.display = 'none';
            });

            // Ação de limpar
            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel);
                document.getElementById('gemini-menu').style.display = 'none';
            });

            // Fechar o menu e o painel ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#gemini-helper-container')) {
                    responsePanel.style.display = 'none';
                    document.getElementById('gemini-menu').style.display = 'none';
                }
            });
        })
        .catch(error => console.error('Erro ao carregar ui.js:', error));
})();
