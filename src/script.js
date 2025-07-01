// **BELANGRIJK:** Vervang dit met de URL van uw eigen proxy server!
// Bijvoorbeeld: "http://localhost:3000/proxy?url=" als u de Node.js proxy van het vorige antwoord gebruikt.
const PROXY_URL_PREFIX = "http://localhost:3000/proxy?url="; // Pas dit aan!
const SPACEX_API_BASE_URL = "https://api.spacexdata.com/v4";
const NUM_UNIQUE_IMAGES = 8; // Aantal unieke afbeeldingen dat we willen gebruiken (voor 16 kaarten)
const CARD_BACK_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/1280px-SpaceX-Logo.svg.png'; // Een algemeen SpaceX logo voor de achterkant

let gameBoard = document.getElementById('game-board');
let movesCounter = document.getElementById('moves-counter');
let timerDisplay = document.getElementById('timer');
let statusMessage = document.getElementById('status-message');
let restartButton = document.getElementById('restart-button');

let cards = []; // Array om alle kaart-elementen op te slaan
let flippedCards = []; // Om de twee omgedraaide kaarten bij te houden
let matchedCards = 0; // Totaal aantal gematchte kaarten
let moves = 0; // Aantal zetten
let timerInterval;
let startTime;
let canFlip = true; // Voorkomt dat spelers kaarten omdraaien terwijl andere kaarten terugdraaien

document.addEventListener('DOMContentLoaded', startGame);
restartButton.addEventListener('click', startGame);

// --- API Ophalen en Afbeeldingen Verwerken ---
async function fetchSpaceXImages() {
    try {
        // We combineren lanceer- en raketafbeeldingen
        const [launchResponse, rocketResponse] = await Promise.all([
            fetch(`${SPACEX_API_BASE_URL}/launches/past?limit=50`), // Haal meer op om voldoende keuze te hebben
            fetch(`${SPACEX_API_BASE_URL}/rockets`)
        ]);

        if (!launchResponse.ok) throw new Error(`Launch data HTTP error! status: ${launchResponse.status}`);
        if (!rocketResponse.ok) throw new Error(`Rocket data HTTP error! status: ${rocketResponse.status}`);

        const launches = await launchResponse.json();
        const rockets = await rocketResponse.json();

        let allImageUrls = [];

        launches.forEach(launch => {
            if (launch.links && launch.links.flickr && launch.links.flickr.original) {
                allImageUrls.push(...launch.links.flickr.original);
            } else if (launch.links && launch.links.flickr && launch.links.flickr.small) {
                allImageUrls.push(...launch.links.flickr.small);
            }
        });

        rockets.forEach(rocket => {
            if (rocket.flickr_images) {
                allImageUrls.push(...rocket.flickr_images);
            }
        });

        // Filter duplicaten en ongeldige URL's
        allImageUrls = [...new Set(allImageUrls)].filter(url => url && url.startsWith('http'));

        // Kies een willekeurig aantal unieke afbeeldingen
        // Shuffle the array and pick the first NUM_UNIQUE_IMAGES
        shuffleArray(allImageUrls);
        const selectedUniqueImages = allImageUrls.slice(0, NUM_UNIQUE_IMAGES);

        if (selectedUniqueImages.length < NUM_UNIQUE_IMAGES) {
            console.warn(`Slechts ${selectedUniqueImages.length} unieke afbeeldingen gevonden, nodig: ${NUM_UNIQUE_IMAGES}. Spel kan kleiner zijn.`);
        }

        return selectedUniqueImages;

    } catch (error) {
        console.error("Fout bij het ophalen van SpaceX API-gegevens:", error);
        statusMessage.textContent = "Fout bij het laden van afbeeldingen. Controleer uw proxy en internetverbinding.";
        return []; // Retourneer een lege array bij fout
    }
}

// --- Spel Logica ---

async function startGame() {
    resetGame();
    statusMessage.textContent = "Laden van SpaceX-afbeeldingen...";
    gameBoard.innerHTML = '<p class="loading-message">Laden van SpaceX-afbeeldingen...</p>';
    restartButton.style.display = 'none'; // Verberg herstartknop

    const uniqueImageUrls = await fetchSpaceXImages();

    if (uniqueImageUrls.length === 0) {
        gameBoard.innerHTML = ''; // Verwijder laadmelding
        statusMessage.textContent = "Kan het spel niet starten: geen afbeeldingen gevonden.";
        return;
    }

    // Verdubbel de afbeeldingen voor paren
    const gameImageUrls = [...uniqueImageUrls, ...uniqueImageUrls];
    shuffleArray(gameImageUrls); // Schud de kaarten

    createCards(gameImageUrls);
    statusMessage.textContent = "Klik op een kaart om te beginnen!";

    // Start de timer pas wanneer de eerste kaart wordt omgedraaid
    // (De timer wordt gestart in handleCardClick)
}

function resetGame() {
    clearInterval(timerInterval);
    moves = 0;
    matchedCards = 0;
    flippedCards = [];
    canFlip = true;
    movesCounter.textContent = `Zetten: ${moves}`;
    timerDisplay.textContent = `Tijd: 0s`;
    statusMessage.textContent = "";
    gameBoard.innerHTML = ''; // Leeg het bord
}

function createCards(imageUrls) {
    gameBoard.innerHTML = ''; // Zorg ervoor dat het bord leeg is
    cards = []; // Leeg de kaartenarray

    // Pas grid-template-columns aan op basis van het aantal kaarten
    let numColumns = 4; // Standaard 4 kolommen
    const totalCards = imageUrls.length;
    if (totalCards === 12) numColumns = 4; // Bijv. 3x4 of 4x3
    if (totalCards === 8) numColumns = 4; // Bijv. 2x4 of 4x2
    if (totalCards === 16) numColumns = 4; // 4x4
    if (totalCards === 20) numColumns = 5; // 4x5
    if (totalCards === 24) numColumns = 6; // 4x6
    if (totalCards === 30) numColumns = 6; // 5x6
    gameBoard.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;

    imageUrls.forEach((url, index) => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.image = url; // Sla de originele URL op voor matching
        card.dataset.index = index; // Unieke index voor debugging

        const frontFace = document.createElement('div');
        frontFace.classList.add('front-face');
        const imgFront = document.createElement('img');
        imgFront.src = PROXY_URL_PREFIX + encodeURIComponent(url);
        imgFront.alt = "SpaceX Afbeelding";
        imgFront.onerror = () => {
            console.error(`Fout bij het laden van afbeelding via proxy: ${imgFront.src}`);
            imgFront.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMjAwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlMGUwZTAiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjNzc3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb29taWUtcmljaD0iYmFzZWxpbmUiPlNQQUNFWCBmYWlsZWQ8L3RleHQ+Cjwvc3ZnPg=='; // Fallback SVG
        };
        frontFace.appendChild(imgFront);

        const backFace = document.createElement('div');
        backFace.classList.add('back-face');
        const imgBack = document.createElement('img');
        imgBack.src = CARD_BACK_IMAGE; // Het SpaceX logo op de achterkant
        imgBack.alt = "SpaceX Logo";
        backFace.appendChild(imgBack);

        card.appendChild(frontFace);
        card.appendChild(backFace);

        card.addEventListener('click', handleCardClick);
        gameBoard.appendChild(card);
        cards.push(card);
    });
}

function handleCardClick(event) {
    const clickedCard = event.currentTarget;

    // Start timer bij eerste klik als deze nog niet loopt
    if (!startTime) {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
    }

    // Voorkom klikken als:
    // 1. We aan het controleren zijn of de twee kaarten matchen
    // 2. De kaart al omgedraaid is
    // 3. De kaart al gematcht is
    if (!canFlip || clickedCard.classList.contains('flipped') || clickedCard.classList.contains('matched')) {
        return;
    }

    clickedCard.classList.add('flipped');
    flippedCards.push(clickedCard);

    if (flippedCards.length === 2) {
        moves++;
        movesCounter.textContent = `Zetten: ${moves}`;
        canFlip = false; // Voorkom meer klikken
        checkForMatch();
    }
}

function checkForMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.image === card2.dataset.image;

    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    flippedCards.forEach(card => {
        card.removeEventListener('click', handleCardClick);
        card.classList.add('matched');
    });
    matchedCards += 2; // Twee kaarten gematcht
    flippedCards = [];
    canFlip = true; // Heractiveer klikken

    if (matchedCards === cards.length) {
        // Spel gewonnen!
        clearInterval(timerInterval);
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        statusMessage.textContent = `Gefeliciteerd! Je hebt gewonnen in ${moves} zetten en ${timeTaken} seconden!`;
        restartButton.style.display = 'block'; // Toon herstartknop
    }
}

function unflipCards() {
    setTimeout(() => {
        flippedCards.forEach(card => {
            card.classList.remove('flipped');
        });
        flippedCards = [];
        canFlip = true; // Heractiveer klikken
    }, 1000); // Wacht 1 seconde voordat kaarten terugdraaien
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `Tijd: ${elapsedTime}s`;
}

// --- Hulplijst Functies ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elementen
    }
}