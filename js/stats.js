// Gerenciamento de Estatísticas
const Stats = {
    data: {
        sessions: [],
        totalTime: 0,
        sessionCount: 0,
        blockStats: {},
        dailyRecords: [],
        dailyPlans: [],
        simulados: [],
        blockCoverage: [],
        todayPlan: null,
        lastSimulado: null,
        streak: 0,
        consistency: 0,
        blocksStarted: 0
    },

    async load() {
        const sessions = await DB.getAllSessions();
        this.data.sessions = sessions;
        this.data.sessionCount = sessions.length;
        this.data.totalTime = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

        // Carregar novos dados
        this.data.dailyRecords = await DB.getAllDailyRecords();
        this.data.dailyPlans = await DB.getAllDailyPlans();
        this.data.simulados = await DB.getAllSimulados();
        this.data.blockCoverage = await DB.getAllBlockCoverage();

        // Calcular métricas
        this.computeStreak();
        this.computeTodayPlan();
        this.computeLastSimulado();
        this.computeBlocksStarted();
        this.computeConsistency();

        // Calcular estatísticas por bloco
        this.data.blockStats = {};
        sessions.forEach(session => {
            const code = session.blockCode;
            if (!this.data.blockStats[code]) {
                this.data.blockStats[code] = {
                    count: 0,
                    totalSeconds: 0,
                    blockName: session.blockName
                };
            }
            this.data.blockStats[code].count++;
            this.data.blockStats[code].totalSeconds += session.durationSeconds;
        });
    },

    async refresh() {
        await this.load();
        this.updateHomeDisplay();
        this.updateStatsPage();
    },

    computeStreak() {
        const studiedRecords = this.data.dailyRecords
            .filter(r => r.status !== 'NAO')
            .sort((a, b) => b.date.localeCompare(a.date));

        if (studiedRecords.length === 0) {
            this.data.streak = 0;
            return;
        }

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const record of studiedRecords) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === streak) {
                streak++;
                currentDate = recordDate;
            } else if (daysDiff > streak) {
                break;
            }
        }

        this.data.streak = streak;
    },

    computeTodayPlan() {
        const today = new Date().toISOString().split('T')[0];
        this.data.todayPlan = this.data.dailyPlans.find(p => p.date === today) || null;
    },

    computeLastSimulado() {
        const completed = this.data.simulados.filter(s => !s.isPlanned);
        if (completed.length === 0) {
            this.data.lastSimulado = null;
            return;
        }
        this.data.lastSimulado = completed.reduce((latest, current) =>
            current.date > latest.date ? current : latest
        );
    },

    computeBlocksStarted() {
        this.data.blocksStarted = this.data.blockCoverage.filter(
            b => b.status !== 'NAO_INICIADO'
        ).length;
    },

    computeConsistency() {
        const startDate = new Date(StudyConstants.PREP_START_DATE);
        const today = new Date();
        const totalDays = Math.max(1, Utils.daysBetween(startDate, today));
        const studiedDays = this.data.dailyRecords.filter(r => r.status !== 'NAO').length;
        this.data.consistency = Math.round((studiedDays / totalDays) * 100);
    },

    evaluateCutoff(simulado) {
        if (!simulado) return null;

        // Verifica zero em qualquer matéria
        if (simulado.securityCorrect === 0 || simulado.portugueseCorrect === 0 || simulado.mathCorrect === 0) {
            return { status: 'ELIMINATED_ZERO', label: 'Eliminado', color: 'danger' };
        }

        // Verifica mínimo de segurança (20/40)
        if (simulado.securityCorrect < StudyConstants.MIN_SECURITY_PASS) {
            return { status: 'BELOW_SECURITY', label: 'Abaixo mín. SEG', color: 'warning' };
        }

        // Verifica mínimo geral (10/10 em cada)
        if (simulado.portugueseCorrect < StudyConstants.MIN_GENERAL_PASS ||
            simulado.mathCorrect < StudyConstants.MIN_GENERAL_PASS) {
            return { status: 'BELOW_GENERAL', label: 'Abaixo mín. geral', color: 'warning' };
        }

        return { status: 'PASSES_ALL', label: 'Aprovado', color: 'success' };
    },

    updateHomeDisplay() {
        document.getElementById('total-sessions').textContent = this.data.sessionCount;
        document.getElementById('total-hours').textContent = Utils.formatDuration(this.data.totalTime);

        this.renderTodayCard();
        this.renderBlocksCard();
        this.renderSimuladoCard();
        this.renderConsistencyCard();
    },

    renderTodayCard() {
        const content = document.getElementById('today-content');

        if (!this.data.todayPlan) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-check"></i>
                    <p>Nenhum plano para hoje</p>
                </div>
            `;
            return;
        }

        const block = StudyConstants.BLOCKS.find(b => b.code === this.data.todayPlan.blockCode);
        content.innerHTML = `
            <div class="today-plan">
                <div class="block-code">${this.data.todayPlan.blockCode}</div>
                <div class="block-name">${block ? block.name : this.data.todayPlan.blockCode}</div>
            </div>
        `;
    },

    renderBlocksCard() {
        const total = StudyConstants.BLOCKS.filter(b => b.weight > 0).length;
        const started = this.data.blocksStarted;
        const percentage = Math.round((started / total) * 100);

        document.getElementById('blocks-count').textContent = started;
        document.getElementById('blocks-progress-bar').style.width = `${percentage}%`;
    },

    renderSimuladoCard() {
        const content = document.getElementById('simulado-content');

        if (!this.data.lastSimulado) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-file-earmark-text"></i>
                    <p>Nenhum simulado realizado</p>
                </div>
            `;
            return;
        }

        const cutoff = this.evaluateCutoff(this.data.lastSimulado);
        const date = new Date(this.data.lastSimulado.date);

        content.innerHTML = `
            <div class="simulado-scores">
                <div class="simulado-date">${Utils.formatDate(date)}</div>
                <div class="scores-grid">
                    <div class="score-item">
                        <div class="score-label">SEG</div>
                        <div class="score-value">${this.data.lastSimulado.securityCorrect}/40</div>
                    </div>
                    <div class="score-item">
                        <div class="score-label">PT</div>
                        <div class="score-value">${this.data.lastSimulado.portugueseCorrect}/10</div>
                    </div>
                    <div class="score-item">
                        <div class="score-label">MT</div>
                        <div class="score-value">${this.data.lastSimulado.mathCorrect}/10</div>
                    </div>
                </div>
                <div class="cutoff-status status-${cutoff.color}">${cutoff.label}</div>
            </div>
        `;
    },

    renderConsistencyCard() {
        const percentage = this.data.consistency;

        document.getElementById('consistency-percentage').textContent = `${percentage}%`;
        document.getElementById('consistency-progress-bar').style.width = `${percentage}%`;
    },

    updateStatsPage() {
        // Estatísticas gerais
        document.getElementById('stats-sessions').textContent = this.data.sessionCount;
        document.getElementById('stats-time').textContent = Utils.formatDuration(this.data.totalTime);

        // Média por dia
        const startDate = new Date(StudyConstants.PREP_START_DATE);
        const today = new Date();
        const daysSinceStart = Math.max(1, Utils.daysBetween(startDate, today));
        const avgPerDay = Math.floor(this.data.totalTime / daysSinceStart);
        document.getElementById('stats-avg').textContent = Utils.formatDuration(avgPerDay);

        // Último estudo
        if (this.data.sessions.length > 0) {
            const lastSession = this.data.sessions[this.data.sessions.length - 1];
            const lastDate = new Date(lastSession.startTime);
            document.getElementById('stats-last').textContent = Utils.formatDate(lastDate);
        } else {
            document.getElementById('stats-last').textContent = '--';
        }

        // Estatísticas por bloco
        this.renderBlockStats();
    },

    renderBlockStats() {
        const container = document.getElementById('block-stats-container');

        if (Object.keys(this.data.blockStats).length === 0) {
            container.innerHTML = '<small class="text-muted">Nenhuma sessão registrada ainda</small>';
            return;
        }

        // Ordenar por tempo total (decrescente)
        const sorted = Object.entries(this.data.blockStats)
            .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);

        container.innerHTML = sorted.map(([code, stats]) => `
            <div class="block-stat-item">
                <div>
                    <div class="block-stat-name">${code}</div>
                    <small class="text-muted">${stats.count} sessõ${stats.count > 1 ? 'es' : 'ão'}</small>
                </div>
                <div class="block-stat-time">${Utils.formatDuration(stats.totalSeconds)}</div>
            </div>
        `).join('');
    }
};
