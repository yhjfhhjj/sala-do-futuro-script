// ==UserScript==
// @name         HCK V5 - Prova Paulista
// @namespace    http://tampermonkey.net/
// @version      5.7.3
// @description  Ferramenta de análise acadêmica assistida por IA para o site saladofuturo.educacao.sp.gov.br
// @author       Hackermoon
// @match        https://saladofuturo.educacao.sp.gov.br/*
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      edusp-static.ip.tv
// @connect      api.outscraper.com
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        OUTSCRAPER_API_URL: 'https://api.outscraper.com/v1/google-search',
        API_KEY_GEMINI: 'AIzaSyBwEiziXQ79LP7IKq93pmLM8b3qnwXn6bQ',
        API_KEY_OUTSCRAPER: 'YOUR_OUTSCRAPER_API_KEY', // Substitua pela sua chave da API Outscraper
        TIMEOUT: 15000,
        MAX_RETRIES: 3,
        TEMPERATURE: 0.3
    };

    // ===== FILTROS DE IMAGEM =====
    const IMAGE_FILTERS = {
        blocked: [
            /edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i,
            /conteudo_logo\.png$/i,
            /\/icons?\//i,
            /\/logos?\//i,
            /\/buttons?\//i,
            /\/assets\//i,
            /\/banners?\//i,
            /_thumb(?:nail)?\./i
        ],
        allowed: [
            /edusp-static\.ip\.tv\/tms\//i,
            /edusp-static\.ip\.tv\/tarefas\//i,
            /edusp-static\.ip\.tv\/exercicios\//i,
            /\/atividade\/\d+\?eExame=true/i,
            /\.(jpg|png|jpeg|gif|webp)$/i,
            /lh[0-9]-[a-z]+\.googleusercontent\.com/i,
            /\/media\//i,
            /\/questao_\d+/i
        ],
        verify(src) {
            if (!src || !src.startsWith('http')) return false;
            return !this.blocked.some(r => r.test(src)) && 
                   this.allowed.some(r => r.test(src));
        }
    };

    // ===== ESTADO GLOBAL =====
    const STATE = {
        isAnalyzing: false,
        images: [],
        imageCache: {}
    };

    // ===== UTILITÁRIOS =====
    const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

    async function fetchWithRetry(callback, retries = CONFIG.MAX_RETRIES) {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await withTimeout(callback(), CONFIG.TIMEOUT);
                return response;
            } catch (error) {
                console.error(`Tentativa ${i + 1} falhou: ${error.message}`);
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // ===== FUNÇÃO PARA BAIXAR IMAGEM E CONVERTER PARA BASE64 =====
    async function fetchImageAsBase64(url) {
        if (STATE.imageCache[url]) {
            return STATE.imageCache[url];
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: function(response) {
                    try {
                        const arrayBuffer = response.response;
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.length; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = window.btoa(binary);
                        STATE.imageCache[url] = base64;
                        resolve(base64);
                    } catch (error) {
                        reject(new Error(`Erro ao converter imagem para Base64: ${error.message}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error(`Erro ao baixar imagem: ${error.statusText || 'Desconhecido'}`));
                },
                ontimeout: function() {
                    reject(new Error('Requisição de imagem expirou'));
                }
            });
        });
    }

    // ===== FUNÇÃO PARA CONSULTAR A API DO GEMINI =====
    async function queryGemini(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CONFIG.GEMINI_API_URL}?key=${CONFIG.API_KEY_GEMINI}`,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 HCK-V5/1.0'
                },
                data: JSON.stringify(prompt),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.error) {
                            reject(new Error(`Erro da API do Gemini: ${data.error.message}`));
                            return;
                        }
                        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
                        resolve(answer);
                    } catch (error) {
                        reject(new Error('Erro ao parsear resposta: ' + error.message));
                    }
                },
                onerror: function(error) {
                    reject(new Error('Erro na requisição: ' + (error.statusText || 'Desconhecido')));
                },
                ontimeout: function() {
                    reject(new Error('Requisição expirou'));
                }
            });
        });
    }

    // ===== FUNÇÃO PARA CONSULTAR A API DO OUTSCRAPER (BUSCA NA WEB) =====
    async function searchWeb(query) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.OUTSCRAPER_API_URL}?query=${encodeURIComponent(query)}&apiKey=${CONFIG.API_KEY_OUTSCRAPER}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.error) {
                            reject(new Error(`Erro da API Outscraper: ${data.error.message}`));
                            return;
                        }
                        resolve(data.results || []);
                    } catch (error) {
                        reject(new Error('Erro ao parsear resposta da busca: ' + error.message));
                    }
                },
                onerror: function(error) {
                    reject(new Error('Erro na requisição de busca: ' + (error.statusText || 'Desconhecido')));
                },
                ontimeout: function() {
                    reject(new Error('Requisição de busca expirou'));
                }
            });
        });
    }

    // ===== FUNÇÃO DE FORMATAÇÃO E ANÁLISE =====
    function formatResponse(answer) {
        return answer.trim();
    }

    // ===== FUNÇÃO PARA EXTRair IMAGENS =====
    function extractImages() {
        STATE.images = [...document.querySelectorAll('img, [data-image]')]
            .map(el => el.src || el.getAttribute('data-image'))
            .filter(src => IMAGE_FILTERS.verify(src))
            .slice(0, 10);
        return STATE.images;
    }

    // ===== FUNÇÃO PARA CRIAR O PROMPT =====
    async function buildPrompt(question, imageUrls) {
        const imageParts = [];
        for (const url of imageUrls) {
            try {
                const base64Data = await fetchImageAsBase64(url);
                imageParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Data
                    }
                });
            } catch (error) {
                console.error(`Erro ao processar imagem ${url}: ${error.message}`);
            }
        }

        return {
            contents: [{
                parts: [{
                    text: `
                        Você é um assistente especializado em resolver questões de provas acadêmicas, com foco em precisão lógica e matemática. Analise a questão abaixo e retorne apenas a resposta direta (ex.: "20" ou "Sim"). Não inclua explicações ou texto adicional, apenas a resposta.

                        Exemplos:
                        - Questão: "Qual a capital do Brasil?" → Resposta: "Brasília"
                        - Questão: "Quanto é 2 + 2?" → Resposta: "4"
                        - Questão: "Probabilidade de dois dados: Dado 1 (1 face azul, 5 vermelhas), Dado 2 (2 faces azuis, 4 vermelhas). Quais dados devem ser usados?" → Resposta: "Dado 1 e dado 2"

                        Questão: ${question}

                        ${imageUrls.length ? 'Imagens relacionadas: ' + imageUrls.join(', ') : ''}
                    `
                }, ...imageParts]
            }],
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                maxOutputTokens: 50
            }
        };
    }

    // ===== FUNÇÃO PARA CRIAR A INTERFACE =====
    function setupUI() {
        console.log('Iniciando setupUI...');

        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
        console.log('Fonte Inter adicionada ao head.');

        const estilo = {
            cores: {
                principal: '#000000',
                textoPrincipal: 'linear-gradient(to right, #FF6F61, #D946EF)',
                fundo: '#2A2A2A',
                texto: '#FFFFFF',
                border: 'transparent',
                erro: '#EF4444',
                botaoGradiente: 'linear-gradient(to right, #FF6F61, #D946EF)',
                copiar: '#FFFFFF'
            }
        };

        const getResponsiveSize = () => {
            const width = window.innerWidth;
            return {
                menuWidth: width < 768 ? '160px' : '160px',
                fontSize: width < 768 ? '13px' : '13px',
                buttonPadding: '6px',
                textareaHeight: '40px'
            };
        };

        const container = document.createElement('div');
        container.id = 'hck-v5-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 12px;
            right: 12px;
            z-index: 10000; /* Aumentado para garantir visibilidade */
            font-family: 'Inter', sans-serif;
        `;
        console.log('Container criado e adicionado ao body.');

        const sizes = getResponsiveSize();
        const menu = document.createElement('div');
        menu.id = 'hck-menu';
        menu.style.cssText = `
            background: ${estilo.cores.fundo};
            width: ${sizes.menuWidth};
            padding: 6px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: block; /* Alterado para block para aparecer inicialmente */
            border: 1px solid ${estilo.cores.border};
            opacity: 1; /* Alterado para 1 para aparecer inicialmente */
            transform: translateY(0);
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        `;
        console.log('Menu criado com display: block e opacity: 1.');

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'HCK';
        toggleBtn.style.cssText = `
            background: ${estilo.cores.principal};
            color: transparent;
            background-clip: text;
            -webkit-background-clip: text;
            background-image: ${estilo.cores.textoPrincipal};
            padding: 4px 8px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: none;
            display: block;
            margin: 0 auto 4px auto;
            text-align: center;
        `;
        console.log('Botão HCK criado.');

        const input = document.createElement('textarea');
        input.placeholder = 'Cole sua pergunta aqui...';
        input.style.cssText = `
            width: 100%;
            height: ${sizes.textareaHeight};
            padding: 6px;
            margin-bottom: 4px;
            border: 1px solid ${estilo.cores.border};
            border-radius: 8px;
            resize: none;
            font-size: ${sizes.fontSize};
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
            background: #3A3A3A;
            color: ${estilo.cores.texto};
        `;

        const imagesContainer = document.createElement('div');
        imagesContainer.style.cssText = `
            max-height: 60px;
            overflow-y: auto;
            margin-bottom: 4px;
            font-size: ${sizes.fontSize};
            border: 1px solid ${estilo.cores.border};
            border-radius: 8px;
            padding: 4px;
            background: ${estilo.cores.fundo};
            color: ${estilo.cores.texto};
        `;

        const updateImagesBtn = document.createElement('button');
        updateImagesBtn.textContent = '🔄 Atualizar Imagens';
        updateImagesBtn.style.cssText = `
            width: 100%;
            padding: ${sizes.buttonPadding};
            background: ${estilo.cores.botaoGradiente};
            color: ${estilo.cores.texto};
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: ${sizes.fontSize};
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const analyzeBtn = document.createElement('button');
        analyzeBtn.textContent = '🔍 Analisar';
        analyzeBtn.style.cssText = `
            width: 100%;
            padding: ${sizes.buttonPadding};
            background: ${estilo.cores.botaoGradiente};
            color: ${estilo.cores.texto};
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: ${sizes.fontSize};
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ Limpar';
        clearBtn.style.cssText = `
            width: 100%;
            padding: ${sizes.buttonPadding};
            background: ${estilo.cores.botaoGradiente};
            color: ${estilo.cores.texto};
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: ${sizes.fontSize};
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const responsePanel = document.createElement('div');
        responsePanel.style.cssText = `
            padding: 4px;
            background: ${estilo.cores.fundo};
            border-radius: 8px;
            display: none;
            font-size: ${sizes.fontSize};
            border-left: 2px solid ${estilo.cores.botaoGradiente};
            word-wrap: break-word;
            margin-bottom: 4px;
            color: ${estilo.cores.texto};
        `;

        const credits = document.createElement('div');
        credits.textContent = 'Desenvolvido por Hackermoon';
        credits.style.cssText = `
            text-align: center;
            font-size: 10px;
            color: ${estilo.cores.texto};
            margin-top: 2px;
        `;

        menu.append(toggleBtn, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, responsePanel, credits);
        container.append(menu);
        document.body.appendChild(container);
        console.log('Menu e seus elementos adicionados ao container e ao body.');

        toggleBtn.addEventListener('click', () => {
            console.log('Botão HCK clicado.');
            if (menu.style.display === 'block') {
                console.log('Escondendo menu...');
                menu.style.opacity = '0';
                menu.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    menu.style.display = 'none';
                    console.log('Menu escondido.');
                }, 300);
            } else {
                console.log('Exibindo menu...');
                menu.style.display = 'block';
                setTimeout(() => {
                    menu.style.opacity = '1';
                    menu.style.transform = 'translateY(0)';
                    console.log('Menu exibido.');
                }, 10);
            }
        });

        window.addEventListener('resize', () => {
            console.log('Evento de resize disparado.');
            const newSizes = getResponsiveSize();
            menu.style.width = newSizes.menuWidth;
            input.style.height = newSizes.textareaHeight;
            input.style.fontSize = newSizes.fontSize;
            analyzeBtn.style.fontSize = newSizes.fontSize;
            analyzeBtn.style.padding = newSizes.buttonPadding;
            clearBtn.style.fontSize = newSizes.fontSize;
            clearBtn.style.padding = newSizes.buttonPadding;
            updateImagesBtn.style.fontSize = newSizes.fontSize;
            updateImagesBtn.style.padding = newSizes.buttonPadding;
            imagesContainer.style.fontSize = newSizes.fontSize;
            responsePanel.style.fontSize = newSizes.fontSize;
        });

        const createUI = () => ({
            input,
            analyzeOption: analyzeBtn,
            clearOption: clearBtn,
            updateImagesOption: updateImagesBtn,
            responsePanel,
            imagesContainer
        });

        const updateImageButtons = (images) => {
            imagesContainer.innerHTML = images.length ? 
                images.map((img, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.border};">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;" title="${img}">Imagem ${i+1}</span>
                        <button onclick="navigator.clipboard.writeText('${img}')" 
                                style="background: ${estilo.cores.botaoGradiente}; color: ${estilo.cores.copiar}; border: none; border-radius: 6px; padding: 2px 4px; font-size: 10px; cursor: pointer;">
                            Copiar URL
                        </button>
                    </div>
                `).join('') : 
                `<div style="color: ${estilo.cores.texto}; text-align: center; padding: 4px;">Nenhuma imagem</div>`;
        };

        const showResponse = (panel, text) => {
            panel.innerHTML = text;
            panel.style.display = 'block';
            panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.botaoGradiente;
        };

        return { createUI, updateImageButtons, showResponse };
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        console.log('Iniciando script HCK V5...');
        try {
            const { createUI, updateImageButtons, showResponse } = setupUI();
            console.log('UI configurada com sucesso.');

            const { input, analyzeOption, clearOption, updateImagesOption, responsePanel, imagesContainer } = createUI();
            console.log('Elementos da UI criados.');

            analyzeOption.onclick = async () => {
                if (STATE.isAnalyzing || !input.value.trim()) {
                    showResponse(responsePanel, 'Digite uma questão válida!');
                    return;
                }

                STATE.isAnalyzing = true;
                analyzeOption.disabled = true;
                analyzeOption.textContent = '🔍 Analisando...';

                try {
                    const images = extractImages();
                    const question = input.value.trim();

                    const prompt = await buildPrompt(question, images);
                    const geminiAnswer = await fetchWithRetry(() => queryGemini(prompt));
                    const formattedAnswer = formatResponse(geminiAnswer);

                    const searchResults = await fetchWithRetry(() => searchWeb(question));
                    const webValidation = searchResults.some(result => 
                        result.snippet && result.snippet.toLowerCase().includes(formattedAnswer.toLowerCase())
                    );

                    const finalAnswer = webValidation 
                        ? `${formattedAnswer} (validado pela busca na web)`
                        : `${formattedAnswer} (não validado pela busca na web)`;

                    showResponse(responsePanel, finalAnswer);
                } catch (error) {
                    showResponse(responsePanel, `Erro: ${error.message}`);
                } finally {
                    STATE.isAnalyzing = false;
                    analyzeOption.disabled = false;
                    analyzeOption.textContent = '🔍 Analisar';
                }
            };

            clearOption.onclick = () => {
                input.value = '';
                imagesContainer.innerHTML = '<div style="color: #FFFFFF; text-align: center; padding: 4px;">Nenhuma imagem</div>';
                responsePanel.style.display = 'none';
            };

            updateImagesOption.onclick = () => {
                extractImages();
                updateImageButtons(STATE.images);
                showResponse(responsePanel, `${STATE.images.length} imagens atualizadas`);
            };

            extractImages();
            updateImageButtons(STATE.images);
            console.log('Imagens extraídas e botões atualizados.');
        } catch (error) {
            console.error('Erro na inicialização do script:', error);
        }
    }

    // Executa a inicialização
    init();
})();
