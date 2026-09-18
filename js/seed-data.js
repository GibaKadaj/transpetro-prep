// Seed data for development and testing
const SeedData = {
    async seedAll() {
        console.log('Seeding test data...');

        // Seed daily plans
        await this.seedDailyPlans();

        // Seed simulados
        await this.seedSimulados();

        // Seed daily records
        await this.seedDailyRecords();

        // Seed block coverage
        await this.seedBlockCoverage();

        console.log('Seed data complete!');
    },

    async seedDailyPlans() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const plans = [
            { date: yesterday, blockCode: 'B1', completed: true },
            { date: today, blockCode: 'B2', completed: false },
            { date: tomorrow, blockCode: 'B3', completed: false }
        ];

        for (const plan of plans) {
            await DB.addDailyPlan(plan);
        }

        console.log('Daily plans seeded');
    },

    async seedSimulados() {
        const simulados = [
            {
                date: '2026-09-15',
                weekNumber: 1,
                securityCorrect: 28,
                portugueseCorrect: 8,
                mathCorrect: 7,
                isPlanned: false
            },
            {
                date: '2026-09-22',
                weekNumber: 2,
                securityCorrect: 0,
                portugueseCorrect: 0,
                mathCorrect: 0,
                isPlanned: true
            }
        ];

        for (const simulado of simulados) {
            await DB.addSimulado(simulado);
        }

        console.log('Simulados seeded');
    },

    async seedDailyRecords() {
        const records = [
            { date: '2026-09-14', blockCode: 'B1', status: 'COMPLETO', hoursStudied: 3 },
            { date: '2026-09-15', blockCode: 'B1', status: 'COMPLETO', hoursStudied: 4 },
            { date: '2026-09-16', blockCode: 'B2', status: 'COMPLETO', hoursStudied: 2 },
            { date: '2026-09-17', blockCode: 'B2', status: 'COMPLETO', hoursStudied: 3 },
            { date: '2026-09-18', blockCode: 'B2', status: 'PARCIAL', hoursStudied: 1 }
        ];

        for (const record of records) {
            await DB.addDailyRecord(record);
        }

        console.log('Daily records seeded');
    },

    async seedBlockCoverage() {
        const coverage = [
            { blockCode: 'B1', name: 'Bloco 1', weight: 1, plannedWeeks: 2, status: 'COMPLETO', questionsDone: 50, questionsCorrect: 42 },
            { blockCode: 'B2', name: 'Bloco 2', weight: 1, plannedWeeks: 2, status: 'EM_ANDAMENTO', questionsDone: 25, questionsCorrect: 20 },
            { blockCode: 'B3', name: 'Bloco 3', weight: 1, plannedWeeks: 2, status: 'INICIADO', questionsDone: 5, questionsCorrect: 4 }
        ];

        for (const block of coverage) {
            await DB.updateBlockCoverage(block);
        }

        console.log('Block coverage seeded');
    },

    async clearAll() {
        await DB.clearAllData();
        await DB.initBlockCoverage();
        console.log('All data cleared and block coverage reinitialized');
    }
};

// Dev helper - call from console
window.SeedData = SeedData;
