(function() {
    // Configurações básicas (sem frescura)
    const siteAlvo = 'saladofuturo.educacao.sp.gov.br';
    const apiBlackbox = 'https://www.blackbox.ai/api/chat'; 
    const uiScript = ''; // Cola seu link do UI aqui

    // Estado do sistema (o que realmente importa)
    const estado = { 
        analisando: false,
        imagens: []
    };

    // Função pra extrair imagens da página (igual o anterior, mas mais esperto)
    function pegarImagens() {
        estado.imagens = [...document.querySelectorAll('img')]
            .map(img => img.src)
            .filter(src => src && src.startsWith('http'))
            .slice(0, 3); // Só 3 imagens pra não encher
        return estado.imagens;
    }

    // Monta o prompt perfeito pra Blackbox
    function criarPrompt(pergunta) {
        return `RESPONDA DIRETO COM A ALTERNATIVA CORRETA (Ex: "C) 720") SEM ENROLAÇÃO:

        ${pergunta}
        
        ${estado.imagens.length ? `Imagens pra ajudar: ${estado.imagens.join(' | ')}` : ''}
        
        Manda a letra certa:`;
    }

    // Função que faz a mágica acontecer
    async function consultarBlackbox(pergunta) {
        try {
            // Truque pra evitar bloqueio - finge ser um navegador normal
            const resposta = await fetch(apiBlackbox, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: pergunta }],
                    stream: false
                })
            });

            if (!resposta.ok) throw new Error('Blackbox deu tilt');

            const dados = await resposta.json();
            
            // Caça a resposta no meio do texto
            const padrao = /([A-Ea-e]\)\s*.+)/;
            return dados?.message?.content?.match(padrao)?.[0] || "Não achei a resposta certa";
            
        } catch (erro) {
            console.error("Deu ruim:", erro);
            return "Erro ao consultar - tenta de novo";
        }
    }

    // Inicialização (sem complicação)
    function iniciar() {
        if (!window.location.hostname.includes(siteAlvo)) return;

        const script = document.createElement('script');
        script.src = uiScript;
        
        script.onload = () => {
            // Pega os elementos da UI
            const { input, botaoAnalisar } = window.criarUI();

            // Configura o botão pra funcionar
            botaoAnalisar.onclick = async () => {
                if (estado.analisando) return;
                
                estado.analisando = true;
                botaoAnalisar.textContent = 'Analisando...';
                
                const resposta = await consultarBlackbox(input.value);
                window.mostrarResposta(resposta);
                
                estado.analisando = false;
                botaoAnalisar.textContent = '🔍 Analisar';
            };

            // Atualiza as imagens automaticamente
            pegarImagens();
            window.atualizarImagens(estado.imagens);
        };

        document.head.appendChild(script);
    }

    // Roda quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
