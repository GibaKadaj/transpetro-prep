// App Principal - Inicialização
const App = {
    async init() {
        try {
            // Inicializar banco de dados
            await DB.init();

            // Inicializar cobertura de blocos (primeira vez)
            await DB.initBlockCoverage();

            // Inicializar interface
            UI.init();

            // Carregar estatísticas
            await Stats.load();
            Stats.updateHomeDisplay();

            // Verificar se há timer rodando (persistência entre reloads)
            await this.restoreTimerState();

            console.log('App inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar app:', error);
            alert('Erro ao inicializar o aplicativo. Por favor, recarregue a página.');
        }
    },

    async restoreTimerState() {
        const timerRunning = await DB.getSetting('timerRunning');
        if (timerRunning) {
            const sessionData = await DB.getSetting('currentSession');
            if (sessionData) {
                const startTime = new Date(sessionData.startTimestamp);
                const now = Date.now();
                const elapsed = Math.floor((now - startTime.getTime()) / 1000);

                Timer.currentSession = sessionData;
                Timer.elapsedSeconds = elapsed;
                Timer.interval = setInterval(() => {
                    Timer.elapsedSeconds++;
                    Timer.updateDisplay();
                }, 1000);

                UI.showTimerRunning();
                Timer.updateDisplay();

                console.log('Timer restaurado:', sessionData.blockCode);
            }
        }
    },

    async saveTimerState() {
        if (Timer.isRunning()) {
            await DB.setSetting('timerRunning', true);
            await DB.setSetting('currentSession', Timer.currentSession);
        } else {
            await DB.setSetting('timerRunning', false);
            await DB.setSetting('currentSession', null);
        }
    }
};

// Salvar estado do timer antes de fechar/recarregar
window.addEventListener('beforeunload', () => {
    App.saveTimerState();
});

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Instalar prompt para PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar prompt de instalação personalizado (opcional)
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>Instalar App</strong>
                <small class="d-block text-muted">Use como app no seu celular</small>
            </div>
            <button class="btn btn-sm btn-primary" id="install-btn">Instalar</button>
        </div>
    `;
    document.body.appendChild(installPrompt);
    installPrompt.style.display = 'block';

    document.getElementById('install-btn').addEventListener('click', async () => {
        installPrompt.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install prompt: ${outcome}`);
        deferredPrompt = null;
        installPrompt.remove();
    });
});

window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso');
});
