javascript:(function() {
    // ===== CONFIGURAÇÕES =====
    const TARGET_SITE = 'saladofuturo.educacao.sp.gov.br';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743457974/ui.js'; // Atualize com seu UI.js
    
    // Camadas de fallback (ordem de prioridade)
    const API_OPTIONS = [
        { 
            name: "Blackbox Principal",
            url: "https://www.blackbox.ai/api/chat",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: (prompt) => JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "blackbox",
                stream: false
            })
        },
        {
            name: "Blackbox Mirror",
            url: "https://blackbox-mirror.vercel.app/api/chat", // Exemplo de mirror
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: (prompt) => JSON.stringify({ prompt })
        },
        {
            name: "Local Solver",
            handler: (prompt) => {
                // Fallback local que analisa padrões no HTML
                const alternatives = document.querySelectorAll('.alternativa');
                for (const alt of alternatives) {
                    if (alt.textContent.includes("correta")) {
                        return alt.textContent.trim();
                    }
                }
                return "Resposta não encontrada (modo local)";
            }
        }
    ];

    // ===== SISTEMA DE REQUISIÇÕES =====
    async function queryWithFallback(prompt) {
        for (const api of API_OPTIONS) {
            try {
                console.log(`Tentando: ${api.name}`);
                
                if (api.handler) {
                    return api.handler(prompt);
                }

                const response = await fetch(api.url, {
                    method: api.method,
                    headers: api.headers,
                    body: api.body(prompt),
                    signal: AbortSignal.timeout(5000)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                return extractAnswer(data);
                
            } catch (error) {
                console.error(`Falha em ${api.name}:`, error);
                continue;
            }
        }
        throw new Error("Todas as opções falharam");
    }

    function extractAnswer(data) {
        // Tenta extrair resposta em diferentes formatos
        return data?.message?.content?.match(/[A-Ea-e]\)\s*.+/)?.shift() || 
               data?.response?.match(/Alternativa\s*([A-Ea-e])/i)?.shift() ||
               "Resposta não reconhecida";
    }

    // ===== INTEGRAÇÃO COM UI =====
    function init() {
        if (!window.location.hostname.includes(TARGET_SITE)) return;

        const script = document.createElement('script');
        script.src = UI_SCRIPT_URL;
        
        script.onload = () => {
            const { input, analyzeBtn } = window.createUI();
            
            analyzeBtn.onclick = async () => {
                if (!input.value.trim()) return;
                
                analyzeBtn.disabled = true;
                analyzeBtn.textContent = 'Analisando...';
                
                try {
                    const answer = await queryWithFallback(input.value);
                    window.showResponse(answer);
                } catch (error) {
                    window.showResponse("Erro: " + error.message);
                } finally {
                    analyzeBtn.disabled = false;
                    analyzeBtn.textContent = '🔍 Analisar';
                }
            };
        };
        
        document.head.appendChild(script);
    }

    // ===== INICIAR =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
