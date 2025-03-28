function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '15px',
        right: '15px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: '"SF Pro", system-ui, -apple-system, Arial, sans-serif',
        width: '280px', // Reduzido para não parecer largo
        maxWidth: '85vw', // Limita a largura no mobile
        background: 'rgba(255, 255, 255, 0.95)', // Fundo branco com leve transparência (estilo iOS)
        borderRadius: '20px',
        padding: '15px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)', // Efeito de desfoque (estilo iOS)
        WebkitBackdropFilter: 'blur(10px)'
    });

    // Botão de menu (ícone hambúrguer)
    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = '☰';
    Object.assign(menuBtn.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '6px 10px',
        background: 'rgba(0, 0, 0, 0.05)', // Fundo leve (estilo iOS)
        color: '#007AFF', // Azul característico do iOS
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '18px',
        transition: 'background 0.3s ease'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.background = 'rgba(0, 0, 0, 0.1)';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.background = 'rgba(0, 0, 0, 0.05)';
    };

    // Menu dropdown
    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'absolute',
        top: '40px',
        right: '0',
        flexDirection: 'column',
        gap: '8px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'slideIn 0.3s ease'
    });

    // Opções do menu
    const analyzeOption = document.createElement('button');
    analyzeOption.innerHTML = 'Analisar';
    Object.assign(analyzeOption.style, {
        padding: '8px 12px',
        background: 'none',
        color: '#007AFF',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        textAlign: 'left',
        fontWeight: '500'
    });

    const clearOption = document.createElement('button');
    clearOption.innerHTML = 'Limpar';
    Object.assign(clearOption.style, {
        padding: '8px 12px',
        background: 'none',
        color: '#FF3B30', // Vermelho característico do iOS
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        textAlign: 'left',
        fontWeight: '500'
    });

    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Hackermoon';
    Object.assign(creditsOption.style, {
        padding: '8px 12px',
        color: '#8E8E93', // Cinza claro (estilo iOS)
        fontSize: '12px',
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)'
    });

    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    // Input (textarea)
    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta e alternativas aqui...';
    Object.assign(input.style, {
        padding: '10px',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.8)',
        fontSize: '15px',
        fontWeight: '400',
        color: '#000',
        outline: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        resize: 'vertical',
        minHeight: '80px',
        maxHeight: '120px',
        width: '100%',
        transition: 'border-color 0.3s ease'
    });
    input.onfocus = () => input.style.borderColor = '#007AFF';
    input.onblur = () => input.style.borderColor = 'rgba(0, 0, 0, 0.1)';

    // Painel de resposta
    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '100%',
        maxHeight: '150px',
        overflowY: 'auto',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'slideIn 0.3s ease'
    });

    // Estilo de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    container.appendChild(menuBtn);
    container.appendChild(menu);
    container.appendChild(input);
    container.appendChild(responsePanel);
    document.body.appendChild(container);

    return { menuBtn, analyzeOption, clearOption, input, responsePanel };
}

function showResponse(panel, answer) {
    panel.innerHTML = `
        <div style="color: #000; border-radius: 8px; text-align: left; font-size: 15px; line-height: 1.4;">
            <strong>${answer}</strong>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #8E8E93; text-align: center;">
            Toque fora para fechar
        </div>
    `;
    panel.style.display = 'block';
}

function clearUI(input, responsePanel) {
    input.value = '';
    responsePanel.style.display = 'none';
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
