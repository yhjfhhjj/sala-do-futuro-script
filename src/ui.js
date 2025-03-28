function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: '"Roboto", Arial, sans-serif',
        maxWidth: '90vw', // Limita a largura no mobile
        width: '300px', // Tamanho padrão para PC
        '@media (max-width: 600px)': {
            width: '80vw', // Ajusta para mobile
        }
    });

    // Botão de menu (ícone hambúrguer)
    const menuBtn = document.createElement('button');
    menuBtn.id = 'gemini-menu-btn';
    menuBtn.innerHTML = '☰';
    Object.assign(menuBtn.style, {
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #4285f4, #357abd)',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease'
    });
    menuBtn.onmouseover = () => {
        menuBtn.style.transform = 'scale(1.05)';
        menuBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.transform = 'scale(1)';
        menuBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    };

    // Menu dropdown
    const menu = document.createElement('div');
    menu.id = 'gemini-menu';
    Object.assign(menu.style, {
        display: 'none',
        background: 'white',
        borderRadius: '12px',
        padding: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'absolute',
        bottom: '40px',
        right: '0',
        flexDirection: 'column',
        gap: '8px',
        animation: 'slideIn 0.3s ease'
    });

    // Opções do menu
    const analyzeOption = document.createElement('button');
    analyzeOption.innerHTML = '🔍 Analisar';
    Object.assign(analyzeOption.style, {
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #34a853, #2d9046)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left'
    });

    const clearOption = document.createElement('button');
    clearOption.innerHTML = '🗑️ Limpar';
    Object.assign(clearOption.style, {
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #ff4444, #cc3333)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left'
    });

    const creditsOption = document.createElement('div');
    creditsOption.innerHTML = 'Desenvolvido por Hackermoon';
    Object.assign(creditsOption.style, {
        padding: '8px 12px',
        color: '#666',
        fontSize: '12px',
        textAlign: 'center',
        borderTop: '1px solid #eee'
    });

    menu.appendChild(analyzeOption);
    menu.appendChild(clearOption);
    menu.appendChild(creditsOption);

    // Input (textarea)
    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta com alternativas aqui\nExemplo:\nQual é a capital do Brasil?\na) Rio de Janeiro\nb) São Paulo\nc) Brasília';
    Object.assign(input.style, {
        padding: '10px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        background: '#f9f9f9',
        fontSize: '14px',
        outline: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        resize: 'vertical',
        minHeight: '60px',
        maxHeight: '150px',
        width: '100%',
        display: 'none',
        transition: 'all 0.3s ease'
    });
    input.onfocus = () => input.style.borderColor = '#4285f4';
    input.onblur = () => input.style.borderColor = '#e0e0e0';

    // Painel de resposta
    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        background: 'white',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '100%',
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #eee',
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
        <div style="padding: 10px; background: linear-gradient(135deg, #34a853, #2d9046); color: white; border-radius: 8px; text-align: center; font-size: 14px; line-height: 1.4;">
            <strong>${answer}</strong>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #888; text-align: center;">
            Clique fora para fechar
        </div>
    `;
    panel.style.display = 'block';
}

function clearUI(input, responsePanel) {
    input.value = '';
    responsePanel.style.display = 'none';
    input.style.display = 'none';
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
