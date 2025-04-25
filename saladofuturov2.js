javascript:(function() {
    'use strict';

    // --- VERIFICAÇÃO DE INSTÂNCIA ---
    if (document.getElementById('hck-beta-ui-bookmarklet')) {
        console.warn('[HCK BETA Bookmarklet] Já está em execução.');
        try { document.getElementById('hck-beta-toggle-btn')?.focus(); } catch(e) {}
        return;
    }
    console.log('[HCK BETA Bookmarklet] Iniciando...');

    // --- CONFIGURAÇÃO HCK BETA ---
    const SCRIPT_VERSION = '9.2.1-hck-beta-bb-multi-fix'; // <- Nova Versão com Fix
    const API_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 HCK-Beta/${SCRIPT_VERSION}`;
    const CONFIG = {
        BLACKBOX_API_URL: 'https://www.blackbox.ai/api/chat',
        // --- LISTA EXTENSA DE MODELOS (Sintaxe Verificada) ---
        MODELS: [
            { name: 'Blackbox Default', id: 'blackbox', type: 'blackbox' },
            { name: 'Llama 3.1 70B Turbo', id: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', type: 'blackbox' },
            { name: 'Deepseek Chat', id: 'deepseek-chat', type: 'blackbox' },
            { name: 'Deepseek Coder', id: 'deepseek-coder', type: 'blackbox' },
            { name: 'Deepseek Math', id: 'deepseek-math', type: 'blackbox' },
            { name: 'Deepseek V2', id: 'deepseek-v2', type: 'blackbox' },
            { name: 'Command R', id: 'command-r', type: 'blackbox' },
            { name: 'Command R Plus', id: 'command-r-plus', type: 'blackbox' },
            { name: 'Gemini 1.5 Pro', id: 'gemini-1.5-pro', type: 'blackbox' },
            { name: 'Claude 3 Opus', id: 'claude-3-opus', type: 'blackbox' },
            { name: 'Claude 3 Sonnet', id: 'claude-3-sonnet', type: 'blackbox' },
            { name: 'GPT-4o', id: 'gpt-4o', type: 'blackbox' },
            { name: 'GPT-4 Turbo', id: 'gpt-4-turbo', type: 'blackbox' },
            { name: 'GPT-3.5 Turbo', id: 'gpt-3.5-turbo', type: 'blackbox' }
        ],
        TIMEOUT: 40000, MAX_RETRIES: 1, API_RETRY_DELAY_BASE: 2500,
        API_RATE_LIMIT_DELAY_MULTIPLIER: 5.0, TEMPERATURE: 0.25, TOP_P: 0.9,
        MAX_OUTPUT_TOKENS: 15, NOTIFICATION_TIMEOUT: 5500, NOTIFICATION_TIMEOUT_LONG: 10000,
    };

    // --- FILTROS DE IMAGEM (UI Only) ---
    const IMAGE_FILTERS = { /* ... (código igual) ... */
        blocked: [ /edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i, /conteudo_logo\.png$/i, /logo_sala_do_futuro\.png$/i, /_thumb(?:nail)?\./i, /\.svg$/i ], allowed: [ /edusp-static\.ip\.tv\/(?:tms|tarefas|exercicios)\//i, /\/atividade\/\d+\?eExame=true/i, /\.(?:jpg|png|jpeg|gif|webp)$/i, /lh[0-9]+(?:- G*)*\.googleusercontent\.com/i, /\/media\//i, /\/questao_\d+/i, /image\?/i ], verify(src) { if (!src || typeof src !== 'string' || !src.startsWith('http')) return false; if (this.blocked.some(r => r.test(src))) { /* logMessage('DEBUG', `Image blocked: ${src.substring(0,80)}...`); */ return false; } if (this.allowed.some(r => r.test(src))) { /* logMessage('DEBUG', `Image allowed: ${src.substring(0,80)}...`); */ return true; } /* logMessage('DEBUG', `Image implicitly blocked: ${src.substring(0,80)}...`); */ return false; } }; // Logs comentados para reduzir ruído

    // --- ESTADO GLOBAL ---
    const STATE = { isAnalyzing: false, images: [], logMessages: [], logModal: null, notificationContainer: null, rateLimitActive: false, rateLimitTimeoutId: null, selectedModelId: CONFIG.MODELS[0]?.id || 'blackbox' };

    // --- ESTILO GLOBAL ---
    const estilo = { /* ... (código igual) ... */
        cores: { fundo: '#1A1B1E', fundoSecundario: '#2A2B2E', fundoTerciario: '#3A3B3E', texto: '#EAEAEA', textoSecundario: '#9A9A9E', accent: '#000000', accentBg: '#57FFC1', secondaryAccent: '#EAEAEA', secondaryAccentBg: '#3A3B3E', erro: '#FF5F57', sucesso: '#57FFC1', warn: '#FFBD2E', info: '#5AC8FA', logDebug: '#8A8A8E', borda: '#4A4B4E', notificationBg: 'rgba(32, 33, 36, 0.9)', copyBtnBg: '#555555', spinner: '#000000' }, sombras: { menu: '0 12px 40px rgba(0, 0, 0, 0.5)', botao: '0 3px 6px rgba(0, 0, 0, 0.3)', notification: '0 6px 25px rgba(0, 0, 0, 0.4)' }, radius: '10px', radiusSmall: '6px' };

    // --- FUNÇÕES AUXILIARES ---
    const generateUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `fallback-${Date.now()}-${Math.random().toString(16).substring(2)}`;
    const getLogColor = (level) => { const cores = { ERROR: estilo.cores.erro, WARN: estilo.cores.warn, INFO: estilo.cores.info, DEBUG: estilo.cores.logDebug, TEXT: estilo.cores.texto, DEFAULT: estilo.cores.textoSecundario }; return cores[level.toUpperCase()] || cores.DEFAULT; };
    const sanitizeHtml = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; };

    // --- LOGGING ---
    const logMessage = (level, ...args) => { /* ... (lógica interna e de atualização do modal igual) ... */
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });
        const message = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2) : String(arg); } catch { return '[Object Non-Serializable]'; } }).join(' ');
        STATE.logMessages.push({ timestamp, level, message }); if (STATE.logMessages.length > 600) { STATE.logMessages.shift(); }
        const consoleArgs = [`[HCK ${timestamp}]`, ...args]; switch(level.toUpperCase()) { case 'ERROR': console.error(...consoleArgs); break; case 'WARN': console.warn(...consoleArgs); break; case 'INFO': console.info(...consoleArgs); break; case 'DEBUG': console.debug(...consoleArgs); break; default: console.log(...consoleArgs); }
        if (STATE.logModal && STATE.logModal.style.display === 'flex') {
            const logArea = STATE.logModal.querySelector('#hck-log-area'); if (logArea) {
                const scrollThreshold = 100; const isScrolledToBottom = logArea.scrollHeight - logArea.clientHeight <= logArea.scrollTop + scrollThreshold; const color = getLogColor(level); const sanitizedMsg = sanitizeHtml(message); const logEntry = document.createElement('div'); logEntry.style.marginBottom = '4px'; logEntry.style.wordBreak = 'break-word'; logEntry.innerHTML = `<span style="color: ${color}; font-weight: bold; margin-right: 5px; user-select: none;">[${timestamp} ${level}]</span> <span style="color:${getLogColor('TEXT')};">${sanitizedMsg}</span>`; logArea.appendChild(logEntry); if (isScrolledToBottom) { logArea.scrollTop = logArea.scrollHeight; }
            }
        }
    };

    // --- FUNÇÕES DE REDE ---
    const withTimeout = (promise, ms) => Promise.race([ promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)) ]);
    async function fetchWithRetry(modelName, apiType, callback, retries = CONFIG.MAX_RETRIES) { /* ... (lógica igual) ... */
        logMessage('DEBUG', `[${modelName}/${apiType}] FetchRetry (Max ${retries})...`); for (let attempt = 0; attempt <= retries; attempt++) { try { if (STATE.rateLimitActive && attempt === 0) { const d = 1500; logMessage('WARN', `[${modelName}] RateLimit Global. Delay ${d}ms`); await new Promise(r => setTimeout(r, d)); } return await withTimeout(callback(), CONFIG.TIMEOUT); } catch (error) { logMessage('ERROR', `[${modelName}/${apiType}] Tentativa ${attempt + 1}/${retries + 1} Falha: ${error.message}`, error.stack ? `\nStack: ${error.stack}` : ''); const isCors = error instanceof TypeError && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('networkerror')); const isTimeout = error.message.toLowerCase().includes('timeout'); const isAbort = error.name === 'AbortError'; if (isCors || isTimeout || isAbort || attempt === retries) { if (isCors) logMessage('ERROR', `[${modelName}/${apiType}] Falha Rede/CORS.`); else if (isTimeout) logMessage('ERROR', `[${modelName}/${apiType}] Timeout (${CONFIG.TIMEOUT}ms).`); else if (isAbort) logMessage('ERROR', `[${modelName}/${apiType}] Abortado.`); else logMessage('ERROR', `[${modelName}/${apiType}] Max ${retries + 1} tentativas.`); throw error; } let delay; const isRL = error.message.includes('429') || error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many requests') || error.message.toLowerCase().includes('cloudflare'); if (isRL) { if (!STATE.rateLimitActive) { logMessage('WARN', `[${modelName}/${apiType}] RateLimit/Block (${error.message}). Backoff Global ON.`); STATE.rateLimitActive = true; if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId); STATE.rateLimitTimeoutId = setTimeout(() => { logMessage('INFO', 'Backoff Global OFF.'); STATE.rateLimitActive = false; STATE.rateLimitTimeoutId = null; if (!STATE.isAnalyzing) setAnalyzeButtonState(false, false); }, 75000); } delay = CONFIG.API_RETRY_DELAY_BASE * CONFIG.API_RATE_LIMIT_DELAY_MULTIPLIER * (attempt + 1); logMessage('WARN', `[${modelName}/${apiType}] RateLimit/Block. Backoff ${delay}ms`); } else { delay = CONFIG.API_RETRY_DELAY_BASE * (attempt + 1); logMessage('INFO', `[${modelName}/${apiType}] Erro (${error.message}). Tentando ${delay}ms`); } await new Promise(resolve => setTimeout(resolve, delay)); } } throw new Error(`[${modelName}/${apiType}] Falha fetchWithRetry.`);
    }

    // --- EXTRAÇÃO DE IMAGENS (UI Only) ---
    function extractImages() { /* ... (lógica igual) ... */
        logMessage('DEBUG', "Extraindo Imagens (UI)..."); const urls = new Set(); document.querySelectorAll('img[src], [style*="background-image"], [data-image], .card-img-top, .questao-imagem').forEach(el => { let src = null; try { if (el.tagName === 'IMG' && el.src) src = el.src; else if (el.dataset.image) src = el.dataset.image; else if (el.style.backgroundImage) { const m = el.style.backgroundImage.match(/url\("?(.+?)"?\)/); if (m && m[1]) src = m[1]; } if (src) { const absUrl = new URL(src, window.location.href).toString(); if (IMAGE_FILTERS.verify(absUrl)) { urls.add(absUrl); } } } catch (e) { logMessage('WARN', `Erro processar img URL: ${src || '?'}. ${e.message}`); } }); STATE.images = Array.from(urls).slice(0, 8); logMessage('INFO', `${STATE.images.length} imagens (UI).`); return STATE.images; }

    // --- CONSULTA BLACKBOX ---
    async function queryBlackboxInternal(modelInfo, promptPayload) { /* ... (lógica igual) ... */
        const { name: modelName, id: modelId } = modelInfo; const apiUrl = CONFIG.BLACKBOX_API_URL; logMessage('INFO', `[${modelName}/Blackbox] Consultando API...`); logMessage('DEBUG', `[${modelName}/Blackbox] Payload (trunc):`, JSON.stringify(promptPayload).substring(0, 500) + (JSON.stringify(promptPayload).length > 500 ? '...' : '')); const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', 'Origin': 'https://www.blackbox.ai', 'Referer': 'https://www.blackbox.ai/', 'User-Agent': API_USER_AGENT }; try { const t0 = performance.now(); const response = await fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(promptPayload), mode: 'cors', credentials: 'omit' }); const t1 = performance.now(); logMessage('DEBUG', `[${modelName}/Blackbox] Status: ${response.status}. Tempo: ${((t1 - t0)/1000).toFixed(2)}s`); const body = await response.text(); logMessage('DEBUG', `[${modelName}/Blackbox] Resp Bruta (trunc):`, body.substring(0, 800) + (body.length > 800 ? '...' : '')); if (!response.ok) { logMessage('ERROR', `[${modelName}/Blackbox] HTTP ${response.status}: ${response.statusText}. Corpo: ${body.substring(0, 500)}`); if (response.status === 403 || response.status === 503 || body.toLowerCase().includes('cloudflare')) throw new Error(`API Blocked (CF ${response.status})`); if (response.status === 429) throw new Error(`API Rate Limit (429)`); throw new Error(`API Error ${response.status}: ${response.statusText}`); } const answerMatch = body.match(/\$ANSWER\$(.*)/); if (answerMatch?.[1]) { const extr = answerMatch[1].trim(); logMessage('INFO', `[${modelName}/Blackbox] Resp ($ANSWER$): "${extr}"`); return extr; } const lines = body.split('\n').map(l => l.trim()).filter(l => l); if (lines.length > 0) { const last = lines[lines.length - 1]; try { const json = JSON.parse(last); if (json && typeof json === 'string') { logMessage('INFO', `[${modelName}/Blackbox] Resp (JSON str): "${json}"`); return json; } } catch (e) {} logMessage('INFO', `[${modelName}/Blackbox] Resp (last line): "${last}"`); return last; } logMessage('WARN', `[${modelName}/Blackbox] Extração falhou. Corpo inteiro.`); return body; } catch (error) { if (error instanceof TypeError && (error.message.toLowerCase().includes('fetch')||error.message.toLowerCase().includes('network'))) { logMessage('ERROR', `[${modelName}/Blackbox] Fetch/CORS: ${error.message}. Extensão?`); throw new Error(`Falha Fetch/CORS: ${error.message}`); } logMessage('ERROR', `[${modelName}/Blackbox] Falha Req/Proc: ${error.message}`); throw error; }
    }

    // --- FORMATAÇÃO DA RESPOSTA (A-E) ---
    function formatResponse(answer) { /* ... (lógica igual) ... */
        if (typeof answer !== 'string') return null; const cleaned = answer.trim().replace(/[\*`"']/g, ''); let match = cleaned.match(/^(?:[\[\("]*)([A-E])(?:[\.\)\]"]*)$/i); if (match?.[1]) { logMessage('DEBUG', `Format Resp: Letra isolada: "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); } match = cleaned.match(/(?:alternativa|letra|opção|resposta(?: correta)? é)\s*:?\s*([A-E])(?:\b|[.\)])/i); if (match?.[1]) { logMessage('DEBUG', `Format Resp: Padrão Alt X: "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); } if (cleaned.length <= 5) { match = cleaned.match(/(?:^|\s)([A-E])(?:$|\s)/); if (match?.[1]) { logMessage('DEBUG', `Format Resp: Isolada (curta): "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); } } match = cleaned.match(/([A-E])/i); if (match?.[1]) { logMessage('DEBUG', `Format Resp: Primeira A-E: "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); } logMessage('WARN', `Falha ao formatar resposta: "${answer}".`); return null; }

    // --- CONSTRUÇÃO DO PROMPT (Blackbox com Model ID) ---
    async function buildPrompt(question, imageUrls, modelInfo) { /* ... (lógica igual) ... */
        logMessage('INFO', `Build Prompt para ${modelInfo.name} (ID: ${modelInfo.id})...`); let imgWarn = ''; if (imageUrls.length > 0) { imgWarn = '\n(AVISO: Imagens NÃO enviadas.)\n'; logMessage('WARN', 'Imagens detectadas, não incluídas na API.'); } const promptText = `CONTEXTO: Questão múltipla escolha (A, B, C, D, E). OBJETIVO: Identificar a ÚNICA alternativa CORRETA. INSTRUÇÕES: Retorne APENAS a LETRA MAIÚSCULA da alternativa correta (A, B, C, D ou E). FORMATO ESTRITO: UMA LETRA MAIÚSCULA, NADA MAIS.\n\nQUESTÃO:\n${question}\n${imgWarn}`; logMessage('DEBUG', "Prompt gerado."); const payload = { messages: [{ id: generateUUID(), content: promptText, role: "user" }], userId: generateUUID(), model: modelInfo.id, codeModelMode: modelInfo.codeMode === true, agentMode: {}, trendingAgentMode: {}, isMicMode: false, isChromeExt: false, githubToken: null, }; logMessage('DEBUG', `Payload final com 'model: ${modelInfo.id}'`); return payload;
    }

    // --- SETUP UI (Compacta) ---
    function setupUI() {
        logMessage('INFO','Configurando UI (HCK BETA Compact)...');
        let uiElements = null; // Para retornar no final
        try {
            // Font link
            try { const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink); } catch (e) { logMessage('WARN', 'Falha ao injetar Google Font.'); }

            const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '200px' : '220px'), fontSize: (window.innerWidth < 768 ? '12px' : '13px'), buttonPadding: '8px 10px', textareaHeight: '45px', titleSize: '16px' });
            const container = document.createElement('div'); container.id = 'hck-beta-ui-bookmarklet'; container.style.cssText = ` position: fixed; bottom: 12px; right: 12px; z-index: 10000; font-family: 'Inter', sans-serif; line-height: 1.4; `;
            const toggleBtn = document.createElement('button'); toggleBtn.id = 'hck-beta-toggle-btn';
            toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${estilo.cores.accentBg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin: auto;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`; // SVG size reduzido
            toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; border: 1.5px solid ${estilo.cores.borda}; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; box-shadow: ${estilo.sombras.botao}; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.accentBg}; transform: scale(1.05); } `;
            const sizes = getResponsiveSize();
            const menu = document.createElement('div'); menu.id = 'hck-beta-menu';
            menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 10px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 8px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(15px) scale(0.95); transition: opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0.3s; position: relative; margin-bottom: 8px; max-height: 75vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; visibility: hidden; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `;

            const header = document.createElement('div'); /* ... (código igual) ... */ header.style.cssText = `display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;`;
            const title = document.createElement('div'); /* ... (código igual) ... */ title.textContent = 'HCK β'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; color: ${estilo.cores.accentBg}; font-family: 'Roboto Mono', monospace; letter-spacing: 0.5px; `;
            const closeBtn = document.createElement('button'); /* ... (código igual) ... */ closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` background: transparent; border: none; color: ${estilo.cores.textoSecundario}; font-size: 22px; font-weight: 400; cursor: pointer; padding: 0 2px; line-height: 1; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `; header.append(title, closeBtn);

            const modelSelectorContainer = document.createElement('div'); /* ... (código igual) ... */ modelSelectorContainer.style.cssText = `display: flex; flex-direction: column; gap: 3px;`;
            const modelLabel = document.createElement('label'); /* ... (código igual) ... */ modelLabel.textContent = 'Modelo:'; modelLabel.style.cssText = `font-size: calc(${sizes.fontSize} - 2px); color: ${estilo.cores.textoSecundario}; font-weight: 500; margin-left: 2px;`;
            const modelSelect = document.createElement('select'); modelSelect.id = 'hck-beta-model-select'; /* ... (estilos e população com loop igual) ... */
            modelSelect.style.cssText = ` width: 100%; padding: 5px 8px; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; font-size: calc(${sizes.fontSize} - 1px); font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${estilo.cores.textoSecundario.substring(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 8px center; background-size: 9px auto; padding-right: 25px; cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease; &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; }`;
            CONFIG.MODELS.forEach(model => { const option = document.createElement('option'); option.value = model.id; option.textContent = model.name; modelSelect.appendChild(option); }); modelSelect.value = STATE.selectedModelId; modelSelect.addEventListener('change', (e) => { STATE.selectedModelId = e.target.value; logMessage('INFO', `Modelo: ${STATE.selectedModelId}`); const selMod = CONFIG.MODELS.find(m=>m.id===STATE.selectedModelId); document.getElementById('hck-beta-analyze-btn').textContent = `Analisar (${selMod?.name.split(' ')[0] || '?'})`; }); modelSelectorContainer.append(modelLabel, modelSelect);

            const input = document.createElement('textarea'); /* ... (código igual) ... */ input.id = 'hck-beta-question-input'; input.placeholder = 'Cole a questão...'; input.setAttribute('rows', '2'); input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 8px; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
            const imagesContainer = document.createElement('div'); /* ... (código igual) ... */ imagesContainer.id = 'hck-beta-images-container'; imagesContainer.style.cssText = ` max-height: 60px; overflow-y: auto; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 5px 8px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundoSecundario}; &::-webkit-scrollbar { width: 4px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 2px; }`; imagesContainer.innerHTML = `<div style="text-align: center; padding: 2px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem detectada</div>`;

            const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s ease; `; const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; font-weight: 600; &:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 3px 7px rgba(87, 255, 193, 0.15); } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; box-shadow: none; } `; const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.textoSecundario}; } `;
            const updateImagesBtn = document.createElement('button'); /* ... (código igual) ... */ updateImagesBtn.innerHTML = `🔄 <span style="margin-left: -2px;">Imgs (UI)</span>`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
            const analyzeBtn = document.createElement('button'); analyzeBtn.id = 'hck-beta-analyze-btn'; const selModOnLoad = CONFIG.MODELS.find(m=>m.id===STATE.selectedModelId); analyzeBtn.textContent = `Analisar (${selModOnLoad?.name.split(' ')[0] || '?'})`; analyzeBtn.style.cssText = buttonPrimaryStyle;
            const clearBtn = document.createElement('button'); /* ... (código igual) ... */ clearBtn.innerHTML = `🗑️ <span style="margin-left: -2px;">Limpar</span>`; clearBtn.style.cssText = buttonSecondaryStyle;
            const logsBtn = document.createElement('button'); /* ... (código igual) ... */ logsBtn.innerHTML = `📄 <span style="margin-left: -2px;">Logs</span>`; logsBtn.style.cssText = buttonSecondaryStyle;

            const credits = document.createElement('div'); /* ... (código igual com link) ... */
            credits.style.cssText = ` text-align: center; font-size: 9px; font-weight: 400; margin-top: 8px; padding-top: 6px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.7; `; const versionSpan = document.createElement('span'); versionSpan.style.cssText = `color: ${estilo.cores.textoSecundario}; letter-spacing: 0.3px;`; versionSpan.textContent = `v${SCRIPT_VERSION}`; const separator = document.createElement('span'); separator.style.cssText = `margin: 0 4px; color: ${estilo.cores.borda};`; separator.textContent = "|"; const authorLink = document.createElement('a'); authorLink.href = "https://github.com/notsopreety/blackbox-api-v2"; authorLink.target = "_blank"; authorLink.rel = "noopener noreferrer"; authorLink.style.cssText = `color: ${estilo.cores.textoSecundario}; text-decoration: none; transition: color 0.2s ease; &:hover { color: ${estilo.cores.info}; }`; authorLink.textContent = "by Hackermoon"; credits.append(versionSpan, separator, authorLink);

            const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-beta-notifications'; notificationContainer.style.cssText = ` position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); z-index: 10002; display: flex; flex-direction: column; align-items: center; gap: 10px; width: auto; max-width: 90%; `; STATE.notificationContainer = notificationContainer;

            // Append final
            menu.append(header, modelSelectorContainer, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
            container.append(menu, toggleBtn); // Adiciona menu e botão ao container principal
            document.body.appendChild(container); // Adiciona o container ao body
            document.body.appendChild(notificationContainer); // Adiciona notificações ao body
            logMessage('INFO', 'Elementos da UI adicionados ao DOM.');

            // --- Funções de Controle da UI ---
            const toggleMenu = (show) => {
                const duration = 300;
                // Referências aos elementos DENTRO da função para garantir que existam no momento da chamada
                const menuEl = document.getElementById('hck-beta-menu');
                const toggleBtnEl = document.getElementById('hck-beta-toggle-btn');
                if (!menuEl || !toggleBtnEl) {
                    logMessage('ERROR', 'Menu ou botão Toggle não encontrado para toggleMenu.');
                    return;
                }

                if (show) {
                    logMessage('DEBUG', 'Mostrando menu...');
                    menuEl.style.display = 'flex'; // Garante que está no fluxo ANTES da animação
                    menuEl.style.visibility = 'visible';
                    toggleBtnEl.style.opacity = '0';
                    toggleBtnEl.style.transform = 'scale(0.8) translateY(10px)';
                    // Pequeno delay para permitir que 'display: flex' seja aplicado antes da transição
                    setTimeout(() => {
                        menuEl.style.opacity = '1';
                        menuEl.style.transform = 'translateY(0) scale(1)';
                        toggleBtnEl.style.display = 'none'; // Esconde o botão toggle
                    }, 10); // 10ms pode ser suficiente
                } else {
                    logMessage('DEBUG', 'Escondendo menu...');
                    menuEl.style.opacity = '0';
                    menuEl.style.transform = 'translateY(15px) scale(0.95)';
                    setTimeout(() => {
                        menuEl.style.visibility = 'hidden';
                        menuEl.style.display = 'none'; // Esconde após a animação
                        toggleBtnEl.style.display = 'flex'; // Mostra o botão toggle
                        requestAnimationFrame(() => { // Garante que o botão está visível para animar
                            toggleBtnEl.style.opacity = '1';
                            toggleBtnEl.style.transform = 'scale(1) translateY(0)';
                        });
                    }, duration);
                }
            };
            toggleBtn.addEventListener('click', () => toggleMenu(true));
            closeBtn.addEventListener('click', () => toggleMenu(false));

            const hideLogs = () => { /* ... (lógica igual) ... */
                if (STATE.logModal) { STATE.logModal.style.opacity = '0'; STATE.logModal.querySelector('div').style.transform = 'scale(0.95)'; setTimeout(() => STATE.logModal.style.display = 'none', 300); logMessage('DEBUG', 'Escondendo logs.'); } };
            document.addEventListener('keydown', (e) => { const menuEl = document.getElementById('hck-beta-menu'); if (e.key === 'Escape') { if (menuEl?.style.visibility === 'visible') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } }); // Usa menuEl
            window.addEventListener('resize', () => { /* ... (lógica igual) ... */
                 const s = getResponsiveSize(); const menuEl = document.getElementById('hck-beta-menu'); if(menuEl) menuEl.style.width = s.menuWidth; const inputEl = document.getElementById('hck-beta-question-input'); if(inputEl) { inputEl.style.minHeight = s.textareaHeight; inputEl.style.fontSize = s.fontSize;} const btns = ['hck-beta-analyze-btn', 'hck-beta-clear-btn', 'hck-beta-update-images-btn', 'hck-beta-logs-btn']; btns.forEach(id => { const b = document.getElementById(id); if(b) { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }}); const imgCont = document.getElementById('hck-beta-images-container'); if(imgCont) imgCont.style.fontSize = `calc(${s.fontSize} - 2px)`; const titleEl = menuEl?.querySelector('div > div'); if(titleEl) titleEl.style.fontSize = s.titleSize; const selEl = document.getElementById('hck-beta-model-select'); if(selEl) selEl.style.fontSize = `calc(${s.fontSize} - 1px)`; const lblEl = selEl?.previousElementSibling; if(lblEl) lblEl.style.fontSize = `calc(${s.fontSize} - 2px)`;});

            const updateImageButtons = (images) => { /* ... (lógica igual) ... */
                 const imgCont = document.getElementById('hck-beta-images-container'); if (!imgCont) return; if (images.length === 0) { imgCont.innerHTML = `<div style="text-align: center; padding: 2px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem detectada</div>`; return; } imgCont.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 4px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; color: ${estilo.cores.texto}; font-size:0.85em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 3px; padding: 1px 4px; font-size: 9px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imgCont.querySelectorAll('button[data-url]').forEach(b => { b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'Copiado!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => { logMessage('ERROR', 'Falha copiar URL:', err); e.target.textContent = 'Falha!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1500); }); }); }); };

            const showResponse = (result, duration) => { /* ... (lógica igual com animação melhorada) ... */
                if (!STATE.notificationContainer) { logMessage('ERROR', "Notif container NULL!"); return; } const { answer = "Info", detail = "", type = 'info', modelName = '' } = result || {}; let icon = 'ℹ️'; let titleText = answer; let detailText = detail + (modelName ? ` <span style='opacity: 0.7;'>(${modelName})</span>` : ''); let effectiveDuration = duration || (type === 'error' || type === 'warn' ? CONFIG.NOTIFICATION_TIMEOUT_LONG : CONFIG.NOTIFICATION_TIMEOUT); let bgColor = estilo.cores.notificationBg; let titleColor = estilo.cores.texto; let borderColor = estilo.cores.borda; switch (type) { case 'success': icon = '✅'; titleColor = estilo.cores.sucesso; borderColor = estilo.cores.sucesso + '80'; break; case 'error': icon = '❌'; titleColor = estilo.cores.erro; borderColor = estilo.cores.erro + '80'; break; case 'warn': icon = '⚠️'; titleColor = estilo.cores.warn; borderColor = estilo.cores.warn + '80'; break; case 'info': icon = 'ℹ️'; titleColor = estilo.cores.info; borderColor = estilo.cores.info + '80'; break; } const notification = document.createElement('div'); notification.style.cssText = ` background-color: ${bgColor}; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: ${estilo.cores.texto}; padding: 10px 15px; border-radius: ${estilo.radiusSmall}; box-shadow: ${estilo.sombras.notification}; display: flex; align-items: center; gap: 10px; min-width: 180px; max-width: 320px; opacity: 0; transform: translateY(25px) scale(0.98); transition: opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); border: 1px solid ${estilo.cores.borda}; border-left: 3px solid ${borderColor}; cursor: pointer; `; const iconSpan = document.createElement('span'); iconSpan.textContent = icon; iconSpan.style.fontSize = '1.2em'; iconSpan.style.marginLeft = '2px'; const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.95em; line-height: 1.3; word-break: break-word;`; textContent.innerHTML = `<span style="font-weight: 600; color: ${titleColor};">${titleText}</span> ${detailText ? `<span style="font-size: 0.88em; color: ${estilo.cores.textoSecundario}; margin-left: 3px; display: inline-block;">${detailText}</span>` : ''}`; let dismissTimeout; const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(30px) scale(0.95)'; setTimeout(() => notification.remove(), 350); }; notification.onclick = dismiss; notification.append(iconSpan, textContent); STATE.notificationContainer.appendChild(notification); requestAnimationFrame(() => { requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0) scale(1)'; }); }); dismissTimeout = setTimeout(dismiss, effectiveDuration); logMessage('INFO', `Notificação (${type}): ${titleText} ${detail}`); };

            const createLogModal = () => { /* ... (lógica igual) ... */
                 if (STATE.logModal) return; logMessage('DEBUG', 'Criando modal logs...'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; inset: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity 0.3s ease-out;`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 15px 20px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 90%; max-width: 900px; height: 85%; max-height: 750px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; transform: scale(0.95); transition: transform 0.3s ease-out;`; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 8px; gap: 15px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = '📄 Logs Detalhados'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 16px; flex-grow: 1; font-family: 'Roboto Mono', monospace;`; const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; &:hover { background: ${estilo.cores.borda}; color: ${estilo.cores.texto}; }`; copyLogBtn.onclick = () => { const text = STATE.logMessages.map(log => `[${log.timestamp} ${log.level}] ${log.message}`).join('\n'); navigator.clipboard.writeText(text).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(()=>copyLogBtn.textContent='Copiar', 2000); logMessage('INFO','Logs copiados.'); }).catch(err => { logMessage('ERROR','Falha copiar logs:', err); copyLogBtn.textContent='Erro!'; setTimeout(()=>copyLogBtn.textContent='Copiar', 2000); }); }; const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 20px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs; modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11px; line-height: 1.6; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 10px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: 'Roboto Mono', monospace; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal; };
            const showLogs = () => { /* ... (lógica igual) ... */
                 logMessage('DEBUG', 'showLogs'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal?.querySelector('#hck-log-area'); if (!logArea || !STATE.logModal) { logMessage('ERROR', 'Modal/Área log NULL.'); return; } logMessage('INFO', `Exibindo ${STATE.logMessages.length} logs.`); logArea.innerHTML = STATE.logMessages.map(log => { const color = getLogColor(log.level); const msg = sanitizeHtml(log.message); return `<div style="margin-bottom: 4px; word-break: break-word;"><span style="color: ${color}; font-weight: bold; margin-right: 5px; user-select: none;">[${log.timestamp} ${level}]</span> <span style="color:${getLogColor('TEXT')};">${msg}</span></div>`; }).join(''); STATE.logModal.style.display = 'flex'; requestAnimationFrame(() => { STATE.logModal.style.opacity = '1'; STATE.logModal.querySelector('div').style.transform = 'scale(1)'; }); logArea.scrollTop = logArea.scrollHeight; };
            logsBtn.addEventListener('click', showLogs);

            // Retorna os elementos e helpers criados com sucesso
            uiElements = {
                elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer, toggleBtn, modelSelect },
                helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs }
            };
            logMessage('INFO', 'setupUI concluído com sucesso.');

        } catch (error) {
            logMessage('ERROR', '!!! ERRO DURANTE setupUI !!!', error);
            console.error(`[HCK BETA setupUI Fail]: ${error.message}. Stack: ${error.stack || 'N/A'}`);
            // Não re-lança o erro aqui, pois o catch em init() tratará a falha geral.
            // Mas garante que uiElements permaneça null.
        }
        return uiElements; // Retorna null se ocorreu erro
    }

    // --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
    function init() {
        logMessage('INFO',`----- HCK BETA Bookmarklet Inicializando (v${SCRIPT_VERSION}) -----`);
        let ui = null; // Inicializa como null
        try {
            ui = setupUI(); // Chama setupUI e armazena o resultado
            if (!ui) {
                // Se setupUI retornou null (devido a erro interno), lança um erro para o catch principal
                throw new Error("Falha crítica na configuração da UI HCK BETA (setupUI retornou null).");
            }
            logMessage('INFO','UI configurada com sucesso.');

            // Desestrutura apenas se ui não for null
            const { input, analyzeBtn, clearBtn, updateImagesBtn, toggleBtn, modelSelect } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;

            // Define a função global para estado do botão
            window.setAnalyzeButtonState = (analyzing, rateLimited = false) => { /* ... (lógica igual) ... */
                 const btn = document.getElementById('hck-beta-analyze-btn'); const tglBtn = document.getElementById('hck-beta-toggle-btn'); const sel = document.getElementById('hck-beta-model-select'); if (!btn) return; const model = CONFIG.MODELS.find(m=>m.id===STATE.selectedModelId); const baseTxt = `Analisar (${model?.name.split(' ')[0] || '?'})`; btn.disabled = analyzing || rateLimited; if(sel) sel.disabled = analyzing || rateLimited; if (rateLimited) { btn.textContent = `Limite...`; btn.style.backgroundColor = estilo.cores.erro; btn.style.color = '#FFFFFF'; if(tglBtn) tglBtn.style.borderColor = estilo.cores.erro; } else if (analyzing) { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" ...><path>...</path><path>...</path></svg> Analisando...`; btn.style.backgroundColor = estilo.cores.accentBg; btn.style.color = estilo.cores.accent; if(tglBtn) tglBtn.style.borderColor = estilo.cores.borda; } else { btn.textContent = baseTxt; btn.style.backgroundColor = estilo.cores.accentBg; btn.style.color = estilo.cores.accent; if(tglBtn) tglBtn.style.borderColor = estilo.cores.borda; } };

            // --- AÇÃO DO BOTÃO ANALISAR ---
            analyzeBtn.onclick = async () => { /* ... (lógica interna igual) ... */
                const t0 = performance.now(); logMessage('INFO', "----- Analisar Click -----"); const question = input.value.trim(); const model = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId); if (!model) { logMessage('ERROR', "Modelo NULL."); showResponse({answer: "Erro Config", detail: "Selecione modelo.", type: 'error' }); return; } if (STATE.isAnalyzing) { logMessage('WARN', `Ignorado: Analisando.`); showResponse({answer: "Aguarde", type: 'warn' }); return; } if (STATE.rateLimitActive) { logMessage('WARN', `Ignorado: Rate limit.`); showResponse({answer: "Limite", detail: "Aguarde.", type: 'error' }); setAnalyzeButtonState(false, true); return; } if (!question) { logMessage('WARN', `Ignorado: Questão vazia.`); showResponse({answer: "Erro", detail: "Insira questão.", type: 'error' }); input.focus(); return; } STATE.isAnalyzing = true; setAnalyzeButtonState(true); logMessage("INFO", `Analisando com ${model.name}...`); logMessage("DEBUG", `Questão (início): ${question.substring(0,100)}...`); try { const images = extractImages(); updateImageButtons(images); const payload = await buildPrompt(question, images, model); logMessage('INFO', `Consultando ${model.name}...`); const result = await fetchWithRetry( model.name, 'blackbox', () => queryBlackboxInternal(model, payload) ); logMessage('INFO', `Resposta ${model.name}. Formatando...`); const fmtAnswer = formatResponse(result); const t1 = performance.now(); const dur = ((t1 - t0)/1000).toFixed(1); if (fmtAnswer) { logMessage('INFO', `Resposta Final: ${fmtAnswer} (${dur}s)`); showResponse({ answer: fmtAnswer, detail: `~${dur}s`, type: 'success', modelName: model.name }); } else { logMessage('WARN', `Formato irreconhecível (${dur}s).`); showResponse({ answer: "Formato?", detail: `Resp não reconhecida (${result.substring(0, 20)}...) ~${dur}s`, type: 'warn', modelName: model.name }); } } catch (error) { const t1 = performance.now(); const dur = ((t1 - t0)/1000).toFixed(1); logMessage("ERROR", `Erro análise ${model.name} (${dur}s):`, error); let detMsg = `Falha: ${error.message.substring(0,80)}`; if (error.message.toLowerCase().includes('cors')) detMsg = "Falha Rede/CORS."; else if (error.message.toLowerCase().includes('rate limit')) { detMsg = "Limite req."; setAnalyzeButtonState(false, true); } else if (error.message.toLowerCase().includes('cloudflare') || error.message.toLowerCase().includes('blocked')) { detMsg = "API bloqueada."; setAnalyzeButtonState(false, true); } else if (error.message.toLowerCase().includes('timeout')) detMsg = `Timeout (${CONFIG.TIMEOUT/1000}s).`; showResponse({ answer: "Erro Análise", detail: `${detMsg} ~${dur}s`, type: 'error', modelName: model.name }); } finally { STATE.isAnalyzing = false; setAnalyzeButtonState(false, STATE.rateLimitActive); logMessage("INFO", "----- Análise Finalizada -----"); } };

            // --- OUTROS BOTÕES ---
            clearBtn.onclick = () => { logMessage('INFO', "----- Limpar -----"); input.value = ''; STATE.images = []; updateImageButtons([]); input.focus(); logMessage("INFO", "Campos limpos."); showResponse({answer: "Limpado", type: 'info'}, 3000); };
            updateImagesBtn.onclick = () => { logMessage('INFO', "----- Update Imgs -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imgs (UI) OK", detail:`${STATE.images.length} detectadas.`, type:'info'}, 3000); } catch (e) { logMessage("ERROR","Erro update imgs:",e); showResponse({answer:"Erro Imgs", detail:"Falha leitura.", type:'error'}); }};

            // Extração inicial e abrir menu
            setTimeout(() => { logMessage("INFO", "Extração inicial (UI)..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Erro extração inicial:", e); }}, 1500);
            logMessage('INFO',`----- HCK BETA Bookmarklet Inicializado (v${SCRIPT_VERSION}) -----`);

            // Chama toggleMenu a partir do helper retornado por setupUI
            ui.helpers.toggleMenu(true);

        } catch (error) {
            logMessage('ERROR', '!!! ERRO CRÍTICO NA INICIALIZAÇÃO !!!', error);
            console.error(`[HCK BETA Init Fail]: ${error.message}. Stack: ${error.stack || 'N/A'}`);
            alert(`[HCK BETA Bookmarklet Init Fail]: ${error.message}. Ver console (F12).`);
            // Tenta remover UI se criada parcialmente
            try { document.getElementById('hck-beta-ui-bookmarklet')?.remove(); } catch(e){}
            try { document.getElementById('hck-beta-notifications')?.remove(); } catch(e){}
            try { document.getElementById('hck-log-modal')?.remove(); } catch(e){}
        }
    }
    // --- Executa ---
    init();

})();
