function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    // Container principal (fixo no canto inferior direito)
    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif', // Nova fonte
    });

    // Botão de menu (iniciais "HCK")
    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = 'HCK';
    Object.assign(menuBtn.style, {
        padding: '10px 16px',
        background: 'linear-gradient(90deg, #FF6F61, #D946EF)', // Gradiente no botão
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '16px', // Mais arredondado
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)', // Sombra roxa
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        alignSelf: 'flex-end',
        animation: 'pulse 2s infinite ease-in-out' // Animação de pulsação
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.transform = 'scale(1.1)';
        menuBtn.style.boxShadow = '0 6px 16px rgba(217, 70, 239, 0.5)';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.transform = 'scale(1)';
        menuBtn.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.3)';
    };

    // Menu lateral
    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: '#1C2526',
        borderRadius: '16px', // Mais arredondado
        padding: '10px',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4), 0 0 10px rgba(217, 70, 239, 0.2)', // Sombra com brilho roxo
        position: 'fixed',
        bottom: '70px',
        right: '20px',
        flexDirection: 'column',
        gap: '12px',
        animation: 'menuFadeSlide 0.4s ease-out', // Nova animação de entrada
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        width: '200px', // Compacto para celular
        maxWidth: '80vw',
    });

    // Ajustes para PC (resolução maior)
    if (window.innerWidth > 600) {
        Object.assign(menu.style, {
            width: '300px',
            padding: '14px',
        });
    }

    // Título "HCK"
    const menuTitle = document.createElement('div');
    menuTitle.innerHTML = 'HCK';
    Object.assign(menuTitle.style, {
        color: '#D946EF',
        fontSize: '22px',
        fontWeight: '700',
        textAlign: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        letterSpacing: '1px'
    });

    // Input (textarea) dentro do menu
    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta aqui...';
    Object.assign(input.style, {
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: '#2A3435',
        fontSize: '14px',
        fontWeight: '400',
        color: '#E0E0E0',
        outline: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        resize: 'vertical',
        minHeight: '60px',
        maxHeight: '80px',
        width: '100%',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif'
    });
    if (window.innerWidth > 600) {
        input.style.maxHeight = '100px';
    }
    input.onfocus = () => {
        input.style.borderColor = '#D946EF';
        input.style.boxShadow = '0 0 8px rgba(217, 70, 239, 0.5)';
    };
    input.onblur = () => {
        input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        input.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
    };

    // Opções do menu
    const analyzeOption = document.createElement('button');
    analyzeOption.id = 'gemini-analyze-btn';
    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
    Object.assign(analyzeOption.style, {
        padding: '10px 14px',
        background: 'linear-gradient(90deg, #FF6F61, #D946EF)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif'
    });
    analyzeOption.onmouseover = () => {
        analyzeOption.style.transform = 'translateY(-2px)';
        analyzeOption.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.5)';
    };
    analyzeOption.onmouseout = () => {
        analyzeOption.style.transform = 'translateY(0)';
        analyzeOption.style.boxShadow = 'none';
    };

    const clearOption = document.createElement('button');
    clearOption.innerHTML = '<span style="margin-right: 8px;">🗑️</span>Limpar';
    Object.assign(clearOption.style, {
        padding: '10px 14px',
        background: 'linear-gradient(90deg, #FF6F61, #D946EF)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif'
    });
    clearOption.onmouseover = () => {
        clearOption.style.transform = 'translateY(-2px)';
        clearOption.style.boxShadow = '0 4px 12px rgba(217, 70, 239, 0.5)';
    };
    clearOption.onmouseout = () => {
        clearOption.style.transform = 'translateY(0)';
        clearOption.style.boxShadow = 'none';
    };

    // Créditos
    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Hackermoon';
    Object.assign(creditsOption.style, {
        color: '#D946EF',
        fontSize: '10px',
        fontWeight: '400',
        textAlign: 'center',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif',
        opacity: '0.8'
    });

    menu.appendChild(menuTitle);
    menu.appendChild(input);
    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    // Painel de resposta (toast minimalista)
    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1C2526',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '90vw',
        width: '220px',
        zIndex: '1000000',
        animation: 'slideIn 0.3s ease',
        fontFamily: '"Inter", "SF Pro", system-ui, -apple-system, Arial, sans-serif'
    });
    if (window.innerWidth > 600) {
        responsePanel.style.width = '260px';
    }

    // Barra de progresso
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '2px',
        background: 'linear-gradient(90deg, #FF6F61, #D946EF)',
        width: '100%',
        position: 'absolute',
        bottom: '0',
        left: '0',
        borderRadius: '0 0 10px 10px',
        transition: 'width 6s linear'
    });
    responsePanel.appendChild(progressBar);

    // Estilo de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, 20px); }
        }
        @keyframes menuFadeSlide {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 6px 16px rgba(217, 70, 239, 0.5); }
            100% { transform: scale(1); box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3); }
        }
    `;
    document.head.appendChild(style);

    container.appendChild(menuBtn);
    container.appendChild(menu);
    document.body.appendChild(container);
    document.body.appendChild(responsePanel);

    return { menuBtn, analyzeOption, clearOption, input, responsePanel };
}

function showResponse(panel, answer, correctAlternative) {
    panel.innerHTML = `
        <div style="color: #FFFFFF; text-align: center; font-size: 14px; line-height: 1.4;">
            <strong>${correctAlternative}</strong> - ${answer}
        </div>
    `;
    panel.style.display = 'block';

    // Iniciar a barra de progresso
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '100%';
    setTimeout(() => {
        progressBar.style.width = '0%';
    }, 0);

    // Fechar após 6 segundos
    setTimeout(() => {
        panel.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            panel.style.display = 'none';
            panel.style.animation = 'slideIn 0.3s ease';
        }, 300);
    }, 6000);
}

function clearUI(input, responsePanel, analyzeOption, setIsAnalyzing) {
    input.value = '';
    responsePanel.style.display = 'none';
    analyzeOption.disabled = false;
    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
    analyzeOption.style.opacity = '1';
    setIsAnalyzing(false);
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
