// ==========================================
// VERSIÓN 100% GRATIS - USA MAPILLARY
// ==========================================

let peer = null;
let connection = null;
let isHost = false;
let roomCode = null;
let gameConfig = {
    locationFilter: 'world',
    numRounds: 5
};

let gameState = {
    currentRound: 1,
    myScore: 0,
    opponentScore: 0,
    currentLocation: null
};

let viewer = null; // Visor de Mapillary

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('Aplicación iniciada - Versión 100% GRATIS');
});

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    document.getElementById('createRoomBtn').addEventListener('click', showCreateRoomScreen);
    document.getElementById('joinRoomBtn').addEventListener('click', showJoinRoomScreen);
    document.getElementById('startCreatingBtn').addEventListener('click', createRoom);
    document.getElementById('cancelCreateBtn').addEventListener('click', showStartScreen);
    document.getElementById('connectBtn').addEventListener('click', joinRoom);
    document.getElementById('cancelJoinBtn').addEventListener('click', showStartScreen);
    document.getElementById('guessBtn').addEventListener('click', nextRound);
    document.getElementById('playAgainBtn').addEventListener('click', playAgain);
    document.getElementById('exitBtn').addEventListener('click', exitGame);
}

// ==========================================
// NAVEGACIÓN ENTRE PANTALLAS
// ==========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showStartScreen() {
    showScreen('startScreen');
    cleanupConnection();
}

function showCreateRoomScreen() {
    showScreen('createRoomScreen');
}

function showJoinRoomScreen() {
    showScreen('joinRoomScreen');
}

function showGameScreen() {
    showScreen('gameScreen');
}

function showResultsScreen() {
    showScreen('resultsScreen');
}

// ==========================================
// CREACIÓN DE SALA (HOST)
// ==========================================

function createRoom() {
    isHost = true;
    gameConfig.locationFilter = document.getElementById('locationFilter').value;
    gameConfig.numRounds = parseInt(document.getElementById('numRounds').value);
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    peer = new Peer('room-' + roomCode, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('Sala creada:', id);
        document.getElementById('roomCode').textContent = roomCode;
        document.getElementById('roomCodeDisplay').style.display = 'block';
        document.getElementById('startCreatingBtn').disabled = true;
    });

    peer.on('connection', (conn) => {
        connection = conn;
        console.log('Jugador conectado');
        setupConnection();
        
        setTimeout(() => {
            sendMessage({ type: 'gameConfig', config: gameConfig });
            setTimeout(() => startGame(), 1000);
        }, 500);
    });

    peer.on('error', (err) => {
        console.error('Error:', err);
        alert('Error al crear la sala. Intenta de nuevo.');
    });
}

// ==========================================
// UNIRSE A SALA (GUEST)
// ==========================================

function joinRoom() {
    const inputCode = document.getElementById('roomCodeInput').value.trim();
    
    if (inputCode.length !== 4) {
        showStatus('Ingresa un código de 4 dígitos', 'error');
        return;
    }

    isHost = false;
    roomCode = inputCode;

    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('Mi ID:', id);
        showStatus('Conectando...', 'info');
        
        connection = peer.connect('room-' + roomCode, { reliable: true });
        setupConnection();

        connection.on('open', () => {
            console.log('Conectado a la sala');
            showStatus('¡Conectado! Esperando inicio...', 'success');
        });
    });

    peer.on('error', (err) => {
        console.error('Error:', err);
        showStatus('No se pudo conectar. Verifica el código.', 'error');
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + type;
}

// ==========================================
// CONFIGURACIÓN DE LA CONEXIÓN
// ==========================================

function setupConnection() {
    if (!connection) return;

    connection.on('data', (data) => {
        handleMessage(data);
    });

    connection.on('close', () => {
        console.log('Conexión cerrada');
        alert('El otro jugador se desconectó');
        showStartScreen();
    });

    connection.on('error', (err) => {
        console.error('Error de conexión:', err);
    });
}

function sendMessage(message) {
    if (connection && connection.open) {
        connection.send(message);
    }
}

function handleMessage(data) {
    console.log('Mensaje recibido:', data);

    switch(data.type) {
        case 'gameConfig':
            gameConfig = data.config;
            break;
        case 'startGame':
            startGame();
            break;
        case 'newLocation':
            loadLocation(data.location);
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
// LÓGICA DEL JUEGO
// ==========================================

function startGame() {
    console.log('Iniciando juego...');
    
    gameState.currentRound = 1;
    gameState.myScore = 0;
    gameState.opponentScore = 0;
    
    document.getElementById('totalRounds').textContent = gameConfig.numRounds;
    updateScoreDisplay();
    showGameScreen();
    
    initializeMapillary();
    
    if (isHost) {
        generateNewLocation();
    }
}

function initializeMapillary() {
    const container = document.getElementById('streetView');
    
    // Usar Mapillary (100% gratis)
    viewer = new Mapillary.Viewer({
        container: container,
        component: {
            cover: false,
            sequence: false
        }
    });
}

function generateNewLocation() {
    console.log('Generando ubicación...');
    
    const coords = getRandomCoordinates();
    
    // Usar API de Mapillary para encontrar imágenes cercanas
    const url = `https://graph.mapillary.com/images?access_token=MLY|4142433049200173|72206abe5035850d6743b23a49c41333&fields=id,computed_geometry&bbox=${coords.lng-0.1},${coords.lat-0.1},${coords.lng+0.1},${coords.lat+0.1}&limit=10`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data.length > 0) {
                // Elegir imagen aleatoria
                const randomImage = data.data[Math.floor(Math.random() * data.data.length)];
                
                const location = {
                    imageId: randomImage.id,
                    lat: randomImage.computed_geometry.coordinates[1],
                    lng: randomImage.computed_geometry.coordinates[0]
                };
                
                console.log('Ubicación encontrada:', location);
                loadLocation(location);
                sendMessage({ type: 'newLocation', location: location });
            } else {
                console.log('No se encontró ubicación, reintentando...');
                setTimeout(() => generateNewLocation(), 500);
            }
        })
        .catch(err => {
            console.error('Error al buscar ubicación:', err);
            setTimeout(() => generateNewLocation(), 1000);
        });
}

function getRandomCoordinates() {
    const filters = {
        world: { latMin: -60, latMax: 70, lngMin: -180, lngMax: 180 },
        europe: { latMin: 36, latMax: 71, lngMin: -10, lngMax: 40 },
        asia: { latMin: 10, latMax: 55, lngMin: 60, lngMax: 150 },
        americas: { latMin: -55, latMax: 70, lngMin: -170, lngMax: -30 },
        africa: { latMin: -35, latMax: 37, lngMin: -17, lngMax: 52 },
        oceania: { latMin: -47, latMax: -10, lngMin: 110, lngMax: 180 },
        spain: { latMin: 36, latMax: 43.8, lngMin: -9.3, lngMax: 4.3 },
        usa: { latMin: 25, latMax: 49, lngMin: -125, lngMax: -66 },
        japan: { latMin: 30, latMax: 46, lngMin: 129, lngMax: 146 }
    };

    const filter = filters[gameConfig.locationFilter] || filters.world;
    const lat = filter.latMin + Math.random() * (filter.latMax - filter.latMin);
    const lng = filter.lngMin + Math.random() * (filter.lngMax - filter.lngMin);
    
    return { lat, lng };
}

function loadLocation(location) {
    gameState.currentLocation = location;
    
    // Mover el visor a la nueva imagen
    if (viewer && location.imageId) {
        viewer.moveTo(location.imageId).catch(err => {
            console.error('Error al cargar imagen:', err);
        });
    }
    
    document.getElementById('locationInfo').textContent = 
        capitalizeFirst(gameConfig.locationFilter);
    document.getElementById('currentRound').textContent = gameState.currentRound;
}

function nextRound() {
    const roundScore = Math.floor(500 + Math.random() * 500);
    gameState.myScore += roundScore;
    updateScoreDisplay();
    
    sendMessage({
        type: 'nextRound',
        score: roundScore
    });
    
    proceedToNextRound();
}

function proceedToNextRound() {
    gameState.currentRound++;
    
    if (gameState.currentRound > gameConfig.numRounds) {
        sendMessage({
            type: 'gameOver',
            finalScore: gameState.myScore
        });
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
// RESULTADOS FINALES
// ==========================================

function showFinalResults() {
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
// ACCIONES DE FIN DE JUEGO
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
    if (viewer) {
        viewer = null;
    }
    roomCode = null;
    isHost = false;
}

// ==========================================
// UTILIDADES
// ==========================================

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

window.addEventListener('beforeunload', () => {
    cleanupConnection();
});