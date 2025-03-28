// Código principal do bookmarklet
javascript:(function() {
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // Carregar ui.js dinamicamente
    const uiScript = document.createElement('script');
    uiScript.text = `(${uiCode.toString()})`; // Substitua uiCode pelo conteúdo de ui.js
    document.head.appendChild(uiScript);

    function extractPageContent() {
        const bodyClone = document.cloneNode(true);
        const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
        unwantedTags.forEach(tag => {
            bodyClone.querySelectorAll(tag).forEach(el => el.remove());
        });

        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src.startsWith('http'))
            .slice(0, 5); // Limita a 5 imagens

        const text = bodyClone.body.textContent
            .replace(/\s+/g, ' ')
            .substring(0, 15000);

        return { text, images };
    }

    async function analyzeContent(content, question = '') {
        const prompt = question 
            ? `Analise este conteúdo e responda à pergunta: "${question}"\n\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`
            : `Resuma este conteúdo de forma direta:\n\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 150, temperature: 0.3 }
                })
            });
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Resposta não encontrada';
        } catch (error) {
            console.error('Erro na API:', error);
            return 'Erro ao analisar o conteúdo';
        }
    }

    const { actionBtn, input, responsePanel } = createUI();

    actionBtn.addEventListener('click', async () => {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Analisando...';
        actionBtn.style.opacity = '0.7';
        input.style.display = 'block';

        const content = extractPageContent();
        const question = input.value.trim();
        const answer = await analyzeContent(content, question);

        showResponse(responsePanel, answer);

        actionBtn.disabled = false;
        actionBtn.textContent = '🔍 Analisar Página';
        actionBtn.style.opacity = '1';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#gemini-helper-container')) {
            responsePanel.style.display = 'none';
            input.style.display = 'none';
        }
    });
})();

// Substitua uiCode pelo conteúdo real de ui.js ao gerar o bookmarklet
const uiCode = function() {
    // Cole o conteúdo de ui.js aqui
};
