// ==UserScript==
// @name         HCK - Prova Paulista
// @namespace    http://tampermonkey.net/
// @version      7.4.0
// @description  Análise multi-IA com UI refinada estilo iOS, notificações e logs aprimorados.
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

    // --- CONFIGURATIONS ---
    const CONFIG = {
        GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
        MODELS: [ { name: 'Pro 1.5', id: 'gemini-1.5-pro' }, { name: 'Flash 1.5', id: 'gemini-1.5-flash' } ],
        API_KEY_GEMINI: 'AIzaSyBwEiziXQ79LP7IKq93pmLM8b3qnwXn6bQ',
        TIMEOUT: 25000, MAX_RETRIES: 1, TEMPERATURE: 0.4,
        NOTIFICATION_TIMEOUT: 5000, // Default dismiss time (ms)
        NOTIFICATION_TIMEOUT_LONG: 8000 // Longer time for errors/warnings
    };

    // --- IMAGE FILTERING ---
    const IMAGE_FILTERS = {
        blocked: [ /edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i, /conteudo_logo\.png$/i, /_thumb(?:nail)?\./i, /\.svg$/i ],
        allowed: [ /edusp-static\.ip\.tv\/(?:tms|tarefas|exercicios)\//i, /\/atividade\/\d+\?eExame=true/i, /\.(?:jpg|png|jpeg|gif|webp)$/i, /lh[0-9]+(?:- G*)*\.googleusercontent\.com/i, /\/media\//i, /\/questao_\d+/i, /image\?/i ],
        verify(src) { if (!src || typeof src !== 'string' || !src.startsWith('http')) return false; if (this.blocked.some(r => r.test(src))) return false; return this.allowed.some(r => r.test(src)); }
    };

    // --- GLOBAL STATE ---
    const STATE = { isAnalyzing: false, images: [], imageCache: {}, logMessages: [], logModal: null, notificationContainer: null };

    // --- UTILITIES ---
    const logMessage = (level, ...args) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        // Attempt to stringify objects, handle potential circular references simply
        const message = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); } catch { return '[Object]'; } }).join(' ');
        STATE.logMessages.push({ timestamp, level, message });
        if (STATE.logMessages.length > 250) { STATE.logMessages.shift(); } // Increased log buffer slightly
        if (level === 'ERROR') console.error(`[HCK ${timestamp}]`, ...args);
        // else if (level === 'WARN') console.warn(`[HCK ${timestamp}]`, ...args); // Optional console warnings
    };

    const withTimeout = (promise, ms) => Promise.race([ promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)) ]);

    async function fetchWithRetry(modelName, callback, retries = CONFIG.MAX_RETRIES) {
        logMessage('DEBUG', `[${modelName}] fetchRetry (Retries: ${retries})`);
        for (let i = 0; i <= retries; i++) {
            try { return await withTimeout(callback(), CONFIG.TIMEOUT); }
            catch (error) { logMessage('ERROR', `[${modelName}] Attempt ${i + 1}/${retries + 1} failed: ${error.message}`); if (i === retries) throw error; await new Promise(r => setTimeout(r, 1300 * (i + 1))); }
        }
    }

    // --- IMAGE HANDLING ---
    async function fetchImageAsBase64(url) {
        if (STATE.imageCache[url]) return STATE.imageCache[url];
        logMessage('INFO', `Fetching image: ${url.substring(0, 80)}...`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url, responseType: 'arraybuffer', timeout: CONFIG.TIMEOUT,
                onload: function(response) { if (response.status >= 200 && response.status < 300) { try { const bytes = new Uint8Array(response.response); if (bytes.length === 0) throw new Error("Empty buffer"); const base64 = window.btoa(bytes.reduce((a, b) => a + String.fromCharCode(b), '')); STATE.imageCache[url] = base64; logMessage('DEBUG', `Img cached: ${url.substring(0, 60)}...`); resolve(base64); } catch (e) { logMessage('ERROR', `Img Conv Err ${url}:`, e); reject(new Error(`Conv failed`)); } } else { logMessage('ERROR', `Img HTTP Err ${response.status}: ${url}`); reject(new Error(`HTTP ${response.status}`)); } },
                onerror: function(e) { logMessage('ERROR', `Img Net Err ${url}: Check connection/permissions/CORS? Details:`, e); reject(new Error(`Network Err`)); }, // Added CORS hint
                ontimeout: function() { logMessage('ERROR', `Img Timeout: ${url}`); reject(new Error(`Timeout Err`)); }
            });
        });
    }

    function extractImages() {
        logMessage('DEBUG', "Extracting images..."); const urls = new Set();
        document.querySelectorAll('img[src], [style*="background-image"], [data-image]').forEach(el => { let src = null; try { if (el.tagName === 'IMG' && el.src) src = el.src; else if (el.dataset.image) src = el.dataset.image; else if (el.style.backgroundImage) { const m = el.style.backgroundImage.match(/url\("?(.+?)"?\)/); if (m && m[1]) src = m[1]; } if (src) { const absUrl = new URL(src, window.location.href).toString(); if (IMAGE_FILTERS.verify(absUrl)) urls.add(absUrl); } } catch (e) { logMessage('WARN', `URL parse/verify err: ${src}`); } });
        STATE.images = Array.from(urls).slice(0, 8); logMessage('INFO', `Extraction done. ${STATE.images.length} images.`); return STATE.images;
    }

    // --- AI INTERACTION ---
    async function queryGemini(modelInfo, prompt) {
        const { id: modelId, name: modelName } = modelInfo; logMessage('INFO', `[${modelName}] Querying API...`); logMessage('DEBUG', `[${modelName}] Prompt Text:`, prompt.contents[0].parts[0].text.substring(0, 150) + "...");
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST', url: `${CONFIG.GEMINI_API_BASE_URL}${modelId}:generateContent?key=${CONFIG.API_KEY_GEMINI}`,
                headers: { 'Content-Type': 'application/json', 'User-Agent': `Tampermonkey HCK/${GM_info.script.version}` }, // Standard UA
                data: JSON.stringify(prompt), timeout: CONFIG.TIMEOUT,
                onload: function(response) {
                    logMessage('DEBUG', `[${modelName}] Resp Status: ${response.status}`);
                    try {
                        const data = JSON.parse(response.responseText);
                        // Log potential API-level blocks or issues first
                        if (data.promptFeedback?.blockReason) { logMessage('WARN', `[${modelName}] API Blocked. Reason: ${data.promptFeedback.blockReason}. Safety Ratings:`, data.promptFeedback.safetyRatings); }
                        if (response.status >= 200 && response.status < 300) {
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) { logMessage('INFO', `[${modelName}] Raw Resp: "${text}"`); resolve(text); }
                            else { const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'No Text'; logMessage('WARN', `[${modelName}] No text/Blocked. Reason: ${reason}`); reject(new Error(`API ${reason}`)); }
                        } else { // Handle HTTP errors
                             const errorMsg = data?.error?.message || response.statusText || 'Unknown API Err';
                             logMessage('ERROR', `[${modelName}] API HTTP Err ${response.status}: ${errorMsg}. Check API Key/Quota? Details:`, data?.error?.details);
                             reject(new Error(`API Err ${response.status}`)); }
                    } catch (error) { logMessage('ERROR', `[${modelName}] Resp Process Fail:`, error, response.responseText); reject(new Error('Resp Process Fail')); }
                },
                onerror: function(error) { logMessage('ERROR', `[${modelName}] Network Err: Check connection/CORS/Firewall? Details:`, error); reject(new Error('API Network Err')); }, // Added hints
                ontimeout: function() { logMessage('ERROR', `[${modelName}] Timeout. Network or API slow?`); reject(new Error('API Timeout Err')); }
            });
        });
    }

    function formatResponse(answer) { if (typeof answer !== 'string') return null; const match = answer.trim().match(/^[A-E]/i); const formatted = match ? match[0].toUpperCase() : null; logMessage('DEBUG', `Formatting "${answer || ''}" -> "${formatted || 'null'}"`); return formatted; }

     function determineConsensus(results) {
        logMessage('INFO', 'Determining consensus...'); const validAnswers = {}; let errors = 0;
        results.forEach((result, index) => { const modelName = CONFIG.MODELS[index]?.name || `Model ${index + 1}`; if (result.status === 'fulfilled') { const formatted = formatResponse(result.value); if (formatted) { validAnswers[formatted] = (validAnswers[formatted] || 0) + 1; logMessage('INFO', `[${modelName}] Voted: ${formatted}`); } else { logMessage('WARN', `[${modelName}] Invalid format: "${result.value}"`); errors++; } } else { logMessage('ERROR', `[${modelName}] Failed: ${result.reason}`); errors++; } });
        const numModels = results.length; const numValidVotes = Object.values(validAnswers).reduce((s, c) => s + c, 0); if (numValidVotes === 0) { logMessage('ERROR', 'Consensus Fail: No valid answers.'); return { answer: "Falha", detail: "Nenhuma resposta válida", type: 'error' }; }
        let maxVotes = 0; let consensusAnswer = null; let isTie = false;
        for (const [answer, votes] of Object.entries(validAnswers)) { if (votes > maxVotes) { maxVotes = votes; consensusAnswer = answer; isTie = false; } else if (votes === maxVotes) { isTie = true; } }
        let detail = ""; let type = 'success';
        if (isTie && Object.keys(validAnswers).length > 1) { consensusAnswer = "Ambíguo"; detail = `(${Object.entries(validAnswers).map(([a, v]) => `${a}:${v}`).join(', ')})`; logMessage('WARN', `Consensus ambiguous: ${detail}`); type = 'warn';
        } else if (maxVotes === numModels) { detail = `(Consenso ${maxVotes}/${numModels})`; logMessage('INFO', `Consensus Total: ${consensusAnswer} ${detail}`);
        } else if (maxVotes > (numModels - maxVotes)) { detail = `(Maioria ${maxVotes}/${numModels})`; logMessage('INFO', `Consensus Majority: ${consensusAnswer} ${detail}`);
        } else { consensusAnswer = Object.keys(validAnswers)[0]; detail = `(Único ${maxVotes}/${numModels})`; logMessage('WARN', `Consensus Single Valid: ${consensusAnswer} ${detail}`); type = 'warn'; } // Changed to warn as it's less certain
        return { answer: consensusAnswer, detail: detail, type }; // Removed 'error' boolean, use 'type'
    }

    async function buildPrompt(question, imageUrls) {
        logMessage('INFO', `Building prompt (${imageUrls.length} images)...`); const imageParts = [];
        const promises = imageUrls.map(url => fetchImageAsBase64(url).then(base64 => { let mime = 'image/jpeg'; if (/\.png$/i.test(url)) mime = 'image/png'; else if (/\.webp$/i.test(url)) mime = 'image/webp'; else if (/\.gif$/i.test(url)) mime = 'image/gif'; imageParts.push({ inlineData: { mimeType: mime, data: base64 } }); }).catch(e => logMessage('WARN', `Skipping image: ${url.substring(0,60)}...`)));
        await Promise.allSettled(promises);
        const promptText = `CONTEXTO: Prova Paulista/Sala do Futuro (A, B, C, D, E). OBJETIVO: Identificar a ÚNICA alternativa correta. INSTRUÇÕES: 1. ANÁLISE: Leia pergunta/imagens. 2. RACIOCÍNIO INTERNO: Pense passo a passo (não mostre). 3. RESPOSTA FINAL: Retorne APENAS a letra MAIÚSCULA da alternativa correta (A, B, C, D ou E). REGRAS RÍGIDAS: * SOMENTE A LETRA (A-E). * NADA MAIS (sem texto, pontos, explicações). * SE INCERTO, escolha a mais provável (formato de letra única). QUESTÃO: ${question} ${imageParts.length > 0 ? 'IMAGENS (Analise):' : ''}`;
        logMessage('DEBUG', "Prompt text generated.");
        return { contents: [{ parts: [{ text: promptText }, ...imageParts] }], generationConfig: { temperature: CONFIG.TEMPERATURE, topP: 0.95, topK: 40, maxOutputTokens: 50 } };
    }

    // --- UI SETUP ---
    function setupUI() {
        logMessage('INFO','Setting up UI (iOS Refined)...');

        const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);

        const estilo = {
            cores: { fundo: '#1C1C1E', fundoSecundario: '#2C2C2E', fundoTerciario: '#3A3A3C', texto: '#F5F5F7', textoSecundario: '#8A8A8E', accent: '#FFFFFF', accentBg: '#007AFF', // iOS Blue for primary action
                     secondaryAccent: '#E5E5EA', secondaryAccentBg: '#3A3A3C', erro: '#FF453A', sucesso: '#32D74B', warn: '#FFD60A', info: '#0A84FF', // iOS Info Blue
                     logDebug: '#636366', borda: '#38383A', notificationBg: 'rgba(44, 44, 46, 0.85)', // Slightly opaque dark gray
                     copyBtnBg: '#555555' },
            sombras: { menu: '0 10px 35px rgba(0, 0, 0, 0.3)', botao: '0 2px 4px rgba(0, 0, 0, 0.2)', notification: '0 5px 20px rgba(0, 0, 0, 0.3)' },
            radius: '14px', // iOS Large Radius
            radiusSmall: '8px' // iOS Standard Radius
        };

        const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '200px' : '220px'), fontSize: (window.innerWidth < 768 ? '13px' : '14px'), buttonPadding: '9px 10px', textareaHeight: '45px', titleSize: '16px' });

        const container = document.createElement('div'); container.id = 'hck-ui'; container.style.cssText = ` position: fixed; bottom: 12px; right: 12px; z-index: 10000; font-family: 'Inter', sans-serif; line-height: 1.4; `;
        const toggleBtn = document.createElement('button'); toggleBtn.textContent = 'HCK'; toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; padding: 8px 18px; border: 1px solid ${estilo.cores.borda}; border-radius: 22px; cursor: pointer; font-weight: 600; font-size: 15px; box-shadow: ${estilo.sombras.botao}; display: block; transition: all 0.35s ease-out; width: auto; min-width: 70px; text-align: center; &:hover { background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `; // Larger Toggle

        const sizes = getResponsiveSize();
        const menu = document.createElement('div'); menu.id = 'hck-menu'; menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 10px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 8px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(15px) scale(0.95); transition: opacity 0.35s ease-out, transform 0.35s ease-out; position: relative; margin-bottom: 8px; max-height: 75vh; overflow-y: auto; scrollbar-width: none; /* Hide scrollbar */ `; // Increased radius

        const header = document.createElement('div'); header.style.cssText = `display: flex; align-items: center; justify-content: center; position: relative; width: 100%; margin-bottom: 4px;`;
        const title = document.createElement('div'); title.textContent = 'HCK'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; text-align: center; flex-grow: 1; color: ${estilo.cores.texto}; `;
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` position: absolute; top: -4px; right: -4px; background: ${estilo.cores.fundoSecundario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: 600; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        header.append(title, closeBtn);

        const input = document.createElement('textarea'); input.id = 'hck-question-input'; input.placeholder = 'Cole a questão...'; input.setAttribute('rows', '2'); input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 8px; margin-bottom: 0; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: 'Inter', sans-serif; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
        const imagesContainer = document.createElement('div'); imagesContainer.id = 'hck-images-container'; imagesContainer.style.cssText = ` max-height: 60px; overflow-y: auto; margin-bottom: 0; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 6px 8px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: none; `; imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em;">Nenhuma imagem</div>`;

        const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; margin-bottom: 0; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.2s ease, background-color 0.2s ease; `;
        const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; &:hover { opacity: 0.85; } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; } `;
        const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; opacity: 1; } `;

        // Buttons with Text Labels
        const updateImagesBtn = document.createElement('button'); updateImagesBtn.textContent = `Imagens`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
        const analyzeBtn = document.createElement('button'); analyzeBtn.textContent = `Analisar`; analyzeBtn.style.cssText = buttonPrimaryStyle;
        const clearBtn = document.createElement('button'); clearBtn.textContent = `Limpar`; clearBtn.style.cssText = buttonSecondaryStyle;
        const logsBtn = document.createElement('button'); logsBtn.textContent = `Logs`; logsBtn.style.cssText = buttonSecondaryStyle;

        const credits = document.createElement('div'); credits.textContent = `by Hackermoon`; credits.style.cssText = ` text-align: center; font-size: 10px; font-weight: 500; color: ${estilo.cores.textoSecundario}; margin-top: 8px; padding-top: 6px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.7; `;

        // Notification Container (Higher z-index)
        const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-notifications'; notificationContainer.style.cssText = ` position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); z-index: 10002; /* Higher than menu */ display: flex; flex-direction: column; align-items: center; gap: 10px; width: auto; max-width: 90%; `;
        STATE.notificationContainer = notificationContainer;

        menu.append(header, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
        container.append(menu, toggleBtn);
        document.body.appendChild(container); document.body.appendChild(notificationContainer);
        logMessage('INFO', 'UI elements added.');

        // --- UI Interactions ---
        const toggleMenu = (show) => { const duration = 350; if (show) { logMessage('DEBUG', 'Showing menu...'); menu.style.display = 'flex'; toggleBtn.style.opacity = '0'; toggleBtn.style.transform = 'scale(0.8) translateY(10px)'; setTimeout(() => { menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)'; toggleBtn.style.display = 'none'; }, 10); } else { logMessage('DEBUG', 'Hiding menu...'); menu.style.opacity = '0'; menu.style.transform = 'translateY(15px) scale(0.95)'; setTimeout(() => { menu.style.display = 'none'; toggleBtn.style.display = 'block'; toggleBtn.style.opacity = '1'; toggleBtn.style.transform = 'scale(1) translateY(0)'; }, duration); } };
        toggleBtn.addEventListener('click', () => toggleMenu(true)); closeBtn.addEventListener('click', () => toggleMenu(false));
        const hideLogs = () => { if (STATE.logModal) STATE.logModal.style.display = 'none'; logMessage('DEBUG', 'Hiding logs.'); };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.style.display === 'flex') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } });
        window.addEventListener('resize', () => { /* Basic resize */ const s = getResponsiveSize(); menu.style.width = s.menuWidth; input.style.minHeight = s.textareaHeight; input.style.fontSize = s.fontSize; [analyzeBtn, clearBtn, updateImagesBtn, logsBtn].forEach(b => { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }); imagesContainer.style.fontSize = `calc(${s.fontSize} - 2px)`; title.style.fontSize = s.titleSize; });

        const updateImageButtons = (images) => { /* Compact Image List */ if (!imagesContainer) return; if (images.length === 0) { imagesContainer.innerHTML = `<div style="text-align: center; padding: 1px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem</div>`; return; } imagesContainer.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 4px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; color: ${estilo.cores.texto}; font-size:0.9em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 4px; padding: 1px 4px; font-size: 9px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imagesContainer.querySelectorAll('button').forEach(b => { b.addEventListener('mouseenter', () => b.style.backgroundColor = estilo.cores.borda); b.addEventListener('mouseleave', () => b.style.backgroundColor = estilo.cores.fundoTerciario); b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'OK!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => logMessage('ERROR', 'Copy Fail:', err)); }); }); };

        // --- Notification Function (Variable Duration, Refined Style) ---
        const showResponse = (result, duration) => {
            if (!STATE.notificationContainer) { logMessage('ERROR', "Notification container missing!"); return; }
            const { answer, detail, type = 'info' } = result;

            let icon = 'ℹ️'; let titleText = answer; let detailText = detail || '';
            let effectiveDuration = duration || CONFIG.NOTIFICATION_TIMEOUT; // Use passed duration or default

            // Set icon, potentially adjust title/detail based on type, set longer duration for errors/warnings
            switch (type) {
                case 'success': icon = '✅'; break;
                case 'error': icon = '❌'; effectiveDuration = duration || CONFIG.NOTIFICATION_TIMEOUT_LONG; break;
                case 'warn': icon = '⚠️'; effectiveDuration = duration || CONFIG.NOTIFICATION_TIMEOUT_LONG; break;
                case 'info': icon = 'ℹ️'; break;
            }

            const notification = document.createElement('div');
            notification.style.cssText = `
                background-color: ${estilo.cores.notificationBg};
                backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); /* Stronger blur */
                color: ${estilo.cores.texto};
                padding: 10px 15px;
                border-radius: ${estilo.radiusSmall}; /* Standard radius */
                box-shadow: ${estilo.sombras.notification};
                display: flex; align-items: center; gap: 10px;
                min-width: 180px; max-width: 320px; /* Slightly wider max */
                opacity: 0; transform: translateY(15px);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                border: 1px solid ${estilo.cores.borda}; /* Subtle border */
            `;

            const iconSpan = document.createElement('span');
            iconSpan.textContent = icon;
            iconSpan.style.fontSize = '1.2em';

            const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.95em; line-height: 1.3;`;
            textContent.innerHTML = `<span style="font-weight: 600; color: ${estilo.cores.texto};">${titleText}</span> ${detailText ? `<span style="font-size: 0.9em; color: ${estilo.cores.textoSecundario}; margin-left: 3px;">${detailText}</span>` : ''}`;

            const closeNotifBtn = document.createElement('button'); closeNotifBtn.innerHTML = '×'; closeNotifBtn.style.cssText = ` background: none; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: 600; cursor: pointer; padding: 0 2px; line-height: 1; opacity: 0.7; transition: opacity 0.2s ease; &:hover { opacity: 1; } `;

            let dismissTimeout;
            const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(20px)'; setTimeout(() => notification.remove(), 300); };

            closeNotifBtn.onclick = dismiss;
            notification.append(iconSpan, textContent, closeNotifBtn);
            STATE.notificationContainer.appendChild(notification);

            requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }); // Animate in
            dismissTimeout = setTimeout(dismiss, effectiveDuration); // Use effective duration

            logMessage('INFO', `Notify (${effectiveDuration}ms): ${titleText} ${detailText}. Type: ${type}`);
        };

        // --- Log Modal Setup (with Copy Button) ---
        const createLogModal = () => {
             if (STATE.logModal) return; logMessage('DEBUG', 'Creating log modal.'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.75); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 15px 20px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 85%; max-width: 800px; height: 75%; max-height: 650px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; `; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 8px; gap: 10px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = 'Logs Detalhados'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 16px; flex-grow: 1;`;
             // Copy Logs Button
             const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar Logs'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: background-color 0.2s ease; &:hover { background: ${estilo.cores.borda}; }`;
             copyLogBtn.onclick = () => { const logArea = STATE.logModal?.querySelector('#hck-log-area'); if (logArea) { navigator.clipboard.writeText(logArea.innerText || logArea.textContent).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar Logs'; }, 2000); logMessage('INFO', 'Logs copied to clipboard.'); }).catch(err => logMessage('ERROR', 'Failed to copy logs:', err)); } };
             // Close Button
             const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 18px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs;
             modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); // Add copy button
             const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11px; line-height: 1.6; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 10px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal;
        };
        const showLogs = () => { /* Log display - B&W colors adjusted */ logMessage('DEBUG', 'showLogs called.'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal.querySelector('#hck-log-area'); if (!logArea) return; logMessage('INFO', `Displaying ${STATE.logMessages.length} logs.`); const logColors = { ERROR: estilo.cores.erro, WARN: estilo.cores.warn, INFO: estilo.cores.info, DEBUG: estilo.cores.logDebug, DEFAULT: estilo.cores.textoSecundario }; logArea.textContent = STATE.logMessages.map(log => { const color = logColors[log.level] || logColors.DEFAULT; // Use textContent for easy copying
             return `[${log.timestamp} ${log.level}] ${log.message}`; }).join('\n'); // CSS will color based on class/selector later if needed, but simple text is best for copying.
             // Reapply basic coloring via spans if needed, but makes copying harder. Let's stick to text for copy button functionality.
             logArea.innerHTML = STATE.logMessages.map(log => { const color = logColors[log.level] || logColors.DEFAULT; return `<span style="color: ${color}; font-weight: bold;">[${log.timestamp} ${log.level}]</span> <span style="color:${estilo.cores.texto};">${log.message.replace(/</g, "<").replace(/>/g, ">")}</span>`; }).join('\n');

             STATE.logModal.style.display = 'flex'; logArea.scrollTop = logArea.scrollHeight; };
        logsBtn.addEventListener('click', showLogs);

        return {
            elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer },
            helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs }
        };
    }

    // --- INITIALIZATION ---
    function init() {
        logMessage('INFO','----- HCK iOS Refined Initializing -----');
        try {
            const ui = setupUI(); if (!ui) throw new Error("UI setup failed.");
            logMessage('INFO','UI setup complete.');

            const { input, analyzeBtn, clearBtn, updateImagesBtn, imagesContainer } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;

            analyzeBtn.onclick = async () => {
                logMessage('INFO', "----- Analysis Clicked -----");
                const question = input.value.trim();
                if (STATE.isAnalyzing || !question) { logMessage('WARN', `Analysis skip (Busy: ${STATE.isAnalyzing}, Empty: ${!question})`); if(!question) showResponse({answer: "Erro", detail: "Insira questão", type: 'error' }); return; }
                STATE.isAnalyzing = true; analyzeBtn.disabled = true; analyzeBtn.textContent = `Analisando...`; // Text change on busy
                logMessage("INFO", "Starting analysis..."); logMessage("INFO", `Question: ${question.substring(0,100)}...`);
                try {
                    const images = extractImages(); updateImageButtons(images);
                    const prompt = await buildPrompt(question, images);
                    logMessage('INFO', `Querying ${CONFIG.MODELS.length} models...`);
                    const promises = CONFIG.MODELS.map(m => fetchWithRetry(m.name, () => queryGemini(m, prompt)));
                    const results = await Promise.allSettled(promises);
                    const consensusResult = determineConsensus(results);
                    showResponse(consensusResult);
                } catch (error) { logMessage("ERROR", "Pre-analysis fail:", error); showResponse({ answer: "Erro", detail: `Falha Pré-Análise`, type: 'error' }); }
                finally { STATE.isAnalyzing = false; analyzeBtn.disabled = false; analyzeBtn.textContent = `Analisar`; logMessage("INFO", "----- Analysis finished -----"); } // Restore text
            };

            clearBtn.onclick = () => { logMessage('INFO', "----- Clear Clicked -----"); input.value = ''; STATE.images = []; STATE.imageCache = {}; updateImageButtons([]); input.focus(); logMessage("INFO", "Inputs cleared."); showResponse({answer: "Limpado", type: 'info'}); };
            updateImagesBtn.onclick = () => { logMessage('INFO', "----- Update Images Clicked -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imagens", detail:`${STATE.images.length} ok.`, type:'info'}); } catch (e) { logMessage("ERROR","Img Update Err:",e); showResponse({answer:"Erro Imagens", detail:"Falha leitura.", type:'error'}); }};

            setTimeout(() => { logMessage("INFO", "Initial img extract..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Initial Img Err:", e); }}, 1800);
            logMessage('INFO','----- HCK Initialized -----');

        } catch (error) { logMessage('ERROR', '!!! CRITICAL INIT ERROR !!!', error); alert(`HCK Init Fail:\n${error.message}`); }
    }

    init(); // Start

})();
