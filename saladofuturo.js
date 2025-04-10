// ==UserScript==
// @name         HCK - Prova Paulista Enhanced
// @namespace    http://tampermonkey.net/
// @version      7.5.4
// @description  Analisa questões da Prova Paulista usando múltiplas IAs e fornece a resposta.
// @author       Hackermoon
// @match        https://saladofuturo.educacao.sp.gov.br/*
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      edusp-static.ip.tv
// @connect      s3.sa-east-1.amazonaws.com
// @connect      *.googleusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
        MODELS: [
            { name: 'Pro 1.5', id: 'gemini-1.5-pro-latest' },
            { name: 'Flash 1.5', id: 'gemini-1.5-flash-latest' }
        ],
        API_KEYS_GEMINI: [
            'AIzaSyBDdSZkgQphf5BORTDLcEUbJWcIAIo0Yr8',
            'AIzaSyANp5yxdrdGL7RtOXy0LdIdkoKZ7cVPIsc'
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
        blocked: [ /edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i, /conteudo_logo\.png$/i, /_thumb(?:nail)?\./i, /\.svg$/i ],
        allowed: [ /edusp-static\.ip\.tv\/(?:tms|tarefas|exercicios)\//i, /\/atividade\/\d+\?eExame=true/i, /\.(?:jpg|png|jpeg|gif|webp)$/i, /lh[0-9]+(?:- G*)*\.googleusercontent\.com/i, /\/media\//i, /\/questao_\d+/i, /image\?/i ],
        verify(src) { if (!src || typeof src !== 'string' || !src.startsWith('http')) return false; if (this.blocked.some(r => r.test(src))) return false; return this.allowed.some(r => r.test(src)); }
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
        if (level === 'ERROR') console.error(`[HCK ${timestamp}]`, ...args);
        else if (level === 'WARN') console.warn(`[HCK ${timestamp}]`, ...args);
    };

    const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms))
    ]);

    async function fetchWithRetry(modelName, callback, retries = CONFIG.MAX_RETRIES) {
        logMessage('DEBUG', `[${modelName}] Initiating fetch/retry sequence (Max Retries: ${retries})`);
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (STATE.rateLimitActive && attempt === 0) {
                    const initialRateLimitDelay = 1000;
                    logMessage('WARN', `[${modelName}] Global rate limit flag active, adding initial delay: ${initialRateLimitDelay}ms`);
                    await new Promise(r => setTimeout(r, initialRateLimitDelay));
                }
                return await withTimeout(callback(), CONFIG.TIMEOUT);
            } catch (error) {
                logMessage('ERROR', `[${modelName}] Attempt ${attempt + 1}/${retries + 1} failed: ${error.message}`);
                if (attempt === retries) {
                    logMessage('ERROR', `[${modelName}] Max retries reached. Failing request.`);
                    throw error;
                }
                let delay;
                const isRateLimitError = error.message.includes('429') || error.message.toLowerCase().includes('rate limit');
                if (isRateLimitError) {
                    if (!STATE.rateLimitActive) {
                         logMessage('WARN', `[${modelName}] Rate limit detected (429)! Activating global backoff state.`);
                         STATE.rateLimitActive = true;
                         if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId);
                         STATE.rateLimitTimeoutId = setTimeout(() => {
                             logMessage('INFO', 'Global rate limit backoff state deactivated.');
                             STATE.rateLimitActive = false;
                             STATE.rateLimitTimeoutId = null;
                         }, 30000);
                     }
                    delay = CONFIG.API_RETRY_DELAY_BASE * CONFIG.API_RATE_LIMIT_DELAY_MULTIPLIER * (attempt + 1);
                    logMessage('WARN', `[${modelName}] Rate limit detected. Applying longer backoff delay: ${delay}ms`);
                } else {
                    delay = CONFIG.API_RETRY_DELAY_BASE * (attempt + 1);
                    logMessage('INFO', `[${modelName}] Applying standard backoff delay: ${delay}ms`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    function getNextApiKey() {
        if (!CONFIG.API_KEYS_GEMINI || CONFIG.API_KEYS_GEMINI.length === 0) {
             logMessage('ERROR', 'CRITICAL: No API keys configured in CONFIG.API_KEYS_GEMINI!');
             throw new Error('No API keys available');
        }
        if (CONFIG.API_KEYS_GEMINI.length === 1) {
            logMessage('WARN', 'Only one API key configured. Key rotation inactive.');
        }
        const key = CONFIG.API_KEYS_GEMINI[STATE.currentApiKeyIndex];
        const keyIdentifier = `Key #${STATE.currentApiKeyIndex + 1}/${CONFIG.API_KEYS_GEMINI.length} (...${key.slice(-4)})`;
        logMessage('DEBUG', `Using API ${keyIdentifier}`);
        STATE.currentApiKeyIndex = (STATE.currentApiKeyIndex + 1) % CONFIG.API_KEYS_GEMINI.length;
        return key;
    }

     async function fetchImageAsBase64(url) {
        if (STATE.imageCache[url]) {
            logMessage('DEBUG', `Using cached image: ${url.substring(0, 60)}...`);
            return STATE.imageCache[url];
        }
        logMessage('INFO', `Fetching image: ${url.substring(0, 80)}...`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url, responseType: 'arraybuffer', timeout: CONFIG.TIMEOUT,
                onload: function(response) {
                     if (response.status >= 200 && response.status < 300) {
                         try {
                             const bytes = new Uint8Array(response.response);
                             if (bytes.length === 0) throw new Error("Empty image buffer");
                             const base64 = window.btoa(bytes.reduce((a, b) => a + String.fromCharCode(b), ''));
                             if (bytes.length < 5 * 1024 * 1024) {
                                STATE.imageCache[url] = base64;
                                logMessage('DEBUG', `Img cached: ${url.substring(0, 60)}... Size: ${Math.round(bytes.length / 1024)}KB`);
                             } else {
                                logMessage('WARN', `Image not cached due to size > 5MB: ${url.substring(0, 60)}...`);
                             }
                             resolve(base64);
                         } catch (e) { logMessage('ERROR', `Img Base64 Conv Err ${url}:`, e); reject(new Error(`Image conversion failed: ${e.message}`)); }
                     } else { logMessage('ERROR', `Img HTTP Err ${response.status}: ${url}`); reject(new Error(`Image HTTP ${response.status}`)); }
                 },
                onerror: function(e) { logMessage('ERROR', `Img Network Err ${url}:`, e); reject(new Error(`Image Network Err`)); },
                ontimeout: function() { logMessage('ERROR', `Img Timeout: ${url}`); reject(new Error(`Image Timeout Err`)); }
            });
        });
    }

    function extractImages() {
        logMessage('DEBUG', "Extracting relevant images...");
        const urls = new Set();
        document.querySelectorAll('img[src], [style*="background-image"], [data-image]').forEach(el => {
            let src = null;
            try {
                if (el.tagName === 'IMG' && el.src) src = el.src;
                else if (el.dataset.image) src = el.dataset.image;
                else if (el.style.backgroundImage) { const m = el.style.backgroundImage.match(/url\("?(.+?)"?\)/); if (m && m[1]) src = m[1]; }
                if (src) { const absUrl = new URL(src, window.location.href).toString(); if (IMAGE_FILTERS.verify(absUrl)) urls.add(absUrl); }
            } catch (e) { logMessage('WARN', `URL parse/verify err: ${src || 'unknown'}. ${e.message}`); }
        });
        STATE.images = Array.from(urls).slice(0, 10);
        logMessage('INFO', `Extraction complete. Found ${STATE.images.length} relevant images.`);
        return STATE.images;
    }

    async function queryGemini(modelInfo, prompt) {
        const { id: modelId, name: modelName } = modelInfo;
        const apiKeyToUse = getNextApiKey();
        const apiUrl = `${CONFIG.GEMINI_API_BASE_URL}${modelId}:generateContent?key=${apiKeyToUse}`;
        const requestPayload = JSON.stringify(prompt);
        logMessage('INFO', `[${modelName}] Querying API... (Key: ...${apiKeyToUse.slice(-4)})`);
        logMessage('DEBUG', `[${modelName}] Prompt Text Start:`, prompt.contents[0].parts[0].text.substring(0, 150) + "...");
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST', url: apiUrl,
                headers: { 'Content-Type': 'application/json', 'User-Agent': `Tampermonkey HCK/${GM_info.script.version}` },
                data: requestPayload, timeout: CONFIG.TIMEOUT,
                onload: function(response) {
                    logMessage('DEBUG', `[${modelName}] Response Status: ${response.status}`);
                    try {
                        if (!response.responseText) {
                            logMessage('ERROR', `[${modelName}] Empty response body. Status: ${response.status} ${response.statusText}`);
                            return reject(new Error(`API Empty Response (${response.status})`));
                        }
                        const data = JSON.parse(response.responseText);
                        if (data.promptFeedback?.blockReason) {
                            logMessage('WARN', `[${modelName}] API Blocked Prompt. Reason: ${data.promptFeedback.blockReason}. Safety Ratings:`, data.promptFeedback.safetyRatings);
                        }
                        if (response.status === 429) {
                            logMessage('WARN', `[${modelName}] Rate Limit Hit (429)! Triggering backoff.`);
                            return reject(new Error(`API Rate Limit (429)`));
                        } else if (response.status >= 200 && response.status < 300) {
                            const candidate = data.candidates?.[0];
                            const text = candidate?.content?.parts?.[0]?.text;
                            if (text) {
                                logMessage('INFO', `[${modelName}] Raw Response: "${text}"`);
                                resolve(text);
                            } else {
                                const finishReason = candidate?.finishReason || data.promptFeedback?.blockReason || 'No Text/Unknown Reason';
                                const safetyRatings = candidate?.safetyRatings;
                                logMessage('WARN', `[${modelName}] No text in response. Finish Reason: ${finishReason}. Safety:`, safetyRatings);
                                reject(new Error(`API No Text (${finishReason})`));
                            }
                        } else {
                            const errorMsg = data?.error?.message || response.statusText || 'Unknown API Error';
                            logMessage('ERROR', `[${modelName}] API HTTP Error ${response.status}: ${errorMsg}. Details:`, data?.error?.details);
                            reject(new Error(`API Error ${response.status}: ${errorMsg}`));
                        }
                    } catch (error) {
                        logMessage('ERROR', `[${modelName}] Response Processing Failed: ${error.message}`, response.responseText);
                        if (error instanceof SyntaxError) { reject(new Error(`Response JSON Parse Fail: ${error.message}`)); }
                        else { reject(new Error(`Response Process Fail: ${error.message}`)); }
                    }
                },
                onerror: function(error) { logMessage('ERROR', `[${modelName}] API Network Error:`, error); reject(new Error('API Network Error')); },
                ontimeout: function() { logMessage('ERROR', `[${modelName}] API Request Timeout (${CONFIG.TIMEOUT}ms)`); reject(new Error('API Timeout Error')); }
            });
        });
    }

    function formatResponse(answer) {
        if (typeof answer !== 'string') return null;
        const trimmed = answer.trim();
        if (/^[A-E]$/.test(trimmed)) {
             logMessage('DEBUG', `Formatting "${answer}" -> Exact single letter: "${trimmed}"`);
             return trimmed;
        }
        const bracketMatch = trimmed.match(/^[\[("']?([A-E])[\])"']?$/i);
        if (bracketMatch) {
            const formatted = bracketMatch[1].toUpperCase();
            logMessage('DEBUG', `Formatting "${answer}" -> Bracketed letter: "${formatted}"`);
            return formatted;
        }
         const startMatch = trimmed.match(/^([A-E])[\s.]*$/i);
         if (startMatch && trimmed.length <= 3) {
            const formatted = startMatch[1].toUpperCase();
            logMessage('DEBUG', `Formatting "${answer}" -> Starts with letter (short): "${formatted}"`);
            return formatted;
         }
        logMessage('WARN', `Formatting failed for answer: "${answer}". Does not match expected A-E format.`);
        return null;
    }

    function determineConsensus(results) {
        logMessage('INFO', 'Determining consensus (stricter)...');
        const validAnswers = {};
        let errors = 0;
        let failedModelDetails = [];
        results.forEach((result, index) => {
            const modelName = CONFIG.MODELS[index]?.name || `Model ${index + 1}`;
            if (result.status === 'fulfilled') {
                const formatted = formatResponse(result.value);
                if (formatted) {
                    validAnswers[formatted] = (validAnswers[formatted] || 0) + 1;
                    logMessage('INFO', `[${modelName}] Voted: ${formatted}`);
                } else {
                    logMessage('WARN', `[${modelName}] Invalid format: "${result.value}"`);
                    errors++;
                    failedModelDetails.push({ name: modelName, reason: 'Invalid Format' });
                }
            } else {
                const reason = result.reason?.message || result.reason?.toString() || 'Unknown Error';
                logMessage('ERROR', `[${modelName}] Request Failed: ${reason}`);
                errors++;
                failedModelDetails.push({ name: modelName, reason: `Request Failed (${reason.substring(0, 50)}...)` });
            }
        });
        const numModelsQueried = results.length;
        const numValidVotes = Object.values(validAnswers).reduce((sum, count) => sum + count, 0);
        const majorityThreshold = Math.ceil(numModelsQueried / 2);
        logMessage('DEBUG', `Consensus stats: Models=${numModelsQueried}, ValidVotes=${numValidVotes}, Errors=${errors}, MajorityThreshold=${majorityThreshold}`);
        if (numValidVotes === 0) {
            const failureSummary = failedModelDetails.map(f => `${f.name}: ${f.reason}`).join('; ') || 'Nenhuma resposta válida';
            logMessage('ERROR', `Consensus Failed: No valid answers. Failures: ${failureSummary}`);
            return { answer: "Falha", detail: `(${failureSummary})`, type: 'error' };
        }
        const sortedVotes = Object.entries(validAnswers).sort(([, v1], [, v2]) => {
            if (v2 !== v1) return v2 - v1;
            return 0;
        });
        const topAnswer = sortedVotes[0][0];
        const topVotes = sortedVotes[0][1];
        if (topVotes >= majorityThreshold) {
            if (topVotes === numModelsQueried) {
                const detail = `(Consenso Total ${topVotes}/${numModelsQueried})`;
                logMessage('INFO', `Total Consensus: ${topAnswer} ${detail}`);
                return { answer: topAnswer, detail: detail, type: 'success' };
            } else {
                const detail = `(Maioria ${topVotes}/${numModelsQueried})`;
                logMessage('INFO', `Majority Consensus: ${topAnswer} ${detail}`);
                return { answer: topAnswer, detail: detail, type: 'success' };
            }
        } else {
            const tie = sortedVotes.length > 1 && sortedVotes[1][1] === topVotes;
            if (tie) {
                const tieDetail = sortedVotes.filter(v => v[1] === topVotes).map(([a,v]) => `${a}:${v}`).join(', ');
                logMessage('WARN', `Consensus Ambiguous (Tie, No Majority): ${tieDetail}`);
                return { answer: "Ambíguo", detail: `(${tieDetail})`, type: 'warn' };
            } else {
                const failureSummary = failedModelDetails.map(f => f.name).join(', ');
                 const detail = `(${topAnswer}:${topVotes} - Sem Maioria${failureSummary ? ` | Falhas: ${failureSummary}` : ''})`;
                logMessage('WARN', `Consensus Inconclusive (Minority Vote): ${topAnswer} ${detail}`);
                return { answer: topAnswer, detail: detail, type: 'warn' };
            }
        }
    }

    async function buildPrompt(question, imageUrls) {
        logMessage('INFO', `Building prompt (${imageUrls.length} images)...`);
        const imageParts = [];
        const imageFetchPromises = imageUrls.map(url =>
            fetchImageAsBase64(url)
                .then(base64 => {
                    let mime = 'image/jpeg';
                    if (/\.png$/i.test(url)) mime = 'image/png'; else if (/\.webp$/i.test(url)) mime = 'image/webp'; else if (/\.gif$/i.test(url)) mime = 'image/gif';
                    imageParts.push({ inlineData: { mimeType: mime, data: base64 } });
                })
                .catch(e => logMessage('WARN', `Skipping image due to error: ${url.substring(0,60)}... (${e.message})`))
        );
        await Promise.allSettled(imageFetchPromises);
        logMessage('DEBUG', `Included ${imageParts.length} images in prompt payload.`);
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
${imageParts.length > 0 ? '\nIMAGENS (Analise cuidadosamente):\n' : ''}`;
        logMessage('DEBUG', "Prompt text generated (enhanced for precision).");
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
        logMessage('INFO','Setting up UI (iOS Refined)...');
        const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);
        const estilo = { cores: { fundo: '#1C1C1E', fundoSecundario: '#2C2C2E', fundoTerciario: '#3A3A3C', texto: '#F5F5F7', textoSecundario: '#8A8A8E', accent: '#FFFFFF', accentBg: '#007AFF', secondaryAccent: '#E5E5EA', secondaryAccentBg: '#3A3A3C', erro: '#FF453A', sucesso: '#32D74B', warn: '#FFD60A', info: '#0A84FF', logDebug: '#636366', borda: '#38383A', notificationBg: 'rgba(44, 44, 46, 0.85)', copyBtnBg: '#555555' }, sombras: { menu: '0 10px 35px rgba(0, 0, 0, 0.3)', botao: '0 2px 4px rgba(0, 0, 0, 0.2)', notification: '0 5px 20px rgba(0, 0, 0, 0.3)' }, radius: '14px', radiusSmall: '8px' };
        const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '200px' : '220px'), fontSize: (window.innerWidth < 768 ? '13px' : '14px'), buttonPadding: '9px 10px', textareaHeight: '45px', titleSize: '16px' });
        const container = document.createElement('div'); container.id = 'hck-ui'; container.style.cssText = ` position: fixed; bottom: 12px; right: 12px; z-index: 10000; font-family: 'Inter', sans-serif; line-height: 1.4; `;
        const toggleBtn = document.createElement('button'); toggleBtn.id = 'hck-toggle-btn'; toggleBtn.textContent = 'HCK'; toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; padding: 8px 18px; border: 1px solid ${estilo.cores.borda}; border-radius: 22px; cursor: pointer; font-weight: 600; font-size: 15px; box-shadow: ${estilo.sombras.botao}; display: block; transition: all 0.35s ease-out; width: auto; min-width: 70px; text-align: center; &:hover { background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        const sizes = getResponsiveSize();
        const menu = document.createElement('div'); menu.id = 'hck-menu'; menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 10px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 8px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(15px) scale(0.95); transition: opacity 0.35s ease-out, transform 0.35s ease-out; position: relative; margin-bottom: 8px; max-height: 75vh; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } `;
        const header = document.createElement('div'); header.style.cssText = `display: flex; align-items: center; justify-content: center; position: relative; width: 100%; margin-bottom: 4px;`;
        const title = document.createElement('div'); title.textContent = 'HCK'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; text-align: center; flex-grow: 1; color: ${estilo.cores.texto}; `;
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` position: absolute; top: -4px; right: -4px; background: ${estilo.cores.fundoSecundario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: 600; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        header.append(title, closeBtn);
        const input = document.createElement('textarea'); input.id = 'hck-question-input'; input.placeholder = 'Cole a questão aqui...'; input.setAttribute('rows', '2'); input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 8px; margin-bottom: 0; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: 'Inter', sans-serif; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
        const imagesContainer = document.createElement('div'); imagesContainer.id = 'hck-images-container'; imagesContainer.style.cssText = ` max-height: 60px; overflow-y: auto; margin-bottom: 0; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 6px 8px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`; imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em;">Nenhuma imagem detectada</div>`;
        const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; margin-bottom: 0; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease; `;
        const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; &:hover { opacity: 0.85; } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; } `;
        const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; opacity: 1; } `;
        const updateImagesBtn = document.createElement('button'); updateImagesBtn.textContent = `Atualizar Imagens`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
        const analyzeBtn = document.createElement('button'); analyzeBtn.id = 'hck-analyze-btn'; analyzeBtn.textContent = `Analisar Questão`; analyzeBtn.style.cssText = buttonPrimaryStyle;
        const clearBtn = document.createElement('button'); clearBtn.textContent = `Limpar Tudo`; clearBtn.style.cssText = buttonSecondaryStyle;
        const logsBtn = document.createElement('button'); logsBtn.textContent = `Ver Logs`; logsBtn.style.cssText = buttonSecondaryStyle;
        const credits = document.createElement('div'); credits.textContent = `v${GM_info.script.version} by Hackermoon`; credits.style.cssText = ` text-align: center; font-size: 10px; font-weight: 500; color: ${estilo.cores.textoSecundario}; margin-top: 8px; padding-top: 6px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.7; `;
        const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-notifications'; notificationContainer.style.cssText = ` position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); z-index: 10002; display: flex; flex-direction: column; align-items: center; gap: 10px; width: auto; max-width: 90%; `;
        STATE.notificationContainer = notificationContainer;
        menu.append(header, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
        container.append(menu, toggleBtn);
        document.body.appendChild(container); document.body.appendChild(notificationContainer);
        logMessage('INFO', 'UI elements added to page.');

        const toggleMenu = (show) => { const duration = 350; if (show) { logMessage('DEBUG', 'Showing menu...'); menu.style.display = 'flex'; toggleBtn.style.opacity = '0'; toggleBtn.style.transform = 'scale(0.8) translateY(10px)'; setTimeout(() => { menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)'; toggleBtn.style.display = 'none'; }, 10); } else { logMessage('DEBUG', 'Hiding menu...'); menu.style.opacity = '0'; menu.style.transform = 'translateY(15px) scale(0.95)'; setTimeout(() => { menu.style.display = 'none'; toggleBtn.style.display = 'block'; requestAnimationFrame(() => { toggleBtn.style.opacity = '1'; toggleBtn.style.transform = 'scale(1) translateY(0)'; }); }, duration); } };
        toggleBtn.addEventListener('click', () => toggleMenu(true)); closeBtn.addEventListener('click', () => toggleMenu(false));
        const hideLogs = () => { if (STATE.logModal) { STATE.logModal.style.display = 'none'; logMessage('DEBUG', 'Hiding logs.'); } };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.style.display === 'flex') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } });
        window.addEventListener('resize', () => { const s = getResponsiveSize(); menu.style.width = s.menuWidth; input.style.minHeight = s.textareaHeight; input.style.fontSize = s.fontSize; [analyzeBtn, clearBtn, updateImagesBtn, logsBtn].forEach(b => { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }); imagesContainer.style.fontSize = `calc(${s.fontSize} - 2px)`; title.style.fontSize = s.titleSize; });

        const updateImageButtons = (images) => { if (!imagesContainer) return; if (images.length === 0) { imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem relevante</div>`; return; } imagesContainer.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 4px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; color: ${estilo.cores.texto}; font-size:0.9em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 4px; padding: 1px 4px; font-size: 9px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imagesContainer.querySelectorAll('button[data-url]').forEach(b => { b.addEventListener('mouseenter', () => b.style.backgroundColor = estilo.cores.borda); b.addEventListener('mouseleave', () => b.style.backgroundColor = estilo.cores.fundoTerciario); b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'Copiado!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => { logMessage('ERROR', 'Copy Fail:', err); e.target.textContent = 'Falha!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1500); }); }); }); };

        const showResponse = (result, duration) => { if (!STATE.notificationContainer) { logMessage('ERROR', "Notification container missing!"); return; } const { answer = "Info", detail = "", type = 'info' } = result || {}; let icon = 'ℹ️'; let titleText = answer; let detailText = detail; let effectiveDuration = duration || (type === 'error' || type === 'warn' ? CONFIG.NOTIFICATION_TIMEOUT_LONG : CONFIG.NOTIFICATION_TIMEOUT); switch (type) { case 'success': icon = '✅'; break; case 'error': icon = '❌'; break; case 'warn': icon = '⚠️'; break; case 'info': icon = 'ℹ️'; break; } const notification = document.createElement('div'); notification.style.cssText = ` background-color: ${estilo.cores.notificationBg}; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: ${estilo.cores.texto}; padding: 10px 15px; border-radius: ${estilo.radiusSmall}; box-shadow: ${estilo.sombras.notification}; display: flex; align-items: center; gap: 10px; min-width: 180px; max-width: 320px; opacity: 0; transform: translateY(15px); transition: opacity 0.3s ease-out, transform 0.3s ease-out; border: 1px solid ${estilo.cores.borda}; cursor: pointer; `; const iconSpan = document.createElement('span'); iconSpan.textContent = icon; iconSpan.style.fontSize = '1.2em'; const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.95em; line-height: 1.3;`; textContent.innerHTML = `<span style="font-weight: 600; color: ${estilo.cores.texto};">${titleText}</span> ${detailText ? `<span style="font-size: 0.9em; color: ${estilo.cores.textoSecundario}; margin-left: 3px;">${detailText}</span>` : ''}`; let dismissTimeout; const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(20px)'; setTimeout(() => notification.remove(), 300); }; notification.onclick = dismiss; notification.append(iconSpan, textContent); STATE.notificationContainer.appendChild(notification); requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }); dismissTimeout = setTimeout(dismiss, effectiveDuration); logMessage('INFO', `Notify (${effectiveDuration}ms): ${titleText} ${detailText}. Type: ${type}`); };

        const createLogModal = () => { if (STATE.logModal) return; logMessage('DEBUG', 'Creating log modal.'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.75); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 15px 20px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 85%; max-width: 800px; height: 75%; max-height: 650px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; `; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 8px; gap: 10px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = 'Logs Detalhados'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 16px; flex-grow: 1;`; const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar Logs'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: background-color 0.2s ease; flex-shrink: 0; &:hover { background: ${estilo.cores.borda}; }`; copyLogBtn.onclick = () => { const textToCopy = STATE.logMessages.map(log => `[${log.timestamp} ${log.level}] ${log.message}`).join('\n'); navigator.clipboard.writeText(textToCopy).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar Logs'; }, 2000); logMessage('INFO', 'Logs copied.'); }).catch(err => { logMessage('ERROR', 'Failed to copy logs:', err); copyLogBtn.textContent = 'Erro!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar Logs'; }, 2000); }); }; const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs; modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11px; line-height: 1.6; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 10px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal; };
        const showLogs = () => { logMessage('DEBUG', 'showLogs called.'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal.querySelector('#hck-log-area'); if (!logArea) return; logMessage('INFO', `Displaying ${STATE.logMessages.length} logs.`); const logColors = { ERROR: estilo.cores.erro, WARN: estilo.cores.warn, INFO: estilo.cores.info, DEBUG: estilo.cores.logDebug, DEFAULT: estilo.cores.textoSecundario }; const sanitize = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; }; logArea.innerHTML = STATE.logMessages.map(log => { const color = logColors[log.level] || logColors.DEFAULT; return `<span style="color: ${color}; font-weight: bold;">[${log.timestamp} ${log.level}]</span> <span style="color:${estilo.cores.texto};">${sanitize(log.message)}</span>`; }).join('\n'); STATE.logModal.style.display = 'flex'; logArea.scrollTop = logArea.scrollHeight; };
        logsBtn.addEventListener('click', showLogs);

        return { elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer, toggleBtn }, helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs } };
    }

    function init() {
        logMessage('INFO','----- HCK Enhanced Initializing -----');
        logMessage('INFO', `Version: ${GM_info.script.version}`);
        try {
            const ui = setupUI();
            if (!ui) throw new Error("UI setup failed critically.");
            logMessage('INFO','UI setup complete.');

            const { input, analyzeBtn, clearBtn, updateImagesBtn, toggleBtn } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;
            const estilo = { cores: { erro: '#FF453A', accentBg: '#007AFF', fundoSecundario: '#2C2C2E', textoSecundario: '#8A8A8E', borda: '#38383A' }}; // Re-define necessary colors locally for setAnalyzeButtonState

            const setAnalyzeButtonState = (analyzing, rateLimited = false) => {
                 if (rateLimited) {
                     analyzeBtn.disabled = true;
                     analyzeBtn.textContent = `Limite Atingido...`;
                     analyzeBtn.style.backgroundColor = estilo.cores.erro;
                     if(toggleBtn) toggleBtn.style.borderColor = estilo.cores.erro;
                 } else if (analyzing) {
                     analyzeBtn.disabled = true;
                     analyzeBtn.textContent = `Analisando...`;
                     analyzeBtn.style.backgroundColor = estilo.cores.accentBg;
                     if(toggleBtn) toggleBtn.style.borderColor = estilo.cores.borda;
                 } else {
                     analyzeBtn.disabled = false;
                     analyzeBtn.textContent = `Analisar Questão`;
                     analyzeBtn.style.backgroundColor = estilo.cores.accentBg;
                      if(toggleBtn) toggleBtn.style.borderColor = estilo.cores.borda;
                 }
             };

            analyzeBtn.onclick = async () => {
                logMessage('INFO', "----- Analysis Button Clicked -----");
                const question = input.value.trim();
                if (STATE.isAnalyzing) {
                    logMessage('WARN', `Analysis ignored: Already analyzing.`);
                    showResponse({answer: "Aguarde", detail: "Análise em progresso", type: 'warn' });
                    return;
                }
                if (STATE.rateLimitActive) {
                     logMessage('WARN', `Analysis ignored: Global rate limit backoff active.`);
                     showResponse({answer: "Limite Atingido", detail: "Aguarde um momento e tente novamente.", type: 'error' });
                     setAnalyzeButtonState(false, true);
                     setTimeout(() => { if (!STATE.isAnalyzing) setAnalyzeButtonState(false, false); }, 3000);
                     return;
                 }
                if (!question) {
                    logMessage('WARN', `Analysis ignored: Question input empty.`);
                    showResponse({answer: "Erro", detail: "Insira o texto da questão", type: 'error' });
                    input.focus();
                    return;
                }
                STATE.isAnalyzing = true;
                setAnalyzeButtonState(true);
                logMessage("INFO", "Starting analysis...");
                logMessage("DEBUG", `Question: ${question.substring(0,100)}...`);
                let analysisError = null;
                try {
                    const images = extractImages();
                    updateImageButtons(images);
                    const prompt = await buildPrompt(question, images);
                    logMessage('INFO', `Querying ${CONFIG.MODELS.length} models...`);
                    const promises = CONFIG.MODELS.map(modelInfo =>
                        fetchWithRetry(modelInfo.name, () => queryGemini(modelInfo, prompt))
                            .catch(e => {
                                logMessage('ERROR', `[${modelInfo.name}] FINAL FAILURE: ${e.message}`);
                                return Promise.reject(e);
                            })
                    );
                    const results = await Promise.allSettled(promises);
                    const rateLimitHit = results.some(r => r.status === 'rejected' && r.reason?.message?.includes('Rate Limit'));
                    if (rateLimitHit && !STATE.rateLimitActive) {
                         logMessage('WARN', 'Rate limit detected during consensus phase. Activating global flag.');
                         STATE.rateLimitActive = true;
                         if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId);
                         STATE.rateLimitTimeoutId = setTimeout(() => { STATE.rateLimitActive = false; logMessage('INFO', 'Global rate limit backoff deactivated.'); STATE.rateLimitTimeoutId = null; }, 30000);
                     }
                    logMessage('INFO', 'Determining consensus...');
                    const consensusResult = determineConsensus(results);
                    showResponse(consensusResult);
                } catch (error) {
                    analysisError = error;
                    logMessage("ERROR", "Critical error during analysis setup/execution:", error);
                    showResponse({ answer: "Erro Crítico", detail: `Falha: ${error.message}`, type: 'error' });
                } finally {
                    STATE.isAnalyzing = false;
                    setAnalyzeButtonState(false, STATE.rateLimitActive);
                    if (STATE.rateLimitActive) {
                        setTimeout(() => {
                            if (!STATE.isAnalyzing) setAnalyzeButtonState(false, false);
                        }, 3000);
                    }
                    logMessage("INFO", "----- Analysis Finished -----");
                }
            };

            clearBtn.onclick = () => { logMessage('INFO', "----- Clear Clicked -----"); input.value = ''; STATE.images = []; STATE.imageCache = {}; updateImageButtons([]); input.focus(); logMessage("INFO", "Inputs cleared."); showResponse({answer: "Limpado", type: 'info'}, 3000); };
            updateImagesBtn.onclick = () => { logMessage('INFO', "----- Update Images Clicked -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imagens Atualizadas", detail:`${STATE.images.length} ok.`, type:'info'}, 3000); } catch (e) { logMessage("ERROR","Img Update Err:",e); showResponse({answer:"Erro Imagens", detail:"Falha leitura.", type:'error'}); }};

            setTimeout(() => { logMessage("INFO", "Initial img extract..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Initial Img Err:", e); }}, 2000);

            logMessage('INFO','----- HCK Initialized -----');

        } catch (error) {
            logMessage('ERROR', '!!! CRITICAL INIT ERROR !!!', error);
            alert(`[HCK Init Fail]: ${error.message}. Script might not work. Check Console (F12).`);
        }
    }

    init();

})();
