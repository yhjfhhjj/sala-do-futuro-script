function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

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
        fontFamily: '"SF Pro", system-ui, -apple-system, Arial, sans-serif',
        width: '260px',
        maxWidth: '80vw',
    });

    // Botão de menu (ícone hambúrguer)
    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = '☰';
    Object.assign(menuBtn.style, {
        padding: '8px 12px',
        background: '#1C2526', // Preto
        color: '#6B48FF', // Roxo
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'background 0.3s ease, transform 0.2s ease',
        alignSelf: 'flex-end'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.background = '#2A3435';
        menuBtn.style.transform = 'scale(1.05)';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.background = '#1C2526';
        menuBtn.style.transform = 'scale(1)';
    };

    // Menu dropdown
    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: '#1C2526',
        borderRadius: '12px',
        padding: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        position: 'absolute',
        bottom: '40px',
        right: '0',
        flexDirection: 'column',
        gap: '6px',
        animation: 'slideIn 0.3s ease'
    });

    // Opções do menu
    const analyzeOption = document.createElement('button');
    analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
    Object.assign(analyzeOption.style, {
        padding: '8px 12px',
        background: 'none',
        color: '#6B48FF',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center'
    });

    const clearOption = document.createElement('button');
    clearOption.innerHTML = '<span style="margin-right: 8px;">🗑️</span>Limpar';
    Object.assign(clearOption.style, {
        padding: '8px 12px',
        background: 'none',
        color: '#FF3B30',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center'
    });

    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Hackermoon';
    Object.assign(creditsOption.style, {
        padding: '6px 12px',
        color: '#6B48FF',
        fontSize: '11px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    });

    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    // Input (textarea)
    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta aqui...';
    Object.assign(input.style, {
        padding: '8px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: '#2A3435', // Cinza escuro
        fontSize: '14px',
        fontWeight: '400',
        color: '#FFFFFF',
        outline: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        resize: 'vertical',
        minHeight: '60px',
        maxHeight: '100px',
        width: '100%',
        transition: 'border-color 0.3s ease'
    });
    input.onfocus = () => input.style.borderColor = '#6B48FF';
    input.onblur = () => input.style.borderColor = 'rgba(255, 255, 255, 0.1)';

    // Painel de resposta (toast)
    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1C2526',
        borderRadius: '12px',
        padding: '10px 15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '90vw',
        width: '300px',
        zIndex: '1000000',
        animation: 'slideIn 0.3s ease'
    });

    // Barra de progresso
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '2px',
        background: '#6B48FF',
        width: '100%',
        position: 'absolute',
        bottom: '0',
        left: '0',
        borderRadius: '0 0 12px 12px',
        transition: 'width 10s linear'
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
    `;
    document.head.appendChild(style);

    container.appendChild(menuBtn);
    container.appendChild(menu);
    container.appendChild(input);
    document.body.appendChild(container);
    document.body.appendChild(responsePanel);

    return { menuBtn, analyzeOption, clearOption, input, responsePanel };
}

function showResponse(panel, answer) {
    panel.innerHTML = `
        <div style="color: #FFFFFF; border-radius: 8px; text-align: left; font-size: 14px; line-height: 1.4;">
            ${answer}
        </div>
    `;
    panel.style.display = 'block';

    // Iniciar a barra de progresso
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '100%';
    setTimeout(() => {
        progressBar.style.width = '0%';
    }, 0);

    // Fechar após 10 segundos
    setTimeout(() => {
        panel.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            panel.style.display = 'none';
            panel.style.animation = 'slideIn 0.3s ease';
        }, 300);
    }, 10000);
}

function clearUI(input, responsePanel) {
    input.value = '';
    responsePanel.style.display = 'none';
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
