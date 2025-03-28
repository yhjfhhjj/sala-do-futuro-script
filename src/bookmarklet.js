(function() {
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743167666/ui.js';

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

                // Capturar perguntas e alternativas
                const questions = [];
                const questionElements = document.querySelectorAll('div[class*="question"]'); // Ajuste o seletor conforme a estrutura do site
                questionElements.forEach((q, index) => {
                    const questionText = q.querySelector('p')?.textContent.trim() || `Pergunta ${index + 1}`;
                    const alternatives = Array.from(q.querySelectorAll('label'))
                        .map(label => label.textContent.trim())
                        .filter(alt => alt);
                    if (questionText && alternatives.length > 0) {
                        questions.push({
                            question: questionText,
                            alternatives: alternatives
                        });
                    }
                });

                return { text, images, questions };
            }

            async function analyzeContent(content, question = '') {
                const prompt = question.trim()
                    ? `Responda à seguinte pergunta com base no conteúdo da página:\n\nPergunta:\n${question}\n\nConteúdo:\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`
                    : `Resuma o conteúdo da página de forma clara e concisa:\n\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`;

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

            const { actionBtn, input, clearBtn, responsePanel } = window.createUI();

            // Preencher o textarea com as perguntas e alternativas capturadas
            const content = extractPageContent();
            if (content.questions && content.questions.length > 0) {
                const formattedQuestions = content.questions.map(q => {
                    return `${q.question}\n${q.alternatives.map((alt, idx) => `${String.fromCharCode(97 + idx)}) ${alt}`).join('\n')}`;
                }).join('\n\n');
                input.value = formattedQuestions;
                input.style.display = 'block';
            }

            actionBtn.addEventListener('click', async () => {
                actionBtn.disabled = true;
                actionBtn.innerHTML = '⏳ Analisando...';
                actionBtn.style.opacity = '0.7';
                input.style.display = 'block';

                const content = extractPageContent();
                const question = input.value.trim();
                const answer = await analyzeContent(content, question);

                window.showResponse(responsePanel, answer);

                actionBtn.disabled = false;
                actionBtn.innerHTML = '🔍 Analisar';
                actionBtn.style.opacity = '1';
            });

            clearBtn.addEventListener('click', () => {
                window.clearUI(input, responsePanel);
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#gemini-helper-container')) {
                    responsePanel.style.display = 'none';
                    input.style.display = 'none';
                }
            });
        })
        .catch(error => console.error('Erro ao carregar ui.js:', error));
})();
