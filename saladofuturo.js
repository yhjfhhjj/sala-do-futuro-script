// ==UserScript==
// @name         HCK V5 - Prova Paulista
// @namespace    http://tampermonkey.net/
// @version      5.7
// @description  Ferramenta de análise acadêmica assistida por IA para o site saladofuturo.educacao.sp.gov.br
// @author       Hackermoon
// @match        https://saladofuturo.educacao.sp.gov.br/*
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      edusp-static.ip.tv
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURAÇÕES PRINCIPAIS =====
    const CONFIG = {
        GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        API_KEY: 'AIzaSyBwEiziXQ79LP7IKq93pmLM8b3qnwXn6bQ',
        TIMEOUT: 15000,
        MAX_RETRIES: 3,
        TEMPERATURE: 0.5
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
        imageCache: {} // Cache para imagens em Base64
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
        // Verifica se a imagem já está no cache
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
                        STATE.imageCache[url] = base64; // Armazena no cache
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

    // ===== FUNÇÃO PARA CONSULTAR A API DO GEMINI COM GM_xmlhttpRequest =====
    async function queryGemini(prompt) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                reject(new Error('GM_xmlhttpRequest não está disponível. Certifique-se de que o Tampermonkey está instalado e ativado.'));
                return;
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CONFIG.GEMINI_API_URL}?key=${CONFIG.API_KEY}`,
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

    // ===== FUNÇÃO PARA DETECTAR MÚLTIPLAS ESCOLHAS =====
    function isMultipleChoiceQuestion(question) {
        const multipleChoiceKeywords = [
            /quais das alternativas/i,
            /escolha todas que se aplicam/i,
            /selecione as corretas/i,
            /marque todas as verdadeiras/i
        ];
        return multipleChoiceKeywords.some(regex => regex.test(question));
    }

    // ===== FUNÇÃO DE FORMATAÇÃO E ANÁLISE =====
    function detectAlternativesFormat(input) {
        const alternativesPattern = /[A-E]\)\s*[^A-E\)]+/g;
        const matches = input.match(alternativesPattern);
        return matches ? matches : null;
    }

    function formatResponse(answer, alternatives) {
        if (!alternatives) {
            return answer;
        }

        // Se a resposta já estiver no formato "A) Texto", retorna diretamente
        if (/^[A-E]\)\s*.+/.test(answer)) {
            return answer;
        }

        // Se a resposta for apenas o valor (ex.: "20" ou "Sim"), encontra a alternativa correspondente
        const matchedAlternatives = alternatives.filter(alt => {
            const value = alt.split(')')[1].trim();
            return value === answer || parseFloat(value) === parseFloat(answer);
        });

        // Retorna todas as alternativas correspondentes (para múltiplas escolhas)
        return matchedAlternatives.length > 0 ? matchedAlternatives.join(', ') : 'Resposta inválida';
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

        // Determina se a questão pode ter múltiplas escolhas
        const isMultipleChoice = isMultipleChoiceQuestion(question);

        return {
            contents: [{
                parts: [{
                    text: `
                        Você é um assistente especializado em resolver questões de provas acadêmicas, com foco em precisão lógica e matemática. Analise a questão abaixo e retorne apenas a alternativa correta no formato "A) Texto". Se a questão permitir múltiplas escolhas (ex.: "Quais das alternativas são verdadeiras?"), retorne todas as alternativas corretas separadas por vírgula (ex.: "A) Sim, C) Não"). Não inclua explicações ou texto adicional, apenas a resposta no formato especificado.

                        Questão: ${question}

                        ${imageUrls.length ? 'Imagens relacionadas: ' + imageUrls.join(', ') : ''}
                    `
                }, ...imageParts]
            }],
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                maxOutputTokens: 50 // Reduzido para respostas mais curtas e precisas
            }
        };
    }

    // ===== FUNÇÃO PARA CRIAR A INTERFACE =====
    function setupUI() {
        // Adiciona a fonte Inter do Google Fonts
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        // Estilo da interface (nova coloração e compactação)
        const estilo = {
            cores: {
                principal: '#60A5FA', // Azul claro para o botão "HCK V5"
                textoPrincipal: '#1E3A8A', // Azul escuro para texto do botão "HCK V5"
                fundo: '#1E3A8A', // Azul escuro para o fundo do menu
                texto: '#FFFFFF', // Branco para textos
                border: '#60A5FA', // Azul claro para bordas
                erro: '#EF4444', // Vermelho para erros
                analisar: '#1E3A8A', // Azul escuro para botões
                limpar: '#1E3A8A',
                atualizar: '#1E3A8A',
                copiar: '#FFFFFF'
            }
        };

        const container = document.createElement('div');
        container.id = 'hck-v5-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 12px;
            right: 12px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'HCK V5';
        toggleBtn.style.cssText = `
            background: ${estilo.cores.principal};
            color: ${estilo.cores.textoPrincipal};
            padding: 4px 8px;
            border: 1px solid ${estilo.cores.border};
            border-radius: 16px;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const menu = document.createElement('div');
        menu.style.cssText = `
            background: ${estilo.cores.fundo};
            width: 220px;
            padding: 6px;
            margin-top: 4px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: none;
            border: 1px solid ${estilo.cores.border};
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        `;

        const input = document.createElement('textarea');
        input.placeholder = 'Cole sua pergunta aqui...';
        input.style.cssText = `
            width: 100%;
            height: 40px;
            padding: 6px;
            margin-bottom: 4px;
            border: 1px solid ${estilo.cores.border};
            border-radius: 8px;
            resize: none;
            font-size: 12px;
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
            background: ${estilo.cores.fundo};
            color: ${estilo.cores.texto};
        `;

        const imagesContainer = document.createElement('div');
        imagesContainer.style.cssText = `
            max-height: 60px;
            overflow-y: auto;
            margin-bottom: 4px;
            font-size: 12px;
            border: 1px solid ${estilo.cores.border};
            border-radius: 8px;
            padding: 4px;
            background: ${estilo.cores.fundo};
            color: ${estilo.cores.texto};
        `;

        const analyzeBtn = document.createElement('button');
        analyzeBtn.textContent = '🔍 Analisar';
        analyzeBtn.style.cssText = `
            width: 100%;
            padding: 4px;
            background: ${estilo.cores.analisar};
            color: ${estilo.cores.texto};
            border: 1px solid ${estilo.cores.border};
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ Limpar';
        clearBtn.style.cssText = `
            width: 100%;
            padding: 4px;
            background: ${estilo.cores.limpar};
            color: ${estilo.cores.texto};
            border: 1px solid ${estilo.cores.border};
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const updateImagesBtn = document.createElement('button');
        updateImagesBtn.textContent = '🔄 Atualizar Imagens';
        updateImagesBtn.style.cssText = `
            width: 100%;
            padding: 4px;
            background: ${estilo.cores.atualizar};
            color: ${estilo.cores.texto};
            border: 1px solid ${estilo.cores.border};
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const responsePanel = document.createElement('div');
        responsePanel.style.cssText = `
            padding: 4px;
            background: ${estilo.cores.fundo};
            border-radius: 8px;
            display: none;
            font-size: 12px;
            border-left: 2px solid ${estilo.cores.border};
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

        menu.append(input, imagesContainer, analyzeBtn, clearBtn, updateImagesBtn, responsePanel, credits);
        container.append(toggleBtn, menu);
        document.body.append(container);

        toggleBtn.addEventListener('click', () => {
            if (menu.style.display === 'block') {
                menu.style.opacity = '0';
                menu.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    menu.style.display = 'none';
                }, 300);
            } else {
                menu.style.display = 'block';
                setTimeout(() => {
                    menu.style.opacity = '1';
                    menu.style.transform = 'translateY(0)';
                }, 10);
            }
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
                                style="background: ${estilo.cores.fundo}; color: ${estilo.cores.copiar}; border: 1px solid ${estilo.cores.border}; border-radius: 6px; padding: 2px 4px; font-size: 10px; cursor: pointer;">
                            Copiar URL
                        </button>
                    </div>
                `).join('') : 
                `<div style="color: ${estilo.cores.texto}; text-align: center; padding: 4px;">Nenhuma imagem</div>`;
        };

        const showResponse = (panel, text) => {
            panel.innerHTML = text;
            panel.style.display = 'block';
            panel.style.borderLeftColor = text.includes('Erro') ? estilo.cores.erro : estilo.cores.border;
        };

        return { createUI, updateImageButtons, showResponse };
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        // Configura a interface
        const { createUI, updateImageButtons, showResponse } = setupUI();

        // Inicializa a interface
        const { input, analyzeOption, clearOption, updateImagesOption, responsePanel, imagesContainer } = createUI();

        // Configura os eventos dos botões
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
                const alternatives = detectAlternativesFormat(input.value.trim());
                if (!alternatives) {
                    throw new Error('Nenhuma alternativa detectada. Inclua as alternativas no formato "A) Texto".');
                }

                const prompt = await buildPrompt(input.value.trim(), images);
                const answer = await fetchWithRetry(() => queryGemini(prompt));

                // Validação adicional: verifica se a resposta corresponde a uma alternativa
                const formattedAnswer = formatResponse(answer, alternatives);
                if (formattedAnswer === 'Resposta inválida') {
                    throw new Error('A resposta não corresponde a nenhuma alternativa fornecida.');
                }

                showResponse(responsePanel, formattedAnswer);
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

        // Inicializa as imagens
        extractImages();
        updateImageButtons(STATE.images);
    }

    // Executa a inicialização
    init();
})();