javascript:(function() {
    'use strict';

    if (document.getElementById('hck-ui-bookmarklet')) {
        console.warn('[HCK Bookmarklet] Já está em execução.');
        try {
            document.getElementById('hck-toggle-btn')?.focus();
        } catch(e) {}
        return;
    }

    console.log('[HCK Bookmarklet] Iniciando...');

    // --- VERSÃO ATUALIZADA ---
    const SCRIPT_VERSION = '8.0.1-alpha';
    const CONFIG = {
        GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
        MODELS: [
            { name: 'Pro 1.5', id: 'gemini-1.5-pro-latest' },
            { name: 'Flash 1.5', id: 'gemini-1.5-flash-latest' }
        ],
        API_KEYS_GEMINI: [
            // 002
            'AIzaSyBDdSZkgQphf5BORTDLcEUbJWcIAIo0Yr8', // 001
            'AIzaSyANp5yxdrdGL7RtOXy0LdIdkoKZ7cVPIsc'  // 003
        ],
        TIMEOUT: 28000,
        MAX_RETRIES: 2,
        API_RETRY_DELAY_BASE: 1500,
        API_RATE_LIMIT_DELAY_MULTIPLIER: 4,
        TEMPERATURE: 0.35,
        TOP_P: 0.9,
        MAX_OUTPUT_TOKENS: 10,
        NOTIFICATION_TIMEOUT: 5000,
        NOTIFICATION_TIMEOUT_LONG: 8000,
        SAFETY_SETTINGS_THRESHOLD: "BLOCK_MEDIUM_AND_ABOVE"
    };

    const IMAGE_FILTERS = {
        blocked: [
            // Regras gerais para pastas comuns de assets
            /edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i,
            /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i,
            // Logos específicos e padrões comuns a serem bloqueados
            /conteudo_logo\.png$/i,
            // --- REGRA ADICIONADA PARA BLOQUEAR O LOGO ESPECÍFICO ---
            /logo_sala_do_futuro\.png$/i,
            // Thumbnails e SVGs
            /_thumb(?:nail)?\./i,
            /\.svg$/i
        ],
        allowed: [
            // Padrões comuns para imagens de questões
            /edusp-static\.ip\.tv\/(?:tms|tarefas|exercicios)\//i,
            /\/atividade\/\d+\?eExame=true/i,
            /\.(?:jpg|png|jpeg|gif|webp)$/i,
            /lh[0-9]+(?:- G*)*\.googleusercontent\.com/i, // Imagens do Google Drive/Classroom
            /\/media\//i, // Pastas de mídia genéricas
            /\/questao_\d+/i, // Padrão de nome de arquivo de questão
            /image\?/i // URLs que terminam com 'image?' (comum em alguns sistemas)
        ],
        verify(src) {
            if (!src || typeof src !== 'string' || !src.startsWith('http')) return false;
            // Verifica se está na lista de bloqueados PRIMEIRO
            if (this.blocked.some(r => r.test(src))) {
                logMessage('DEBUG', `Image blocked by filter: ${src.substring(0,80)}...`);
                return false;
            }
            // Se não bloqueado, verifica se está na lista de permitidos
            if (this.allowed.some(r => r.test(src))) {
                 logMessage('DEBUG', `Image allowed by filter: ${src.substring(0,80)}...`);
                return true;
            }
            // Se não está em nenhuma das listas (ou não explicitamente permitido), bloqueia por padrão
            logMessage('DEBUG', `Image implicitly blocked (not in allow list): ${src.substring(0,80)}...`);
            return false;
        }
    };


    const STATE = {
        isAnalyzing: false,
        images: [],
        imageCache: {},
        logMessages: [],
        logModal: null,
        notificationContainer: null,
        currentApiKeyIndex: 0,
        rateLimitActive: false,
        rateLimitTimeoutId: null
    };

    const logMessage = (level, ...args) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const message = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); } catch { return '[Object]'; } }).join(' ');
        STATE.logMessages.push({ timestamp, level, message });
        if (STATE.logMessages.length > 300) { STATE.logMessages.shift(); }
        const consoleArgs = [`[HCK ${timestamp}]`, ...args];
        switch(level) {
            case 'ERROR': console.error(...consoleArgs); break;
            case 'WARN': console.warn(...consoleArgs); break;
            case 'INFO': console.info(...consoleArgs); break;
            default: console.log(...consoleArgs);
        }
    };

    const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms))
    ]);

    async function fetchWithRetry(modelName, callback, retries = CONFIG.MAX_RETRIES) {
        logMessage('DEBUG', `[${modelName}] Iniciando fetch/retry (Máx ${retries} tentativas)`);
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (STATE.rateLimitActive && attempt === 0) {
                    const initialRateLimitDelay = 1000;
                    logMessage('WARN', `[${modelName}] Rate limit global ativo, delay inicial: ${initialRateLimitDelay}ms`);
                    await new Promise(r => setTimeout(r, initialRateLimitDelay));
                }
                return await withTimeout(callback(), CONFIG.TIMEOUT);
            } catch (error) {
                logMessage('ERROR', `[${modelName}] Tentativa ${attempt + 1}/${retries + 1} falhou: ${error.message}`);
                const isCorsError = error instanceof TypeError && error.message.toLowerCase().includes('fetch');
                const isTimeoutError = error.message.toLowerCase().includes('timeout');

                if (isCorsError || isTimeoutError || attempt === retries) {
                     if (isCorsError) logMessage('ERROR', `[${modelName}] Falha de Rede/CORS. Não é possível continuar esta requisição.`);
                     else if (isTimeoutError) logMessage('ERROR', `[${modelName}] Timeout atingido.`);
                     else logMessage('ERROR', `[${modelName}] Máximo de tentativas atingido. Falhando requisição.`);
                    throw error;
                }

                let delay;
                const isRateLimitError = error.message.includes('429') || error.message.toLowerCase().includes('rate limit');
                if (isRateLimitError) {
                    if (!STATE.rateLimitActive) {
                         logMessage('WARN', `[${modelName}] Rate limit (429) detectado! Ativando backoff global.`);
                         STATE.rateLimitActive = true;
                         if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId);
                         STATE.rateLimitTimeoutId = setTimeout(() => {
                             logMessage('INFO', 'Backoff global de rate limit desativado.');
                             STATE.rateLimitActive = false;
                             STATE.rateLimitTimeoutId = null;
                             if (!STATE.isAnalyzing && document.getElementById('hck-analyze-btn')) {
                                 const btn = document.getElementById('hck-analyze-btn');
                                 btn.disabled = false;
                                 btn.textContent = `Analisar Questão`;
                                 btn.style.backgroundColor = '#007AFF';
                                 document.getElementById('hck-toggle-btn')?.style.setProperty('border-color', '#38383A');
                             }
                         }, 30000);
                     }
                    delay = CONFIG.API_RETRY_DELAY_BASE * CONFIG.API_RATE_LIMIT_DELAY_MULTIPLIER * (attempt + 1);
                    logMessage('WARN', `[${modelName}] Rate limit. Aplicando backoff maior: ${delay}ms`);
                } else {
                    delay = CONFIG.API_RETRY_DELAY_BASE * (attempt + 1);
                    logMessage('INFO', `[${modelName}] Aplicando backoff padrão: ${delay}ms`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
         throw new Error(`[${modelName}] FetchWithRetry falhou após ${retries + 1} tentativas.`);
    }

    function getNextApiKey() {
        if (!CONFIG.API_KEYS_GEMINI || CONFIG.API_KEYS_GEMINI.length === 0 || !CONFIG.API_KEYS_GEMINI[0]) {
             const msg = 'CRÍTICO: Nenhuma chave de API configurada! Impossível contatar a API.';
             logMessage('ERROR', msg);
             throw new Error('Nenhuma chave de API disponível');
        }
        if (CONFIG.API_KEYS_GEMINI.length === 1) {
            logMessage('WARN', 'Apenas uma chave de API configurada. Rotação inativa.');
        }
        const key = CONFIG.API_KEYS_GEMINI[STATE.currentApiKeyIndex];
        const keyIdentifier = `Chave #${STATE.currentApiKeyIndex + 1}/${CONFIG.API_KEYS_GEMINI.length} (...${key.slice(-4)})`;
        logMessage('DEBUG', `Usando API ${keyIdentifier}`);
        STATE.currentApiKeyIndex = (STATE.currentApiKeyIndex + 1) % CONFIG.API_KEYS_GEMINI.length;
        return key;
    }

    async function fetchImageAsBase64(url) {
        if (STATE.imageCache[url]) {
            logMessage('DEBUG', `Usando imagem cacheada: ${url.substring(0, 60)}...`);
            return STATE.imageCache[url];
        }
        logMessage('INFO', `Buscando imagem via fetch(): ${url.substring(0, 80)}...`);
        try {
            const response = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit' });

            if (!response.ok) {
                logMessage('ERROR', `Erro HTTP ${response.status} ao buscar imagem: ${url}`);
                throw new Error(`Image HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            if (bytes.length === 0) throw new Error("Buffer de imagem vazio");

            const base64 = window.btoa(bytes.reduce((a, b) => a + String.fromCharCode(b), ''));

            if (bytes.length < 5 * 1024 * 1024) {
               STATE.imageCache[url] = base64;
               logMessage('DEBUG', `Imagem cacheada: ${url.substring(0, 60)}... Tam: ${Math.round(bytes.length / 1024)}KB`);
            } else {
               logMessage('WARN', `Imagem não cacheada (> 5MB): ${url.substring(0, 60)}...`);
            }
            return base64;

        } catch (error) {
             if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
                 logMessage('ERROR', `Falha de Fetch/CORS na imagem: ${url.substring(0, 60)}... ${error.message}`);
                 throw new Error(`Falha Fetch/CORS Imagem: ${error.message}`);
             } else {
                 logMessage('ERROR', `Erro ao processar imagem: ${url.substring(0, 60)}... ${error.message}`);
                 throw new Error(`Falha Processamento Imagem: ${error.message}`);
             }
        }
    }

    function extractImages() {
        logMessage('DEBUG', "Extraindo URLs de imagem da página...");
        const urls = new Set();
        document.querySelectorAll('img[src], [style*="background-image"], [data-image], .card-img-top, .questao-imagem').forEach(el => {
            let src = null;
            try {
                if (el.tagName === 'IMG' && el.src) src = el.src;
                else if (el.dataset.image) src = el.dataset.image;
                else if (el.style.backgroundImage) { const m = el.style.backgroundImage.match(/url\("?(.+?)"?\)/); if (m && m[1]) src = m[1]; }

                if (src) {
                    const absUrl = new URL(src, window.location.href).toString();
                    // A validação agora acontece DENTRO do IMAGE_FILTERS.verify
                    if (IMAGE_FILTERS.verify(absUrl)) {
                        urls.add(absUrl);
                    }
                    // O log de bloqueio/permissão já acontece dentro do verify
                }
            } catch (e) { logMessage('WARN', `Erro ao processar URL de imagem: ${src || 'desconhecido'}. ${e.message}`); }
        });
        STATE.images = Array.from(urls).slice(0, 10);
        logMessage('INFO', `Extração concluída. ${STATE.images.length} imagens válidas e permitidas encontradas.`);
        return STATE.images;
    }


    async function queryGemini(modelInfo, prompt) {
        const { id: modelId, name: modelName } = modelInfo;
        const apiKeyToUse = getNextApiKey();
        const apiUrl = `${CONFIG.GEMINI_API_BASE_URL}${modelId}:generateContent?key=${apiKeyToUse}`;
        const requestPayload = JSON.stringify(prompt);

        logMessage('INFO', `[${modelName}] Consultando API via fetch() (Chave: ...${apiKeyToUse.slice(-4)})`);
        logMessage('DEBUG', `[${modelName}] Início Texto Prompt:`, prompt.contents[0].parts[0].text.substring(0, 150) + "...");

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': `BrowserBookmarklet/HCK-${SCRIPT_VERSION}` },
                body: requestPayload, mode: 'cors', credentials: 'omit'
            });

            logMessage('DEBUG', `[${modelName}] Status Resposta: ${response.status}`);

            if (response.status === 429) {
                logMessage('WARN', `[${modelName}] Rate Limit (429)! Acionando backoff.`);
                throw new Error(`API Rate Limit (429)`);
            }

            let data;
            try {
                 const responseText = await response.text();
                 if (!responseText) {
                    if (!response.ok) throw new Error(`API Error ${response.status}: ${response.statusText || 'Empty Response Body'}`);
                    data = {};
                 } else {
                    data = JSON.parse(responseText);
                 }
            } catch (jsonError) {
                 if (!response.ok) {
                    logMessage('ERROR', `[${modelName}] Erro API ${response.status} ${response.statusText}. Falha ao parsear corpo JSON.`);
                    throw new Error(`API Error ${response.status}: ${response.statusText || 'Unknown API Error'} (JSON Parse Failed)`);
                 }
                 logMessage('ERROR', `[${modelName}] Falha ao parsear JSON (Status ${response.status}): ${jsonError.message}`);
                 throw new Error(`Falha Parse JSON Resposta: ${jsonError.message}`);
            }

            if (!response.ok) {
                const errorMsg = data?.error?.message || response.statusText || 'Erro API Desconhecido';
                logMessage('ERROR', `[${modelName}] Erro HTTP API ${response.status}: ${errorMsg}. Detalhes:`, data?.error?.details);
                throw new Error(`API Error ${response.status}: ${errorMsg}`);
            }

            if (data.promptFeedback?.blockReason) {
                logMessage('WARN', `[${modelName}] API Bloqueou Prompt. Razão: ${data.promptFeedback.blockReason}. Ratings:`, data.promptFeedback.safetyRatings);
                throw new Error(`API Bloqueou Prompt (${data.promptFeedback.blockReason})`);
            }

            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text;

            if (text) {
                logMessage('INFO', `[${modelName}] Resposta Bruta: "${text}"`);
                return text;
            } else {
                const finishReason = candidate?.finishReason || data.promptFeedback?.blockReason || 'Sem Texto/Razão Desconhecida';
                const safetyRatings = candidate?.safetyRatings;
                logMessage('WARN', `[${modelName}] Sem texto na resposta OK. Razão Finalização: ${finishReason}. Safety:`, safetyRatings);
                throw new Error(`API Sem Texto (${finishReason})`);
            }

        } catch (error) {
            if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
                 logMessage('ERROR', `[${modelName}] Erro Fetch/CORS API: ${error.message}`);
                 throw new Error(`Falha Fetch/CORS API: ${error.message}`);
             }
            logMessage('ERROR', `[${modelName}] Falha Requisição/Processamento API: ${error.message}`);
            throw error;
        }
    }

    function formatResponse(answer) {
        if (typeof answer !== 'string') return null;
        const trimmed = answer.trim();
        if (/^[A-E]$/i.test(trimmed)) {
             logMessage('DEBUG', `Formatando "${answer}" -> Letra única exata: "${trimmed.toUpperCase()}"`);
             return trimmed.toUpperCase();
        }
        const match = trimmed.match(/(?:^|\s|:|\(|\[|"|'|\b)([A-E])(?:\s|\.|,|\)|\]|"|'|\b|$)/i);
        if (match && match[1]) {
            const formatted = match[1].toUpperCase();
             logMessage('DEBUG', `Formatando "${answer}" -> Letra extraída: "${formatted}"`);
            return formatted;
        }
        logMessage('WARN', `Falha ao formatar resposta: "${answer}". Não corresponde ao formato A-E esperado.`);
        return null;
    }

     function determineConsensus(results) {
        logMessage('INFO', 'Determinando consenso...');
        const validAnswers = {};
        let errors = 0;
        let failedModelDetails = [];
        let corsFailure = false;
        let rateLimitFailure = false;

        results.forEach((result, index) => {
            const modelName = CONFIG.MODELS[index]?.name || `Modelo ${index + 1}`;
            if (result.status === 'fulfilled') {
                const formatted = formatResponse(result.value);
                if (formatted) {
                    validAnswers[formatted] = (validAnswers[formatted] || 0) + 1;
                    logMessage('INFO', `[${modelName}] Votou: ${formatted}`);
                } else {
                    logMessage('WARN', `[${modelName}] Formato inválido: "${result.value}"`);
                    errors++;
                    failedModelDetails.push({ name: modelName, reason: 'Formato Inválido' });
                }
            } else {
                const reason = result.reason?.message || result.reason?.toString() || 'Erro Desconhecido';
                logMessage('ERROR', `[${modelName}] Requisição Falhou: ${reason}`);
                errors++;
                failedModelDetails.push({ name: modelName, reason: `Falha (${reason.substring(0, 50)}...)` });
                 if (reason.toLowerCase().includes('cors') || reason.toLowerCase().includes('failed to fetch')) {
                    corsFailure = true;
                 }
                 if (reason.toLowerCase().includes('rate limit') || reason.includes('429')) {
                     rateLimitFailure = true;
                 }
            }
        });

        const numModelsQueried = results.length;
        const numSuccessfulVotes = Object.values(validAnswers).reduce((sum, count) => sum + count, 0);
        const majorityThreshold = Math.ceil(numModelsQueried / 2);
        logMessage('DEBUG', `Estatísticas Consenso: Modelos=${numModelsQueried}, VotosVálidos=${numSuccessfulVotes}, Erros=${errors}, LimiarMaioria=${majorityThreshold}`);

         if (corsFailure && numSuccessfulVotes === 0) {
             logMessage('ERROR', `Consenso Falhou: Requisições API bloqueadas por CORS/Rede.`);
             return { answer: "Falha Rede/CORS", detail: "(API bloqueada)", type: 'error' };
         }
         if (rateLimitFailure && numSuccessfulVotes === 0) {
             logMessage('ERROR', `Consenso Falhou: Rate limit atingido em todas as tentativas.`);
             return { answer: "Falha Rate Limit", detail: "(Tente mais tarde)", type: 'error' };
         }
        if (numSuccessfulVotes === 0) {
            const failureSummary = failedModelDetails.map(f => `${f.name}: ${f.reason}`).join('; ') || 'Nenhuma resposta válida';
            logMessage('ERROR', `Consenso Falhou: Nenhuma resposta válida. Falhas: ${failureSummary}`);
            return { answer: "Falha Total", detail: `(${failureSummary.substring(0, 80)}...)`, type: 'error' };
        }

        const sortedVotes = Object.entries(validAnswers).sort(([, v1], [, v2]) => v2 - v1);
        const topAnswer = sortedVotes[0][0];
        const topVotes = sortedVotes[0][1];
        const totalValidModels = numModelsQueried - errors;

        if (topVotes >= majorityThreshold && totalValidModels > 0) {
             const detail = (topVotes === totalValidModels) ? `(Consenso ${topVotes}/${totalValidModels})` : `(Maioria ${topVotes}/${totalValidModels})`;
            logMessage('INFO', `Consenso Atingido: ${topAnswer} ${detail}`);
            return { answer: topAnswer, detail: detail, type: 'success' };
        } else {
            const tie = sortedVotes.length > 1 && sortedVotes[1][1] === topVotes;
            if (tie) {
                const tieDetail = sortedVotes.filter(v => v[1] === topVotes).map(([a,v]) => `${a}:${v}`).join(', ');
                logMessage('WARN', `Consenso Ambíguo (Empate, Sem Maioria): ${tieDetail}`);
                return { answer: "Ambíguo", detail: `(${tieDetail})`, type: 'warn' };
            } else {
                 const failureSummary = failedModelDetails.length > 0 ? ` | Falhas: ${failedModelDetails.map(f => f.name).join(', ')}` : '';
                 const detail = `(${topAnswer}:${topVotes}/${totalValidModels > 0 ? totalValidModels : numModelsQueried} - Sem Maioria${failureSummary})`;
                logMessage('WARN', `Consenso Inconclusivo (Voto Minoritário): ${topAnswer} ${detail}`);
                return { answer: topAnswer, detail: detail.substring(0, 80) + (detail.length > 80 ? '...)' : ''), type: 'warn' };
            }
        }
    }

     async function buildPrompt(question, imageUrls) {
        logMessage('INFO', `Construindo prompt (${imageUrls.length} imagens detectadas)...`);
        const imageParts = [];
        let imageFetchErrors = 0;
        const imageFetchPromises = imageUrls.map(async (url) => {
            try {
                const base64 = await fetchImageAsBase64(url);
                let mime = 'image/jpeg';
                if (/\.png$/i.test(url)) mime = 'image/png';
                else if (/\.webp$/i.test(url)) mime = 'image/webp';
                else if (/\.gif$/i.test(url)) mime = 'image/gif';
                 else if (/\.jpe?g$/i.test(url)) mime = 'image/jpeg';
                imageParts.push({ inlineData: { mimeType: mime, data: base64 } });
            } catch (e) {
                imageFetchErrors++;
                logMessage('WARN', `Falha ao buscar/processar imagem, pulando: ${url.substring(0,60)}... (${e.message})`);
            }
        });

        await Promise.allSettled(imageFetchPromises);
        logMessage('DEBUG', `Incluídas ${imageParts.length} imagens no payload. ${imageFetchErrors} falharam (provável CORS/Rede).`);

        const promptText = `CONTEXTO: Questão de múltipla escolha (Alternativas A, B, C, D, E).
OBJETIVO: Identificar a ÚNICA alternativa CORRETA.
INSTRUÇÕES MUITO IMPORTANTES:
1. ANÁLISE INTERNA: Pense passo a passo para encontrar a resposta (NÃO MOSTRE ESTE RACIOCÍNIO NA SAÍDA). Analise o texto da questão E TODAS as imagens fornecidas.
2. RESPOSTA FINAL: Retorne APENAS e SOMENTE a LETRA MAIÚSCULA da alternativa correta.
3. FORMATO ESTRITO: A resposta DEVE ser UMA ÚNICA LETRA: A, B, C, D ou E.
4. NÃO INCLUA NADA MAIS: Sem texto adicional, sem explicações, sem pontuação (sem ".", ",", etc.), sem markdown, sem numeração, sem frases como "A resposta é:". APENAS A LETRA.
5. SE INCERTO: Mesmo se não tiver 100% de certeza, escolha a alternativa MAIS PROVÁVEL e retorne apenas a letra correspondente.

QUESTÃO:
${question}
${imageParts.length > 0 ? '\nIMAGENS (Analise cuidadosamente):\n' : (imageFetchErrors > 0 ? '\n(AVISO: Algumas ou todas as imagens não puderam ser carregadas/incluídas na análise devido a erros de rede/CORS)\n' : '\n(Nenhuma imagem relevante detectada ou fornecida)\n')}`;

        logMessage('DEBUG', "Texto do prompt gerado.");

        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: CONFIG.SAFETY_SETTINGS_THRESHOLD },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: CONFIG.SAFETY_SETTINGS_THRESHOLD },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: CONFIG.SAFETY_SETTINGS_THRESHOLD },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: CONFIG.SAFETY_SETTINGS_THRESHOLD },
        ];

        return {
            contents: [{ parts: [{ text: promptText }, ...imageParts] }],
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                topP: CONFIG.TOP_P,
                maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
            },
            safetySettings: safetySettings
        };
    }

    function setupUI() {
        logMessage('INFO','Configurando UI (iOS Refined Bookmarklet)...');
        try {
            const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);
        } catch (e) {
            logMessage('WARN', 'Falha ao injetar Google Font (CSP?). Usando fontes do sistema.');
        }
        const estilo = { cores: { fundo: '#1C1C1E', fundoSecundario: '#2C2C2E', fundoTerciario: '#3A3A3C', texto: '#F5F5F7', textoSecundario: '#8A8A8E', accent: '#FFFFFF', accentBg: '#007AFF', secondaryAccent: '#E5E5EA', secondaryAccentBg: '#3A3A3C', erro: '#FF453A', sucesso: '#32D74B', warn: '#FFD60A', info: '#0A84FF', logDebug: '#636366', borda: '#38383A', notificationBg: 'rgba(44, 44, 46, 0.85)', copyBtnBg: '#555555' }, sombras: { menu: '0 10px 35px rgba(0, 0, 0, 0.3)', botao: '0 2px 4px rgba(0, 0, 0, 0.2)', notification: '0 5px 20px rgba(0, 0, 0, 0.3)' }, radius: '14px', radiusSmall: '8px' };
        const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '200px' : '220px'), fontSize: (window.innerWidth < 768 ? '13px' : '14px'), buttonPadding: '9px 10px', textareaHeight: '45px', titleSize: '16px' });
        const container = document.createElement('div'); container.id = 'hck-ui-bookmarklet';
        container.style.cssText = ` position: fixed; bottom: 12px; right: 12px; z-index: 10000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.4; `;
        const toggleBtn = document.createElement('button'); toggleBtn.id = 'hck-toggle-btn'; toggleBtn.textContent = 'HCK'; toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; padding: 8px 18px; border: 1px solid ${estilo.cores.borda}; border-radius: 22px; cursor: pointer; font-weight: 600; font-size: 15px; box-shadow: ${estilo.sombras.botao}; display: block; transition: all 0.35s ease-out; width: auto; min-width: 70px; text-align: center; &:hover { background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        const sizes = getResponsiveSize();
        const menu = document.createElement('div'); menu.id = 'hck-menu'; menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 10px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 8px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(15px) scale(0.95); transition: opacity 0.35s ease-out, transform 0.35s ease-out; position: relative; margin-bottom: 8px; max-height: 75vh; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } `;
        const header = document.createElement('div'); header.style.cssText = `display: flex; align-items: center; justify-content: center; position: relative; width: 100%; margin-bottom: 4px;`;
        // --- TÍTULO DO MENU ATUALIZADO ---
        const title = document.createElement('div'); title.textContent = 'HCK'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; text-align: center; flex-grow: 1; color: ${estilo.cores.texto}; `;
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` position: absolute; top: -4px; right: -4px; background: ${estilo.cores.fundoSecundario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: 600; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        header.append(title, closeBtn);
        const input = document.createElement('textarea'); input.id = 'hck-question-input'; input.placeholder = 'Cole a questão aqui...'; input.setAttribute('rows', '2'); input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 8px; margin-bottom: 0; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
        const imagesContainer = document.createElement('div'); imagesContainer.id = 'hck-images-container'; imagesContainer.style.cssText = ` max-height: 60px; overflow-y: auto; margin-bottom: 0; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 6px 8px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`; imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em;">Nenhuma imagem detectada</div>`;
        const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; margin-bottom: 0; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease; `;
        const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; &:hover { opacity: 0.85; } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; } `;
        const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; opacity: 1; } `;
        const updateImagesBtn = document.createElement('button'); updateImagesBtn.textContent = `Atualizar Imagens`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
        const analyzeBtn = document.createElement('button'); analyzeBtn.id = 'hck-analyze-btn'; analyzeBtn.textContent = `Analisar Questão`; analyzeBtn.style.cssText = buttonPrimaryStyle;
        const clearBtn = document.createElement('button'); clearBtn.textContent = `Limpar Tudo`; clearBtn.style.cssText = buttonSecondaryStyle;
        const logsBtn = document.createElement('button'); logsBtn.textContent = `Ver Logs`; logsBtn.style.cssText = buttonSecondaryStyle;
        // --- FORMATAÇÃO DOS CRÉDITOS ATUALIZADA ---
        const credits = document.createElement('div');
        credits.innerHTML = `<span style="font-weight: 600; letter-spacing: 0.5px;">v${SCRIPT_VERSION}</span> <span style="margin: 0 4px;">|</span> <span style="opacity: 0.7;">by Hackermoon</span>`;
        credits.style.cssText = ` text-align: center; font-size: 10px; font-weight: 500; color: ${estilo.cores.textoSecundario}; margin-top: 8px; padding-top: 6px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.9; `;
        const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-notifications'; notificationContainer.style.cssText = ` position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); z-index: 10002; display: flex; flex-direction: column; align-items: center; gap: 10px; width: auto; max-width: 90%; `;
        STATE.notificationContainer = notificationContainer;
        menu.append(header, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
        container.append(menu, toggleBtn);
        document.body.appendChild(container); document.body.appendChild(notificationContainer);
        logMessage('INFO', 'Elementos da UI adicionados à página.');

        logMessage('WARN', '--- ALERTA DE SEGURANÇA ---');
        logMessage('WARN', 'As chaves de API estão incluídas diretamente no código deste bookmarklet.');
        logMessage('WARN', 'Isto é INSEGURO. NÃO compartilhe se contiver chaves reais.');
        logMessage('WARN', 'Considere remover as chaves ou usar um método mais seguro.');
        logMessage('WARN', '--- FIM ALERTA SEGURANÇA ---');


        const toggleMenu = (show) => { const duration = 350; if (show) { logMessage('DEBUG', 'Mostrando menu...'); menu.style.display = 'flex'; toggleBtn.style.opacity = '0'; toggleBtn.style.transform = 'scale(0.8) translateY(10px)'; setTimeout(() => { menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)'; toggleBtn.style.display = 'none'; }, 10); } else { logMessage('DEBUG', 'Escondendo menu...'); menu.style.opacity = '0'; menu.style.transform = 'translateY(15px) scale(0.95)'; setTimeout(() => { menu.style.display = 'none'; toggleBtn.style.display = 'block'; requestAnimationFrame(() => { toggleBtn.style.opacity = '1'; toggleBtn.style.transform = 'scale(1) translateY(0)'; }); }, duration); } };
        toggleBtn.addEventListener('click', () => toggleMenu(true)); closeBtn.addEventListener('click', () => toggleMenu(false));
        const hideLogs = () => { if (STATE.logModal) { STATE.logModal.style.display = 'none'; logMessage('DEBUG', 'Escondendo logs.'); } };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.style.display === 'flex') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } });
        window.addEventListener('resize', () => { const s = getResponsiveSize(); menu.style.width = s.menuWidth; input.style.minHeight = s.textareaHeight; input.style.fontSize = s.fontSize; [analyzeBtn, clearBtn, updateImagesBtn, logsBtn].forEach(b => { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }); imagesContainer.style.fontSize = `calc(${s.fontSize} - 2px)`; title.style.fontSize = s.titleSize; });

        const updateImageButtons = (images) => { if (!imagesContainer) return; if (images.length === 0) { imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem relevante</div>`; return; } imagesContainer.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 4px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; color: ${estilo.cores.texto}; font-size:0.9em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 4px; padding: 1px 4px; font-size: 9px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imagesContainer.querySelectorAll('button[data-url]').forEach(b => { b.addEventListener('mouseenter', () => b.style.backgroundColor = estilo.cores.borda); b.addEventListener('mouseleave', () => b.style.backgroundColor = estilo.cores.fundoTerciario); b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'Copiado!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => { logMessage('ERROR', 'Falha ao copiar:', err); e.target.textContent = 'Falha!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1500); }); }); }); };

        const showResponse = (result, duration) => { if (!STATE.notificationContainer) { logMessage('ERROR', "Container de notificação não encontrado!"); return; } const { answer = "Info", detail = "", type = 'info' } = result || {}; let icon = 'ℹ️'; let titleText = answer; let detailText = detail; let effectiveDuration = duration || (type === 'error' || type === 'warn' ? CONFIG.NOTIFICATION_TIMEOUT_LONG : CONFIG.NOTIFICATION_TIMEOUT); switch (type) { case 'success': icon = '✅'; break; case 'error': icon = '❌'; break; case 'warn': icon = '⚠️'; break; case 'info': icon = 'ℹ️'; break; } const notification = document.createElement('div'); notification.style.cssText = ` background-color: ${estilo.cores.notificationBg}; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: ${estilo.cores.texto}; padding: 10px 15px; border-radius: ${estilo.radiusSmall}; box-shadow: ${estilo.sombras.notification}; display: flex; align-items: center; gap: 10px; min-width: 180px; max-width: 320px; opacity: 0; transform: translateY(15px); transition: opacity 0.3s ease-out, transform 0.3s ease-out; border: 1px solid ${estilo.cores.borda}; cursor: pointer; `; const iconSpan = document.createElement('span'); iconSpan.textContent = icon; iconSpan.style.fontSize = '1.2em'; const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.95em; line-height: 1.3; word-break: break-word;`; textContent.innerHTML = `<span style="font-weight: 600; color: ${estilo.cores.texto};">${titleText}</span> ${detailText ? `<span style="font-size: 0.9em; color: ${estilo.cores.textoSecundario}; margin-left: 3px;">${detailText}</span>` : ''}`; let dismissTimeout; const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(20px)'; setTimeout(() => notification.remove(), 300); }; notification.onclick = dismiss; notification.append(iconSpan, textContent); STATE.notificationContainer.appendChild(notification); requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }); dismissTimeout = setTimeout(dismiss, effectiveDuration); logMessage('INFO', `Notificação (${effectiveDuration}ms): ${titleText} ${detailText}. Tipo: ${type}`); };

        const createLogModal = () => { if (STATE.logModal) return; logMessage('DEBUG', 'Criando modal de logs.'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.75); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 15px 20px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 85%; max-width: 800px; height: 75%; max-height: 650px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; `; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 8px; gap: 10px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = 'Logs Detalhados (Bookmarklet)'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 16px; flex-grow: 1;`; const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar Logs'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: background-color 0.2s ease; flex-shrink: 0; &:hover { background: ${estilo.cores.borda}; }`; copyLogBtn.onclick = () => { const textToCopy = STATE.logMessages.map(log => `[${log.timestamp} ${log.level}] ${log.message}`).join('\n'); navigator.clipboard.writeText(textToCopy).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar Logs'; }, 2000); logMessage('INFO', 'Logs copiados.'); }).catch(err => { logMessage('ERROR', 'Falha ao copiar logs:', err); copyLogBtn.textContent = 'Erro!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar Logs'; }, 2000); }); }; const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs; modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11px; line-height: 1.6; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 10px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal; };
        const showLogs = () => { logMessage('DEBUG', 'showLogs chamado.'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal?.querySelector('#hck-log-area'); if (!logArea) { logMessage('ERROR', 'Área de log não encontrada no modal.'); return;} logMessage('INFO', `Exibindo ${STATE.logMessages.length} logs.`); const logColors = { ERROR: estilo.cores.erro, WARN: estilo.cores.warn, INFO: estilo.cores.info, DEBUG: estilo.cores.logDebug, DEFAULT: estilo.cores.textoSecundario }; const sanitize = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; }; logArea.innerHTML = STATE.logMessages.map(log => { const color = logColors[log.level] || logColors.DEFAULT; return `<span style="color: ${color}; font-weight: bold;">[${log.timestamp} ${log.level}]</span> <span style="color:${estilo.cores.texto};">${sanitize(log.message)}</span>`; }).join('\n'); if(STATE.logModal) STATE.logModal.style.display = 'flex'; logArea.scrollTop = logArea.scrollHeight; };
        logsBtn.addEventListener('click', showLogs);

        return { elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer, toggleBtn }, helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs } };
    }

    function init() {
        logMessage('INFO',`----- HCK Bookmarklet Inicializando (v${SCRIPT_VERSION}) -----`);
        try {
            const ui = setupUI();
            if (!ui) throw new Error("Falha crítica na configuração da UI.");
            logMessage('INFO','Configuração da UI completa.');

            const { input, analyzeBtn, clearBtn, updateImagesBtn, toggleBtn } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;
            const estiloCores = { erro: '#FF453A', accentBg: '#007AFF', fundoSecundario: '#2C2C2E', textoSecundario: '#8A8A8E', borda: '#38383A' };

            const setAnalyzeButtonState = (analyzing, rateLimited = false) => {
                 const currentBtn = document.getElementById('hck-analyze-btn');
                 const currentToggleBtn = document.getElementById('hck-toggle-btn');
                 if (!currentBtn) return;

                 if (rateLimited) {
                     currentBtn.disabled = true;
                     currentBtn.textContent = `Limite Atingido...`;
                     currentBtn.style.backgroundColor = estiloCores.erro;
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.erro;
                 } else if (analyzing) {
                     currentBtn.disabled = true;
                     currentBtn.textContent = `Analisando...`;
                     currentBtn.style.backgroundColor = estiloCores.accentBg;
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.borda;
                 } else {
                     currentBtn.disabled = false;
                     currentBtn.textContent = `Analisar Questão`;
                     currentBtn.style.backgroundColor = estiloCores.accentBg;
                      if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.borda;
                 }
             };

            analyzeBtn.onclick = async () => {
                logMessage('INFO', "----- Botão Analisar Clicado -----");
                const question = input.value.trim();

                if (STATE.isAnalyzing) {
                    logMessage('WARN', `Análise ignorada: Já está analisando.`);
                    showResponse({answer: "Aguarde", detail: "Análise em progresso", type: 'warn' });
                    return;
                }
                if (STATE.rateLimitActive) {
                     logMessage('WARN', `Análise ignorada: Backoff global de rate limit ativo.`);
                     showResponse({answer: "Limite Atingido", detail: "Aguarde e tente novamente.", type: 'error' });
                     setAnalyzeButtonState(false, true);
                     return;
                 }
                if (!question) {
                    logMessage('WARN', `Análise ignorada: Campo da questão vazio.`);
                    showResponse({answer: "Erro", detail: "Insira o texto da questão", type: 'error' });
                    input.focus();
                    return;
                }
                 if (!CONFIG.API_KEYS_GEMINI || CONFIG.API_KEYS_GEMINI.length === 0 || !CONFIG.API_KEYS_GEMINI[0]) {
                    logMessage('ERROR', "Análise bloqueada: Nenhuma chave de API configurada.");
                    showResponse({answer: "Erro Config", detail: "Nenhuma chave de API definida.", type: 'error' });
                    return;
                }

                STATE.isAnalyzing = true;
                setAnalyzeButtonState(true);
                logMessage("INFO", "Iniciando análise...");
                logMessage("DEBUG", `Questão: ${question.substring(0,100)}...`);

                try {
                    const images = extractImages();
                    updateImageButtons(images);

                    const prompt = await buildPrompt(question, images);

                    logMessage('INFO', `Consultando ${CONFIG.MODELS.length} modelos via fetch()...`);
                    const promises = CONFIG.MODELS.map(modelInfo =>
                        fetchWithRetry(modelInfo.name, () => queryGemini(modelInfo, prompt))
                            .catch(e => {
                                logMessage('ERROR', `[${modelInfo.name}] FALHA FINAL após retentativas: ${e.message}`);
                                return Promise.reject(e);
                            })
                    );

                    const results = await Promise.allSettled(promises);

                    const rateLimitHitDuringAnalysis = results.some(r => r.status === 'rejected' && r.reason?.message?.includes('Rate Limit'));
                    if (rateLimitHitDuringAnalysis && !STATE.rateLimitActive) {
                         logMessage('WARN', 'Rate limit detectado durante análise. Ativando flag global.');
                         STATE.rateLimitActive = true;
                         if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId);
                         STATE.rateLimitTimeoutId = setTimeout(() => {
                             logMessage('INFO', 'Backoff global de rate limit desativado automaticamente.');
                             STATE.rateLimitActive = false;
                             STATE.rateLimitTimeoutId = null;
                             if (!STATE.isAnalyzing) setAnalyzeButtonState(false, false);
                         }, 30000);
                     }

                     const corsFailure = results.some(r => r.status === 'rejected' && (r.reason?.message?.toLowerCase().includes('cors') || r.reason?.message?.toLowerCase().includes('failed to fetch')));
                     if (corsFailure) {
                        logMessage('ERROR', 'Uma ou mais requisições falharam devido a CORS ou problemas de rede.');
                     }

                    logMessage('INFO', 'Determinando consenso...');
                    const consensusResult = determineConsensus(results);
                    showResponse(consensusResult);

                } catch (error) {
                    logMessage("ERROR", "Erro crítico durante a execução da análise:", error);
                    showResponse({ answer: "Erro Crítico", detail: `Falha: ${error.message.substring(0,100)}`, type: 'error' });
                } finally {
                    STATE.isAnalyzing = false;
                    setAnalyzeButtonState(false, STATE.rateLimitActive);
                    logMessage("INFO", "----- Análise Finalizada -----");
                }
            };

            clearBtn.onclick = () => { logMessage('INFO', "----- Limpar Clicado -----"); input.value = ''; STATE.images = []; STATE.imageCache = {}; updateImageButtons([]); input.focus(); logMessage("INFO", "Entradas limpas."); showResponse({answer: "Limpado", type: 'info'}, 3000); };
            updateImagesBtn.onclick = () => { logMessage('INFO', "----- Atualizar Imagens Clicado -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imagens Atualizadas", detail:`${STATE.images.length} detectadas.`, type:'info'}, 3000); } catch (e) { logMessage("ERROR","Erro ao atualizar imagens:",e); showResponse({answer:"Erro Imagens", detail:"Falha leitura.", type:'error'}); }};

            setTimeout(() => { logMessage("INFO", "Tentativa inicial de extração de imagens..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Erro na extração inicial de imagens:", e); }}, 2000);

            logMessage('INFO',`----- HCK Bookmarklet Inicializado (v${SCRIPT_VERSION}) -----`);
            ui.helpers.toggleMenu(true);

        } catch (error) {
            logMessage('ERROR', '!!! ERRO CRÍTICO NA INICIALIZAÇÃO DO BOOKMARKLET !!!', error);
            console.error(`[HCK Init Fail]: ${error.message}. Script pode não funcionar. Verifique o Console.`);
            alert(`[HCK Bookmarklet Init Fail]: ${error.message}. Verifique o console (F12).`);
        }
    }

    init();

})();
