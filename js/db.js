// Gerenciamento do banco de dados IndexedDB
const DB_NAME = 'TranspetroPrep';
const DB_VERSION = 2;
let db = null;

const DB = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Store para sessões de estudo
                if (!database.objectStoreNames.contains('sessions')) {
                    const sessionsStore = database.createObjectStore('sessions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sessionsStore.createIndex('blockCode', 'blockCode', { unique: false });
                    sessionsStore.createIndex('date', 'date', { unique: false });
                }

                // Store para configurações
                if (!database.objectStoreNames.contains('settings')) {
                    database.createObjectStore('settings', { keyPath: 'key' });
                }

                // Store para planos diários
                if (!database.objectStoreNames.contains('dailyPlans')) {
                    const plansStore = database.createObjectStore('dailyPlans', { keyPath: 'date' });
                    plansStore.createIndex('blockCode', 'blockCode', { unique: false });
                }

                // Store para simulados
                if (!database.objectStoreNames.contains('simulados')) {
                    const simuladosStore = database.createObjectStore('simulados', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    simuladosStore.createIndex('date', 'date', { unique: false });
                    simuladosStore.createIndex('weekNumber', 'weekNumber', { unique: false });
                    simuladosStore.createIndex('isPlanned', 'isPlanned', { unique: false });
                }

                // Store para cobertura de blocos
                if (!database.objectStoreNames.contains('blockCoverage')) {
                    const coverageStore = database.createObjectStore('blockCoverage', { keyPath: 'blockCode' });
                    coverageStore.createIndex('status', 'status', { unique: false });
                }

                // Store para registros diários
                if (!database.objectStoreNames.contains('dailyRecords')) {
                    const recordsStore = database.createObjectStore('dailyRecords', { keyPath: 'date' });
                    recordsStore.createIndex('blockCode', 'blockCode', { unique: false });
                    recordsStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    },

    async addSession(sessionData) {
        const transaction = db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        return store.add(sessionData);
    },

    async getAllSessions() {
        const transaction = db.transaction(['sessions'], 'readonly');
        const store = transaction.objectStore('sessions');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getSessionsByBlock(blockCode) {
        const transaction = db.transaction(['sessions'], 'readonly');
        const store = transaction.objectStore('sessions');
        const index = store.index('blockCode');
        return new Promise((resolve, reject) => {
            const request = index.getAll(blockCode);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getSetting(key) {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },

    async setSetting(key, value) {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return store.put({ key, value });
    },

    async clearAllData() {
        const transaction = db.transaction(['sessions', 'settings', 'dailyPlans', 'simulados', 'blockCoverage', 'dailyRecords'], 'readwrite');
        await transaction.objectStore('sessions').clear();
        await transaction.objectStore('settings').clear();
        await transaction.objectStore('dailyPlans').clear();
        await transaction.objectStore('simulados').clear();
        await transaction.objectStore('blockCoverage').clear();
        await transaction.objectStore('dailyRecords').clear();
    },

    // Daily Plans
    async addDailyPlan(planData) {
        const transaction = db.transaction(['dailyPlans'], 'readwrite');
        const store = transaction.objectStore('dailyPlans');
        return store.put(planData);
    },

    async getAllDailyPlans() {
        const transaction = db.transaction(['dailyPlans'], 'readonly');
        const store = transaction.objectStore('dailyPlans');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getDailyPlan(date) {
        const transaction = db.transaction(['dailyPlans'], 'readonly');
        const store = transaction.objectStore('dailyPlans');
        return new Promise((resolve, reject) => {
            const request = store.get(date);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Simulados
    async addSimulado(simuladoData) {
        const transaction = db.transaction(['simulados'], 'readwrite');
        const store = transaction.objectStore('simulados');
        return store.add(simuladoData);
    },

    async updateSimulado(simuladoData) {
        const transaction = db.transaction(['simulados'], 'readwrite');
        const store = transaction.objectStore('simulados');
        return store.put(simuladoData);
    },

    async deleteSimulado(id) {
        const transaction = db.transaction(['simulados'], 'readwrite');
        const store = transaction.objectStore('simulados');
        return store.delete(id);
    },

    async getAllSimulados() {
        const transaction = db.transaction(['simulados'], 'readonly');
        const store = transaction.objectStore('simulados');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getLastCompletedSimulado() {
        const simulados = await this.getAllSimulados();
        const completed = simulados.filter(s => !s.isPlanned);
        if (completed.length === 0) return null;
        return completed.reduce((latest, current) =>
            current.date > latest.date ? current : latest
        );
    },

    // Block Coverage
    async initBlockCoverage() {
        const transaction = db.transaction(['blockCoverage'], 'readwrite');
        const store = transaction.objectStore('blockCoverage');

        for (const block of StudyConstants.BLOCKS) {
            const existing = await new Promise((resolve, reject) => {
                const request = store.get(block.code);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!existing) {
                await store.put({
                    blockCode: block.code,
                    name: block.name,
                    weight: block.weight,
                    plannedWeeks: block.plannedWeeks,
                    status: 'NAO_INICIADO',
                    questionsDone: 0,
                    questionsCorrect: 0
                });
            }
        }
    },

    async getAllBlockCoverage() {
        const transaction = db.transaction(['blockCoverage'], 'readonly');
        const store = transaction.objectStore('blockCoverage');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async updateBlockCoverage(blockData) {
        const transaction = db.transaction(['blockCoverage'], 'readwrite');
        const store = transaction.objectStore('blockCoverage');
        return store.put(blockData);
    },

    // Daily Records
    async addDailyRecord(recordData) {
        const transaction = db.transaction(['dailyRecords'], 'readwrite');
        const store = transaction.objectStore('dailyRecords');
        return store.put(recordData);
    },

    async getAllDailyRecords() {
        const transaction = db.transaction(['dailyRecords'], 'readonly');
        const store = transaction.objectStore('dailyRecords');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getDailyRecord(date) {
        const transaction = db.transaction(['dailyRecords'], 'readonly');
        const store = transaction.objectStore('dailyRecords');
        return new Promise((resolve, reject) => {
            const request = store.get(date);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};
