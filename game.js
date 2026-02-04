// ==========================================
// VERSIÓN ULTRA SIMPLE - FUNCIONA 100%
// ==========================================

let peer = null;
let connection = null;
let isHost = false;
let roomCode = null;
let gameConfig = { numRounds: 5 };
let gameState = {
    currentRound: 1,
    myScore: 0,
    opponentScore: 0
};

// Imágenes de ubicaciones (usando URLs públicas de Unsplash)
const locations = [
    { url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800', hint: 'Ciudad europea' },
    { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800', hint: 'Edificio famoso' },
    { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', hint: 'Ciudad nocturna' },
    { url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800', hint: 'Playa tropical' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', hint: 'Montañas' },
    { url: 'https://images.unsplash.com/photo-1514923995763-768e52f5af87?w=800', hint: 'Metrópolis asiática' },
    { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800', hint: 'Playa y montaña' },
    { url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800', hint: 'Ciudad costera' },
    { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', hint: 'Paisaje natural' },
    { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800', hint: 'Lago y montañas' }
];

console.log('✅ Aplicación iniciada correctamente');

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM cargado');
    setupEventListeners();
});

function setupEventListeners() {
    console.log('✅ Configurando botones...');
    
    const buttons = {
        createRoomBtn: showCreateRoomScreen,
        joinRoomBtn: showJoinRoomScreen,
        startCreatingBtn: createRoom,
        cancelCreateBtn: showStartScreen,
        connectBtn: joinRoom,
        cancelJoinBtn: showStartScreen,
        guessBtn: nextRound,
        playAgainBtn: playAgain,
        exitBtn: exitGame
    };

    for (let [id, handler] of Object.entries(buttons)) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
            console.log(`✅ Botón ${id} conectado`);
        } else {
            console.error(`❌ No se encontró el botón: ${id}`);
        }
    }
}

// ==========================================
// NAVEGACIÓN
// ==========================================

function showScreen(screenId) {
    console.log(`Mostrando pantalla: ${screenId}`);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showStartScreen() {
    showScreen('startScreen');
    cleanupConnection();
}

function showCreateRoomScreen() {
    console.log('📱 Abriendo pantalla de crear sala');
    showScreen('createRoomScreen');
}

function showJoinRoomScreen() {
    console.log('📱 Abriendo pantalla de unirse');
    showScreen('joinRoomScreen');
}

function showGameScreen() {
    showScreen('gameScreen');
}

function showResultsScreen() {
    showScreen('resultsScreen');
}

// ==========================================
// CREAR SALA
// ==========================================

function createRoom() {
    console.log('🎮 Creando sala...');
    
    isHost = true;
    gameConfig.numRounds = parseInt(document.getElementById('numRounds').value);
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    console.log(`📝 Código generado: ${roomCode}`);
    
    // Crear peer
    peer = new Peer('room-' + roomCode);

    peer.on('open', (id) => {
        console.log('✅ Sala creada con ID:', id);
        document.getElementById('roomCode').textContent = roomCode;
        document.getElementById('roomCodeDisplay').style.display = 'block';
        document.getElementById('startCreatingBtn').disabled = true;
    });

    peer.on('connection', (conn) => {
        console.log('✅ ¡Jugador conectado!');
        connection = conn;
        setupConnection();
        
        setTimeout(() => {
            console.log('📤 Enviando configuración del juego');
            sendMessage({ type: 'gameConfig', config: gameConfig });
            setTimeout(() => startGame(), 1000);
        }, 500);
    });

    peer.on('error', (err) => {
        console.error('❌ Error al crear sala:', err);
        alert('Error al crear sala. Intenta de nuevo.');
    });
}

// ==========================================
// UNIRSE A SALA
// ==========================================

function joinRoom() {
    const inputCode = document.getElementById('roomCodeInput').value.trim();
    
    console.log(`🔗 Intentando unirse a sala: ${inputCode}`);
    
    if (inputCode.length !== 4) {
        showStatus('Ingresa un código de 4 dígitos', 'error');
        return;
    }

    isHost = false;
    roomCode = inputCode;

    peer = new Peer();

    peer.on('open', (id) => {
        console.log('✅ Peer creado, ID:', id);
        showStatus('Conectando...', 'info');
        
        connection = peer.connect('room-' + roomCode);
        setupConnection();

        connection.on('open', () => {
            console.log('✅ ¡Conectado a la sala!');
            showStatus('¡Conectado! Esperando inicio...', 'success');
        });
    });

    peer.on('error', (err) => {
        console.error('❌ Error al conectar:', err);
        showStatus('No se pudo conectar. Verifica el código.', 'error');
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + type;
    console.log(`📢 Estado: ${message}`);
}

// ==========================================
// CONEXIÓN
// ==========================================

function setupConnection() {
    if (!connection) return;

    connection.on('data', (data) => {
        console.log('📥 Mensaje recibido:', data);
        handleMessage(data);
    });

    connection.on('close', () => {
        console.log('❌ Conexión cerrada');
        alert('El otro jugador se desconectó');
        showStartScreen();
    });

    connection.on('error', (err) => {
        console.error('❌ Error de conexión:', err);
    });
}

function sendMessage(message) {
    if (connection && connection.open) {
        console.log('📤 Enviando mensaje:', message);
        connection.send(message);
    } else {
        console.error('❌ No se puede enviar mensaje, conexión no abierta');
    }
}

function handleMessage(data) {
    switch(data.type) {
        case 'gameConfig':
            gameConfig = data.config;
            break;
        case 'startGame':
            startGame();
            break;
        case 'newLocation':
            loadLocation(data.locationIndex);
            break;
        case 'nextRound':
            gameState.opponentScore += data.score;
            updateScoreDisplay();
            proceedToNextRound();
            break;
        case 'gameOver':
            gameState.opponentScore = data.finalScore;
            showFinalResults();
            break;
    }
}

// ==========================================
// JUEGO
// ==========================================

function startGame() {
    console.log('🎮 ¡Iniciando juego!');
    
    gameState.currentRound = 1;
    gameState.myScore = 0;
    gameState.opponentScore = 0;
    
    document.getElementById('totalRounds').textContent = gameConfig.numRounds;
    updateScoreDisplay();
    showGameScreen();
    
    if (isHost) {
        generateNewLocation();
    }
}

function generateNewLocation() {
    const randomIndex = Math.floor(Math.random() * locations.length);
    console.log(`🌍 Nueva ubicación: índice ${randomIndex}`);
    
    loadLocation(randomIndex);
    sendMessage({ type: 'newLocation', locationIndex: randomIndex });
}

function loadLocation(index) {
    const location = locations[index];
    console.log('📍 Cargando ubicación:', location.hint);
    
    document.getElementById('locationImage').src = location.url;
    document.getElementById('locationHint').textContent = location.hint;
    document.getElementById('currentRound').textContent = gameState.currentRound;
}

function nextRound() {
    console.log('➡️ Siguiente ronda');
    
    const roundScore = Math.floor(500 + Math.random() * 500);
    gameState.myScore += roundScore;
    updateScoreDisplay();
    
    sendMessage({ type: 'nextRound', score: roundScore });
    proceedToNextRound();
}

function proceedToNextRound() {
    gameState.currentRound++;
    
    if (gameState.currentRound > gameConfig.numRounds) {
        console.log('🏁 Juego terminado');
        sendMessage({ type: 'gameOver', finalScore: gameState.myScore });
        showFinalResults();
    } else {
        if (isHost) {
            generateNewLocation();
        }
    }
}

function updateScoreDisplay() {
    document.getElementById('myScore').textContent = gameState.myScore;
    document.getElementById('opponentScore').textContent = gameState.opponentScore;
}

// ==========================================
// RESULTADOS
// ==========================================

function showFinalResults() {
    console.log('🏆 Mostrando resultados finales');
    
    document.getElementById('finalMyScore').textContent = gameState.myScore;
    document.getElementById('finalOpponentScore').textContent = gameState.opponentScore;
    
    const winnerMsg = document.getElementById('winnerMessage');
    
    if (gameState.myScore > gameState.opponentScore) {
        winnerMsg.textContent = '🎉 ¡Ganaste!';
        winnerMsg.className = 'winner-message win';
    } else if (gameState.myScore < gameState.opponentScore) {
        winnerMsg.textContent = '😢 Perdiste';
        winnerMsg.className = 'winner-message lose';
    } else {
        winnerMsg.textContent = '🤝 ¡Empate!';
        winnerMsg.className = 'winner-message tie';
    }
    
    showResultsScreen();
}

// ==========================================
// FIN DE JUEGO
// ==========================================

function playAgain() {
    if (isHost) {
        sendMessage({ type: 'startGame' });
        startGame();
    } else {
        alert('Esperando a que el host inicie...');
    }
}

function exitGame() {
    cleanupConnection();
    showStartScreen();
}

function cleanupConnection() {
    if (connection) {
        connection.close();
        connection = null;
    }
    if (peer) {
        peer.destroy();
        peer = null;
    }
    roomCode = null;
    isHost = false;
}

window.addEventListener('beforeunload', () => {
    cleanupConnection();
});

console.log('✅ Script cargado completamente');
