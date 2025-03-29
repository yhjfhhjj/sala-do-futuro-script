(function() {
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743195819/ui.js';

    // Função para aplicar o tema escuro no Sala do Futuro
    function applyDarkTheme() {
        // Verifica se o site atual é o Sala do Futuro
        if (window.location.hostname === 'saladofuturo.educacao.sp.gov.br') {
            // Cria um elemento <style> para injetar o CSS
            const style = document.createElement('style');
            style.id = 'dark-theme-style';
            style.textContent = `
                /* Fundo principal */
                body, html {
                    background-color: #1C2526 !important;
                    color: #E0E0E0 !important;
                }

                /* Menu lateral */
                [class*="sidebar"], [class*="menu"], [class*="nav"], nav {
                    background-color: #1C2526 !important;
                    color: #E0E0E0 !important;
                    border-right: 1px solid #D946EF !important;
                }

                /* Itens do menu lateral */
                [class*="sidebar"] a, [class*="menu"] a, [class*="nav"] a, nav a {
                    color: #E0E0E0 !important;
                    transition: background 0.3s ease !important;
                }
                [class*="sidebar"] a:hover, [class*="menu"] a:hover, [class*="nav"] a:hover, nav a:hover {
                    background-color: #2A3435 !important;
                    color: #FF6F61 !important;
                }

                /* Cabeçalho */
                header, .header, [class*="header"] {
                    background-color: #2A3435 !important;
                    color: #E0E0E0 !important;
                    border-bottom: 1px solid #D946EF !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                }

                /* Botão de notificação (ícone de sino) */
                [class*="bell"], [class*="notification"], [class*="alert"] {
                    background: linear-gradient(90deg, #FF6F61, #D946EF) !important;
                    color: #FFFFFF !important;
                    border-radius: 50% !important;
                    padding: 8px !important;
                }

                /* Caixas de conteúdo (como "Nenhuma Tarefa encontrada") */
                .container, .content, .question, .card, [class*="container"], [class*="content"], [class*="question"], [class*="card"] {
                    background-color: #1C2526 !important;
                    color: #E0E0E0 !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                    border-radius: 8px !important;
                }

                /* Texto dentro das caixas */
                p, span, div, h1, h2, h3, h4, h5, h6, label {
                    color: #E0E0E0 !important;
                }

                /* Dropdowns (Turmas, Status, Componente) */
                select, [class*="select"], [class*="dropdown"] {
                    background-color: #2A3435 !important;
                    color: #E0E0E0 !important;
                    border: 1px solid #D946EF !important;
                    border-radius: 8px !important;
                    padding: 8px !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: url('data:image/svg+xml;utf8,<svg fill="%23D946EF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') !important;
                    background-repeat: no-repeat !important;
                    background-position: right 8px center !important;
                }

                /* Opções dentro do dropdown */
                option {
                    background-color: #2A3435 !important;
                    color: #E0E0E0 !important;
                }

                /* Alternativas (botões de rádio) */
                input[type="radio"] + label, .option, [class*="option"] {
                    background-color: #1C2526 !important;
                    color: #E0E0E0 !important;
                    border: 1px solid #D946EF !important;
                    border-radius: 8px !important;
                    padding: 8px !important;
                    transition: background 0.3s ease !important;
                }

                input[type="radio"]:checked + label, .option:hover, [class*="option"]:hover {
                    background: linear-gradient(90deg, #FF6F61, #D946EF) !important;
                    color: #FFFFFF !important;
                }

                /* Botões */
                button, .btn, [class*="btn"], input[type="submit"], input[type="button"] {
                    background: linear-gradient(90deg, #FF6F61, #D946EF) !important;
                    color: #FFFFFF !important;
                    border: none !important;
                    border-radius: 8px !important;
                    padding: 8px 16px !important;
                    transition: transform 0.2s ease, box-shadow 0.3s ease !important;
                }

                button:hover, .btn:hover, [class*="btn"]:hover, input[type="submit"]:hover, input[type="button"]:hover {
                    transform: scale(1.02) !important;
                    box-shadow: 0 2px 8px rgba(217, 70, 239, 0.5) !important;
                }

                /* Links */
                a, a:visited, a:hover, a:active {
                    color: #FF6F61 !important;
                }

                /* Inputs e selects */
                input, select, textarea {
                    background-color: #2A3435 !important;
                    color: #E0E0E0 !important;
                    border: 1px solid #D946EF !important;
                    border-radius: 8px !important;
                }

                /* Rodapé */
                footer, .footer, [class*="footer"] {
                    background-color: #2A3435 !important;
                    color: #E0E0E0 !important;
                    border-top: 1px solid #D946EF !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            // Aplica o tema escuro ao carregar o bookmarklet
            applyDarkTheme();

            let isAnalyzing = false; // Controle para evitar múltiplas análises

            function setIsAnalyzing(value) {
                isAnalyzing = value;
            }

            function extractPageContent() {
                const contentArea = document.querySelector('body') || document.documentElement;
                const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
                unwantedTags.forEach(tag => contentArea.querySelectorAll(tag).forEach(el => el.remove()));

                const images = Array.from(document.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http'))
                    .slice(0, 5);

                const text = (contentArea.textContent || '').replace(/\s+/g, ' ').substring(0, 15000);
                return { text, images };
            }

            async function analyzeContent(content, question) {
                if (!question.trim()) return { answer: 'Por favor, cole uma pergunta com alternativas.', correctAlternative: '' };

                const prompt = `Responda à seguinte pergunta com base no conteúdo da página e indique a alternativa correta (ex.: "A resposta correta é: B").\n\nPergunta:\n${question}\n\nConteúdo:\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}\n\nResposta:`;

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
                    const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Resposta não encontrada';

                    // Extrair a alternativa correta
                    const match = fullAnswer.match(/A resposta correta é: ([A-E])/i);
                    const correctAlternative = match ? match[1] : 'Não identificada';
                    const answerText = fullAnswer.replace(/A resposta correta é: [A-E]/i, '').trim();

                    return { answer: answerText, correctAlternative };
                } catch (error) {
                    console.error('Erro na API:', error);
                    return { answer: 'Erro ao analisar o conteúdo', correctAlternative: '' };
                } finally {
                    setIsAnalyzing(false); // Garante que o estado seja resetado mesmo em caso de erro
                }
            }

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = window.createUI();

            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            analyzeOption.addEventListener('click', async () => {
                if (isAnalyzing) return; // Impede múltiplas análises

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, 'Por favor, cole uma pergunta com alternativas.', '');
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
                document.getElementById('gemini-menu').style.display = 'none';
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, setIsAnalyzing);
                document.getElementById('gemini-menu').style.display = 'none';
            });

            document.addEventListener('click', e => {
                if (!e.target.closest('#gemini-helper-container') && !e.target.closest('#gemini-response-panel')) {
                    document.getElementById('gemini-menu').style.display = 'none';
                }
            });
        })
        .catch(error => console.error('Erro ao carregar ui.js:', error));
})();
