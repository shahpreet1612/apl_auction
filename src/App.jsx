import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    updateDoc, 
    onSnapshot, 
    collection, 
    query, 
    getDocs,
    writeBatch,
    runTransaction,
    setLogLevel,
    serverTimestamp,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { 
    RefreshCcw, LogIn, TrendingUp, DollarSign, Users, Trophy, Hammer, XCircle, CheckCircle, 
    Search, Users2, ShieldHalf, LayoutDashboard, Home, Gauge, Upload, ArrowRight, Rss, 
    Clock, PlusCircle, Maximize, List, Edit
} from 'lucide-react';

// --- CONFIGURATION & FIREBASE SETUP ---
// NOTE: We MUST use your hardcoded keys for external deployment (Vite/Vercel).
// The conditional logic that caused the duplicate declaration error has been removed.

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCAxCJ3PsfcQsEFgrtMpAYSSIRBr4wpmQ",
  authDomain: "apl-auction-2025.firebaseapp.com",
  projectId: "apl-auction-2025",
  storageBucket: "apl-auction-2025.firebasestorage.app",
  messagingSenderId: "406168935600",
  appId: "1:406168935600:web:a8a971576f1f784f172f75",
  measurementId: "G-92W8PBTTPS"
};

const initialAuthToken = null; // No custom token needed for external deployment

// --- AUCTION CONSTANTS ---
const ADMIN_KEY = 'APL_ADMIN_KEY'; 
const INITIAL_CAPITAL = 100000000; // 10 Crore
const AUCTION_DURATION_SECONDS = 40; 
const ANTI_SNIPE_WINDOW = 8; 
const ANTI_SNIPE_EXTENSION = 15; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
setLogLevel('debug'); 

// Firestore Paths
const appId = "apl_auction_instance"; // Static ID for collection path, since we removed __app_id
const PUBLIC_PATH = `artifacts/${appId}/public/data`;
const TEAMS_COLLECTION = `${PUBLIC_PATH}/teams`;
const PLAYERS_COLLECTION = `${PUBLIC_PATH}/players`;
const AUCTION_STATE_DOC = `${PUBLIC_PATH}/auction_state/current_auction`;

// Auction States
const AUCTION_STATES = {
    HOME: 'HOME',
    ADMIN_LOGIN: 'ADMIN_LOGIN',
    ADMIN: 'ADMIN',
    OWNER: 'OWNER',
    PROJECTOR: 'PROJECTOR',
    TEAM_CLAIM: 'TEAM_CLAIM',
    PRE_AUCTION: 'PRE_AUCTION',
    BIDDING_ACTIVE: 'BIDDING_ACTIVE',
    PLAYER_SOLD: 'PLAYER_SOLD',
    PLAYER_UNSOLD: 'PLAYER_UNSOLD',
    AUCTION_COMPLETE: 'AUCTION_COMPLETE',
};

// Initial Data Structure (10 IPL-Style Teams)
const INITIAL_TEAMS = [
    { id: 't1', name: 'Chennai Superstars', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 1', color: 'text-yellow-400', logoUrl: 'https://placehold.co/60x60/facc15/000000?text=CS' },
    { id: 't2', name: 'Mumbai Mighty', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 2', color: 'text-indigo-400', logoUrl: 'https://placehold.co/60x60/6366f1/ffffff?text=MM' },
    { id: 't3', name: 'Royal Challengers APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 3', color: 'text-red-500', logoUrl: 'https://placehold.co/60x60/ef4444/ffffff?text=RCA' },
    { id: 't4', name: 'Kolkata Knight Riders APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 4', color: 'text-purple-400', logoUrl: 'https://placehold.co/60x60/c084fc/ffffff?text=KKA' },
    { id: 't5', name: 'Delhi Capitals APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 5', color: 'text-sky-400', logoUrl: 'https://placehold.co/60x60/38bdf8/ffffff?text=DCA' },
    { id: 't6', name: 'Sunrisers Hyderabad APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 6', color: 'text-orange-400', logoUrl: 'https://placehold.co/60x60/fb923c/ffffff?text=SHA' },
    { id: 't7', name: 'Punjab Kings APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 7', color: 'text-pink-500', logoUrl: 'https://placehold.co/60x60/d946ef/ffffff?text=PKA' },
    { id: 't8', name: 'Gujarat Titans APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 8', color: 'text-cyan-400', logoUrl: 'https://placehold.co/60x60/06b6d4/000000?text=GTA' },
    { id: 't9', name: 'Lucknow Super Giants APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 9', color: 'text-green-500', logoUrl: 'https://placehold.co/60x60/22c55e/ffffff?text=LSA' },
    { id: 't10', name: 'Rajasthan Royals APL', maxCapital: INITIAL_CAPITAL, ownerName: 'Owner 10', color: 'text-gray-400', logoUrl: 'https://placehold.co/60x60/9ca3af/000000?text=RRA' },
];

// Initial Player Data (IPL-Style)
const INITIAL_PLAYERS = [
    { id: 'p1', name: 'Hardik P Clone', category: 'All-Rounder', basePrice: 40000000, points: 97, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=HP', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p2', name: 'Jasprit B Clone', category: 'Bowler', basePrice: 30000000, points: 98, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=JB', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p3', name: 'Virat K Clone', category: 'Batsman', basePrice: 35000000, points: 99, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=VK', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p4', name: 'Rishabh P Clone', category: 'Wk-Batsman', basePrice: 28000000, points: 95, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=RP', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p5', name: 'KL R Clone', category: 'Batsman', basePrice: 22000000, points: 92, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=KLR', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p6', name: 'Suryakumar Y Clone', category: 'Batsman', basePrice: 18000000, points: 90, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=SKY', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p7', name: 'Ravindra J Clone', category: 'All-Rounder', basePrice: 25000000, points: 94, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=RJ', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p8', name: 'Shami A Clone', category: 'Bowler', basePrice: 15000000, points: 88, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=SA', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p9', name: 'Shreyas I Clone', category: 'Batsman', basePrice: 12000000, points: 85, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=SI', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p10', name: 'Bhuvi K Clone', category: 'Bowler', basePrice: 10000000, points: 82, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=BK', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p11', name: 'Ishan K Clone', category: 'Wk-Batsman', basePrice: 15000000, points: 85, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=IK', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p12', name: 'Deepak C Clone', category: 'All-Rounder', basePrice: 9000000, points: 79, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=DC', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p13', name: 'Young Spin M', category: 'Bowler', basePrice: 5000000, points: 75, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=YSM', status: 'available', team_assigned: null, total_spent: 0 },
    { id: 'p14', name: 'Rookie Finisher', category: 'Batsman', basePrice: 4000000, points: 70, photoUrl: 'https://placehold.co/80x80/22d3ee/ffffff?text=RF', status: 'available', team_assigned: null, total_spent: 0 },
];

// --- UTILITY FUNCTIONS & STYLES ---

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '₹ N/A';
    // Display in Crores (Cr) with max 4 significant digits (e.g., 5.5 Cr, 10.2 Cr)
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    }).format(amount / 10000000).replace('₹', '₹') + ' Cr';
};

const formatCurrencyFull = (amount) => {
    if (typeof amount !== 'number') return '₹ N/A';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
};

const getNextBidIncrement = (currentBid) => {
    if (currentBid < 5000000) return 100000;
    if (currentBid < 10000000) return 250000;
    if (currentBid < 50000000) return 500000;
    return 1000000;
};

// Placeholder for sound effects (prevents compilation error)
const playSound = (type) => {
    console.log(`Playing sound: ${type}`);
    try {
        const audio = new Audio();
        if (type === 'bid') {
            audio.volume = 0.5;
            audio.src = 'data:audio/wav;base64,UklGRl9HAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhw0oGAAAeD4APgA+AAoACgAKACoAPgA8ACoAKgA+AD0APQA/AD8AOQA9ADwAPQA9AEEAQQA+AD4APwA+ACsAMQAqACUAKgApADsAOwA/AD8APQA9AD0APQA9AD8APwA/AD8APQA9AEEAQQA+AD4APwA+ACsAMQAqACUAKgApAAAA'; 
        } else if (type === 'sold') {
            audio.volume = 0.8;
            audio.src = 'data:audio/wav;base64,UklGRl9IAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhx0oGAAAoADsAOwA/AD8APQA9AD0APQA9AD8APwA/AD8APQA9AEEAQQA+AD4APwA+ACsAMQAqACUAKgApAD0AOwA/AD4APQA9AD0APQA/AD8APwA/AD8APQA9AEEAQQA+AD4APwA+ACsAMQAqACUAKgApAAAA';
        }
        audio.play().catch(e => console.log("Audio playback failed: ", e.message));
    } catch (e) {
        console.error("Audio failed to load.", e);
    }
};

// --- REAL-TIME DATA CONTEXT & INITIALIZATION ---
const initialAuctionState = { status: AUCTION_STATES.PRE_AUCTION, currentPlayerId: null, highestTeamId: null, highestAmount: 0, auction_open: false, end_time: null, extensions_used: 0, lastSoldTeam: null, lastSoldPrice: 0, lastSoldPlayer: null };

const initializeDatabase = async (dbInstance) => {
    const teamsRef = collection(dbInstance, TEAMS_COLLECTION);
    const playersRef = collection(dbInstance, PLAYERS_COLLECTION);
    const auctionRef = doc(dbInstance, AUCTION_STATE_DOC);

    // Check if the critical collections are empty before seeding
    const teamDocs = await getDocs(teamsRef);
    const playerDocs = await getDocs(playersRef);
    const auctionDoc = await getDoc(auctionRef);

    const batch = writeBatch(dbInstance);
    let needsWrite = false;

    if (teamDocs.empty) {
        INITIAL_TEAMS.forEach(team => {
            batch.set(doc(teamsRef, team.id), { 
                ...team, 
                currentCapital: team.maxCapital, 
                players_count: 0, 
                total_spent: 0, 
                roster: [],
                ownerId: null, 
            });
        });
        needsWrite = true;
    }

    if (playerDocs.empty) {
        INITIAL_PLAYERS.forEach(player => {
            batch.set(doc(playersRef, player.id), player);
        });
        needsWrite = true;
    }

    if (!auctionDoc.exists()) {
        batch.set(auctionRef, initialAuctionState);
        needsWrite = true;
    }

    if (needsWrite) {
        await batch.commit();
        console.log("Database initialization complete.");
    }
};

// --- CORE UTILITY COMPONENTS ---

// Custom Toast/Notification Component (replaces alert/confirm)
const ToastNotification = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const color = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-indigo-600';

    return (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl text-white ${color} transition-all duration-300 transform animate-pulse-once z-50`}>
            {message}
        </div>
    );
};

// Countdown Timer Component
const CountdownTimer = ({ endTime, auctionState, onTimeout }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const auctionStateRef = useRef(auctionState);
    auctionStateRef.current = auctionState; 

    const isBiddingActive = auctionState?.status === AUCTION_STATES.BIDDING_ACTIVE;
    const isAntiSnipe = timeLeft <= ANTI_SNIPE_WINDOW && timeLeft > 0;

    useEffect(() => {
        if (!isBiddingActive || !endTime) {
            setTimeLeft(AUCTION_DURATION_SECONDS);
            return;
        }

        let targetTime = endTime;
        if (targetTime && targetTime.toDate) {
            targetTime = targetTime.toDate().getTime();
        } else if (typeof targetTime === 'string') {
             targetTime = new Date(targetTime).getTime();
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                if (auctionStateRef.current.status === AUCTION_STATES.BIDDING_ACTIVE) {
                     onTimeout();
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isBiddingActive, endTime, onTimeout, auctionState.extensions_used]);

    // Calculate percentage for circular progress bar
    const initialDuration = AUCTION_DURATION_SECONDS + (auctionState.extensions_used * ANTI_SNIPE_EXTENSION);
    const currentProgress = (timeLeft / initialDuration) * 100;
    
    const timerColor = isAntiSnipe ? 'text-red-500' : 'text-green-400';
    const progressColor = isAntiSnipe ? '#f87171' : '#4ade80';

    return (
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto md:w-32 md:h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                    className="text-gray-700/50"
                    fill="none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                    className="transition-all duration-1000 ease-linear"
                    stroke={progressColor}
                    strokeLinecap="round"
                    strokeWidth="3.8"
                    strokeDasharray={`${currentProgress}, 100`}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
            </svg>
            <div className={`absolute flex flex-col items-center justify-center ${timerColor}`}>
                <Clock className="w-5 h-5 mb-1" />
                <span className="text-3xl font-black">{timeLeft}</span>
                {isAntiSnipe && <span className="text-xs font-bold text-yellow-400 mt-1 animate-pulse">+ {ANTI_SNIPE_EXTENSION}s SNIPE GUARD</span>}
            </div>
        </div>
    );
};

// Stat Card for Dashboard
const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className={`p-4 bg-gray-800 shadow-xl rounded-xl border-t-4 border-indigo-500 transition hover:shadow-neon-sm`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
                <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
            </div>
            <Icon className={`w-8 h-8 ${color}`} />
        </div>
    </div>
);


// --- VIEW COMPONENTS ---

// 1. HOME VIEW
const HomePage = ({ setMode, allTeams, userId }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8 font-sans">
        <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-pink-500 mb-2">
                Preet's Auction Platform
            </h1>
            <p className="text-2xl font-light text-gray-400">
                A U C T I O N E E R I N G &nbsp; T H E &nbsp; **Aqua Premier League**
            </p>
            <p className="mt-4 text-xs text-gray-500">
                Your Current User ID: <span className="font-mono bg-gray-800 p-1 rounded">{userId}</span>
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
            <ModeButton icon={LayoutDashboard} label="Team Owner / Captain" color="bg-indigo-600" onClick={() => setMode(AUCTION_STATES.TEAM_CLAIM)} />
            <ModeButton icon={Hammer} label="Admin / Auctioneer" color="bg-red-600" onClick={() => setMode(AUCTION_STATES.ADMIN_LOGIN)} />
            <ModeButton icon={Maximize} label="Projector View" color="bg-emerald-600" onClick={() => setMode(AUCTION_STATES.PROJECTOR)} />
            <ModeButton icon={Users} label="View Teams" color="bg-gray-600" onClick={() => setMode(AUCTION_STATES.TEAM_CLAIM)} />
        </div>
        
        <div className="mt-12 text-center text-gray-500">
             <p className="font-semibold text-xl mb-2">Total Teams Registered: {allTeams.filter(t => t.ownerId).length} / {INITIAL_TEAMS.length}</p>
        </div>
    </div>
);

const ModeButton = ({ icon: Icon, label, color, onClick }) => (
    <button 
        onClick={onClick}
        className={`p-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition duration-300 ease-in-out 
                   ${color} text-white font-bold flex flex-col items-center space-y-2 group`}
        style={{ boxShadow: `0 0 15px ${color.replace('bg-', 'var(--tw-shadow-color-')})` }}
    >
        <Icon className="w-8 h-8 group-hover:animate-pulse" />
        <span className="text-sm">{label}</span>
    </button>
);

// 2. ADMIN LOGIN VIEW
const AdminLogin = ({ setMode, handleAdminKeySubmit, adminKeyInput, setAdminKeyInput }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
        <div className="p-10 bg-gray-800 rounded-xl shadow-neon-lg border border-red-500/50 max-w-md w-full">
            <h2 className="text-3xl font-extrabold text-red-400 mb-6 text-center flex items-center justify-center">
                <ShieldHalf className='w-6 h-6 mr-2' /> Admin Access Required
            </h2>
            <p className='text-gray-400 mb-4 text-center'>
                Admin Key: <span className='font-mono text-white bg-gray-700 px-2 py-1 rounded'>{ADMIN_KEY}</span>
            </p>
            <form onSubmit={handleAdminKeySubmit} className="space-y-4">
                <input 
                    type="password"
                    placeholder={`Enter Admin Key`}
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-red-500 focus:border-red-500"
                />
                <button 
                    type="submit" 
                    className="w-full py-3 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition"
                >
                    Unlock Admin Panel
                </button>
            </form>
            <button onClick={() => setMode(AUCTION_STATES.HOME)} className="mt-6 text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center w-full">
                <ArrowRight className='w-4 h-4 mr-2 rotate-180'/> Back to Home
            </button>
        </div>
    </div>
);


// 3. PROJECTOR VIEW
const ProjectorView = ({ setMode, auctionState, currentPlayer, currentBidderTeam, getTeamLogoUrl, allTeams, players }) => {
    const isSold = auctionState.status === AUCTION_STATES.PLAYER_SOLD;
    const isUnsold = auctionState.status === AUCTION_STATES.PLAYER_UNSOLD;
    const isBidding = auctionState.status === AUCTION_STATES.BIDDING_ACTIVE;

    const displayPlayer = isSold || isUnsold ? players.find(p => p.id === auctionState.lastSoldPlayer) : currentPlayer;
    const displayBid = isSold ? auctionState.lastSoldPrice : auctionState.highestAmount;
    const displayTeam = isSold ? allTeams.find(t => t.id === auctionState.lastSoldTeam) : currentBidderTeam;

    if (!displayPlayer || auctionState.status === AUCTION_STATES.PRE_AUCTION) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
                <h1 className="text-7xl font-extrabold text-indigo-400">AUCTION PENDING</h1>
                <p className="text-3xl text-gray-500 mt-4">Waiting for Admin to Nominate a Player...</p>
                 <button onClick={() => setMode(AUCTION_STATES.HOME)} className="mt-8 text-indigo-400 hover:text-indigo-300 transition flex items-center text-xl">
                    <ArrowRight className='w-5 h-5 mr-2 rotate-180'/> Return Home
                </button>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-10 relative overflow-hidden">
            <style>
                {`
                    @keyframes neon-glow {
                        0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px ${displayTeam?.color.replace('text-', '#') || '#4f46e5'}, 0 0 20px ${displayTeam?.color.replace('text-', '#') || '#4f46e5'}; }
                        50% { text-shadow: 0 0 2px #fff, 0 0 8px ${displayTeam?.color.replace('text-', '#') || '#4f46e5'}, 0 0 15px ${displayTeam?.color.replace('text-', '#') || '#4f46e5'}; }
                    }
                    .neon-text { animation: neon-glow 1.5s ease-in-out infinite alternate; }
                    @keyframes confetti-burst {
                        0% { opacity: 1; transform: scale(0.5) rotate(0deg); }
                        100% { opacity: 0; transform: scale(2) rotate(180deg); }
                    }
                    .animate-confetti { 
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        animation: confetti-burst 1s ease-out forwards; 
                        background: radial-gradient(circle at center, rgba(79, 70, 229, 0.5) 0%, rgba(255, 255, 255, 0.1) 10%, rgba(0,0,0,0) 70%);
                        z-index: 50;
                    }
                    .animate-pulse-bid { 
                        animation: pulse 0.5s 3; 
                    }
                `}
            </style>
            
            {isSold && <div className="animate-confetti" />}

            {/* HEADER */}
            <div className="w-full flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-pink-500">
                    Preet's Auction Platform
                </h1>
                <h2 className="text-2xl font-light text-gray-400">Aqua Premier League</h2>
                <button onClick={() => setMode(AUCTION_STATES.HOME)} className="text-gray-400 hover:text-white transition flex items-center">
                    <Home className='w-5 h-5 mr-1' /> Home
                </button>
            </div>
            
            {/* MAIN PLAYER CARD */}
            <div className="w-full max-w-6xl flex bg-gray-800/80 backdrop-blur-md p-10 rounded-2xl shadow-neon-xl">
                
                {/* LEFT: PLAYER IMAGE & INFO */}
                <div className="w-1/3 flex flex-col items-center pr-10 border-r border-gray-700">
                    <img 
                        src={displayPlayer.photoUrl} 
                        alt={displayPlayer.name} 
                        className="w-full h-auto object-cover rounded-xl shadow-lg border-4 border-indigo-500/50"
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/200x200/4f46e5/ffffff?text=${displayPlayer.name.split(' ').map(n => n[0]).join('')}` }}
                    />
                    <div className="mt-6 text-center">
                        <p className="text-2xl font-bold text-gray-300">Category: <span className="text-green-400">{displayPlayer.category}</span></p>
                        <p className="text-xl font-medium text-gray-400">Points: <span className="text-yellow-400">{displayPlayer.points}</span></p>
                    </div>
                </div>

                {/* RIGHT: AUCTION DETAILS */}
                <div className="w-2/3 pl-10">
                    <p className="text-3xl text-gray-500 mb-2 font-light">PLAYER ON AUCTION</p>
                    <h2 className="text-7xl font-black mb-8 text-white uppercase tracking-wider">
                        {displayPlayer.name}
                    </h2>
                    
                    {/* CURRENT BID / STATUS BLOCK */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="p-4 bg-gray-700 rounded-xl shadow-inner w-1/2 mr-4">
                                <p className="text-2xl font-medium text-gray-400">BASE PRICE</p>
                                <p className="text-4xl font-extrabold text-pink-400 mt-1">{formatCurrency(displayPlayer.basePrice)}</p>
                            </div>
                            
                            <div className="p-4 bg-gray-700 rounded-xl shadow-inner w-1/2">
                                <p className="text-2xl font-medium text-gray-400">HIGHEST BID</p>
                                <p key={displayBid} className="text-4xl font-extrabold text-sky-400 animate-pulse-bid mt-1">
                                    {formatCurrency(displayBid)}
                                </p>
                            </div>
                        </div>

                        {/* LIVE BIDDER / TIMER */}
                        {isBidding ? (
                            <div className="flex items-center justify-between p-6 bg-indigo-900/50 rounded-xl border border-indigo-400/50">
                                <div className="flex items-center space-x-4">
                                    <img src={getTeamLogoUrl(displayTeam?.id)} alt={displayTeam?.name || 'N/A'} className="w-16 h-16 rounded-full border-2 border-white"/>
                                    <div>
                                        <p className="text-xl text-gray-400">LEADING BIDDER</p>
                                        <p className={`text-4xl font-black neon-text ${displayTeam?.color || 'text-white'}`}>{displayTeam?.name || '---'}</p>
                                    </div>
                                </div>
                                <CountdownTimer endTime={auctionState.end_time} auctionState={auctionState} onTimeout={() => { /* Admin handles timeout */ }} />
                            </div>
                        ) : (
                            <div className="text-center p-8 rounded-xl bg-gray-700/50">
                                {isSold && (
                                    <>
                                        <p className="text-3xl font-extrabold text-green-400 animate-bounce">
                                            SOLD!
                                        </p>
                                        <p className={`text-5xl font-black mt-2 neon-text ${displayTeam?.color || 'text-white'}`}>
                                            TO {displayTeam?.name.toUpperCase()} FOR {formatCurrency(auctionState.lastSoldPrice)}
                                        </p>
                                    </>
                                )}
                                {isUnsold && (
                                    <p className="text-4xl font-black text-yellow-400">UNSOLD</p>
                                )}
                                {(auctionState.status === AUCTION_STATES.PLAYER_SOLD || auctionState.status === AUCTION_STATES.PLAYER_UNSOLD) && (
                                    <p className='text-gray-400 mt-4'>Waiting for next player nomination...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Team Purse Overview (Bottom Bar) */}
            <div className="mt-10 w-full max-w-6xl bg-gray-800/80 p-4 rounded-xl shadow-lg border border-gray-700">
                <h3 className="text-lg font-bold text-gray-400 mb-3">TEAM PURSE TRACKER</h3>
                <div className="grid grid-cols-5 gap-4">
                    {allTeams.sort((a, b) => b.currentCapital - a.currentCapital).map(team => (
                        <div key={team.id} className="p-3 bg-gray-700 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className={`text-md font-bold ${team.color}`}>{team.name.split(' ')[0]}</span>
                                <span className="text-sm font-light text-gray-300">{team.roster.length} P</span>
                            </div>
                            <p className="text-2xl font-black mt-1 text-white">{formatCurrency(team.currentCapital)}</p>
                            <div className="h-1 bg-gray-600 rounded-full mt-1">
                                <div 
                                    className="h-1 rounded-full transition-all duration-500" 
                                    style={{ 
                                        width: `${(team.currentCapital / team.maxCapital) * 100}%`,
                                        backgroundColor: team.currentCapital / team.maxCapital < 0.2 ? '#f87171' : '#4ade80'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// 4. OWNER / CAPTAIN DASHBOARD 
const OwnerDashboard = ({ setMode, userTeam, auctionState, currentPlayer, currentBidderTeam, placeBid, players, getTeamLogoUrl, setToast }) => {
    const isBiddingActive = auctionState.status === AUCTION_STATES.BIDDING_ACTIVE;
    const nextBidIncrement = getNextBidIncrement(auctionState.highestAmount);
    const minBid = auctionState.highestAmount === 0 ? (currentPlayer?.basePrice || 0) : auctionState.highestAmount + nextBidIncrement;
    const isHighBidder = userTeam?.id === auctionState.highestTeamId;
    
    const [customBidInput, setCustomBidInput] = useState('');
    
    const handleCustomBid = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            let amount;
            // Convert Crores input to full INR value
            const amountInCrore = parseFloat(customBidInput);
            if (!isNaN(amountInCrore)) {
                amount = Math.round(amountInCrore * 10000000); 
            } else {
                setToast({ message: "Invalid bid amount.", type: 'error' });
                return;
            }

            if (amount && amount >= minBid && amount <= userTeam.currentCapital) {
                placeBid(amount);
            } else if (amount < minBid) {
                 setToast({ message: `Custom bid must be at least ${formatCurrencyFull(minBid)}`, type: 'error' });
            } else if (amount > userTeam.currentCapital) {
                 setToast({ message: `Insufficient funds. Max bid: ${formatCurrency(userTeam.currentCapital)}`, type: 'error' });
            }
            setCustomBidInput('');
        }
    };
    
    const handlePresetBid = (bidIncrement) => {
        const targetBid = auctionState.highestAmount + bidIncrement;
        placeBid(targetBid);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
            <header className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl shadow-lg flex justify-between items-center mb-6 border-b-2 border-indigo-500">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-pink-500 flex items-center">
                    <Trophy className="w-6 h-6 mr-2" />
                    APL Captain Dashboard
                </h1>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setMode(AUCTION_STATES.HOME)} className="text-gray-400 hover:text-white transition flex items-center text-sm">
                        <Home className='w-4 h-4 mr-1' /> Home
                    </button>
                    <img src={getTeamLogoUrl(userTeam.id)} alt={userTeam.name} className="w-10 h-10 rounded-full border-2 border-white" />
                    <div>
                        <p className={`text-xl font-bold ${userTeam.color}`}>{userTeam.name.split(' ')[0]}</p>
                        <p className="text-sm text-gray-400">Purse: {formatCurrency(userTeam.currentCapital)}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border-4 border-red-500/50">
                        <div className="text-center mb-6">
                            <p className="text-sm font-semibold text-gray-500">LIVE AUCTION STATUS</p>
                            <h3 className="text-4xl font-extrabold text-white mt-2">
                                {currentPlayer ? currentPlayer.name : 'Awaiting Nomination'}
                            </h3>
                            <p className="text-xl text-indigo-400 font-semibold mt-1">
                                {currentPlayer ? `Base Price: ${formatCurrency(currentPlayer.basePrice)}` : ''}
                            </p>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-around items-center bg-gray-700/50 p-6 rounded-lg border border-gray-600 space-y-4 md:space-y-0">
                            <div className="text-center p-3">
                                <p className="text-sm text-gray-400">Current Highest Bid</p>
                                <p key={auctionState.highestAmount} className="text-4xl font-black text-sky-400 animate-pulse-bid">
                                    {formatCurrencyFull(auctionState.highestAmount)}
                                </p>
                            </div>
                            <div className="text-center p-3">
                                <p className="text-sm text-gray-400">Leading Team</p>
                                <p className={`text-xl font-bold ${currentBidderTeam?.color || 'text-gray-400'}`}>
                                    {currentBidderTeam ? currentBidderTeam.name.split(' ')[0] : 'NO BIDS'}
                                </p>
                                {isHighBidder && <span className="text-green-400 text-xs font-bold mt-1 block">YOU ARE LEADING</span>}
                            </div>
                            <CountdownTimer endTime={auctionState.end_time} auctionState={auctionState} onTimeout={() => {}} />
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <h4 className="text-lg font-bold mb-4 text-white">Place Your Bid: {isHighBidder ? 'You Lead' : `Minimum Bid: ${formatCurrencyFull(minBid)}`}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                {/* Preset Bid Buttons */}
                                {[getNextBidIncrement(auctionState.highestAmount), getNextBidIncrement(auctionState.highestAmount) * 2, 5000000, 10000000].map((inc, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePresetBid(inc)}
                                        disabled={!isBiddingActive || userTeam.currentCapital < auctionState.highestAmount + inc || isHighBidder || !currentPlayer}
                                        className={`py-2 rounded-lg font-semibold text-white transition duration-200 shadow-md ${
                                            isBiddingActive && userTeam.currentCapital >= auctionState.highestAmount + inc && !isHighBidder && currentPlayer
                                                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/50'
                                                : 'bg-gray-600 cursor-not-allowed'
                                        }`}
                                    >
                                        + {formatCurrency(inc)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex space-x-3">
                                <input 
                                    type="number"
                                    step="0.1"
                                    placeholder="Custom Bid (in Crores, e.g., 5.5)"
                                    value={customBidInput}
                                    onChange={(e) => setCustomBidInput(e.target.value)}
                                    onKeyDown={handleCustomBid}
                                    className="flex-1 p-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                                    disabled={!isBiddingActive || isHighBidder || !currentPlayer}
                                />
                                <button
                                    onClick={handleCustomBid} // Use handleCustomBid as click handler
                                    disabled={!isBiddingActive || !customBidInput || userTeam.currentCapital < parseInt(customBidInput * 10000000) || isHighBidder || !currentPlayer}
                                    className={`px-6 py-3 rounded-xl font-bold text-white transition duration-200 shadow-lg ${
                                        isBiddingActive && customBidInput && userTeam.currentCapital >= parseInt(customBidInput * 10000000) && !isHighBidder && currentPlayer
                                            ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/50'
                                            : 'bg-gray-600 cursor-not-allowed'
                                    }`}
                                >
                                    <TrendingUp className="w-5 h-5" />
                                </button>
                            </div>
                            {(!isBiddingActive || !currentPlayer) && (
                                <p className="text-center text-yellow-500 mt-4 font-medium">Bidding is {auctionState.status.replace('_', ' ').toLowerCase()}. Awaiting next player nomination.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-white flex items-center">
                            <Users2 className='w-5 h-5 mr-2 text-indigo-400' />
                            Your Roster ({userTeam.roster ? userTeam.roster.length : 0} Players)
                        </h3>
                        <div className="h-64 overflow-y-auto space-y-3">
                            {userTeam.roster && userTeam.roster.length > 0 ? (
                                userTeam.roster.map((player, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-700 rounded border border-indigo-400/20 hover:bg-gray-600/50 transition">
                                        <span className="font-semibold text-white">{player.name}</span>
                                        <span className="text-pink-400 font-black">{formatCurrency(player.soldPrice)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic p-3 text-center">No players signed yet. Start bidding!</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold text-gray-300">Team Finance</h2>
                    
                    <StatCard 
                        title="Remaining Purse" 
                        value={formatCurrency(userTeam.currentCapital)} 
                        icon={DollarSign} 
                        color="text-green-400" 
                    />
                    <StatCard 
                        title="Total Spent" 
                        value={formatCurrency(userTeam.total_spent)} 
                        icon={TrendingUp} 
                        color="text-red-400" 
                    />
                    <StatCard 
                        title="Max Budget" 
                        value={formatCurrency(userTeam.maxCapital)} 
                        icon={Gauge} 
                        color="text-yellow-400" 
                    />
                    <StatCard 
                        title="Players Signed" 
                        value={userTeam.roster ? userTeam.roster.length : 0} 
                        icon={Users} 
                        color="text-sky-400" 
                    />
                </div>
            </div>
        </div>
    );
};


// 5. ADMIN VIEW 
const AdminPage = ({ isAdmin, allTeams, players, auctionState, adminActions, playerImportActions, getTeamLogoUrl, setMode, setToast }) => {
    const [activeTab, setActiveTab] = useState('auction');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const currentTeams = useMemo(() => allTeams.reduce((acc, team) => ({ ...acc, [team.id]: team }), {}), [allTeams]);
    const currentPlayer = players.find(p => p.id === auctionState.currentPlayerId);
    const availablePlayers = players.filter(p => p.status === 'available');
    const teamCategories = [...new Set(players.map(p => p.category))];

    const filteredPlayers = players
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(p => !filterCategory || p.category === filterCategory);

    const { nominatePlayer, finalizeSale, markUnsold, resetAuction, startRandomPlayer } = adminActions;

    const highBidderTeam = allTeams.find(t => t.id === auctionState.highestTeamId);
    
    // UI Guard
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
                <div className="text-center p-8 bg-gray-800 rounded-xl shadow-neon-lg border border-red-500/50">
                    <p className="text-2xl font-bold text-red-400">ADMIN ACCESS DENIED</p>
                    <p className="text-gray-400 mt-2">Please return to the Home Page and enter the correct Admin Key.</p>
                    <button onClick={() => setMode(AUCTION_STATES.HOME)} className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center mx-auto">
                        <Home className="w-4 h-4 mr-2" /> Back to Home
                    </button>
                </div>
            </div>
        );
    }
    
    const TabButton = ({ name, label }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`px-4 py-2 font-semibold rounded-t-lg transition duration-200 ${
                activeTab === name ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
            <header className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl shadow-lg flex justify-between items-center mb-6 border-b-2 border-red-500">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-500 flex items-center">
                    <Hammer className="w-6 h-6 mr-2" />
                    APL Auctioneer Control ({auctionState.status.replace('_', ' ')})
                </h1>
                <button onClick={() => setMode(AUCTION_STATES.HOME)} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center">
                    <Home className="w-4 h-4 mr-2" /> Exit Admin
                </button>
            </header>

            {/* Admin Tabs */}
            <div className="flex space-x-2 mb-6">
                <TabButton name="auction" label="Auction Control" />
                <TabButton name="data" label="Data Management" />
                <TabButton name="rosters" label="Team Rosters" />
            </div>

            {activeTab === 'auction' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Core Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-800 p-6 rounded-xl shadow-neon-lg border border-red-500/50 space-y-4">
                            <h3 className="text-xl font-bold text-red-400">Live Auction State</h3>
                            <p className="text-lg font-semibold">Current Player: <span className="text-white">{currentPlayer?.name || 'N/A'}</span></p>
                            <p className="text-lg font-semibold">Highest Bid: <span className="text-sky-400">{formatCurrencyFull(auctionState.highestAmount)}</span></p>
                            <p className="text-lg font-semibold">Leading Team: <span className={`${highBidderTeam?.color || 'text-gray-400'}`}>{highBidderTeam?.name || 'N/A'}</span></p>
                            
                            {auctionState.status === AUCTION_STATES.BIDDING_ACTIVE && (
                                <p className="text-lg font-semibold text-yellow-400">
                                    Timer Ends: {auctionState.end_time ? new Date(auctionState.end_time.toDate()).toLocaleTimeString() : 'N/A'}
                                </p>
                            )}

                            <div className="pt-4 border-t border-gray-700 space-y-3">
                                {/* Finalize/Unsold Buttons */}
                                {(auctionState.status === AUCTION_STATES.BIDDING_ACTIVE || auctionState.status === AUCTION_STATES.PLAYER_SOLD) && (
                                    <>
                                        <button 
                                            onClick={finalizeSale}
                                            disabled={!auctionState.highestTeamId}
                                            className={`w-full py-3 rounded-lg font-bold text-white transition duration-200 shadow-md flex items-center justify-center ${
                                                auctionState.highestTeamId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <CheckCircle className="w-5 h-5 mr-2" /> FINAL HAMMER (SELL)
                                        </button>
                                        <button 
                                            onClick={markUnsold}
                                            disabled={!auctionState.currentPlayerId}
                                            className="w-full py-3 rounded-lg font-bold text-white bg-yellow-600 hover:bg-yellow-700 transition flex items-center justify-center"
                                        >
                                            <XCircle className="w-5 h-5 mr-2" /> MARK UNSOLD
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Nomination Controls */}
                        <div className="bg-gray-800 p-6 rounded-xl shadow-neon-lg border border-indigo-500/50 space-y-3">
                             <h3 className="text-xl font-bold text-indigo-400 mb-4">Player Nomination</h3>
                             
                             <button
                                onClick={startRandomPlayer}
                                disabled={auctionState.status === AUCTION_STATES.BIDDING_ACTIVE || availablePlayers.length === 0}
                                className="w-full py-3 rounded-lg font-bold text-white bg-pink-600 hover:bg-pink-700 transition flex items-center justify-center disabled:opacity-50"
                             >
                                <Rss className="w-5 h-5 mr-2" /> NOMINATE RANDOM PLAYER ({availablePlayers.length} left)
                             </button>

                             {availablePlayers.length === 0 && (
                                 <p className="text-center text-red-500">ALL PLAYERS AUCTIONED.</p>
                             )}

                             <div className="pt-3 border-t border-gray-700">
                                <h4 className='text-sm text-gray-400 mb-2'>Manual Nominate:</h4>
                                <ul className='h-40 overflow-y-auto space-y-2 pr-2'>
                                    {availablePlayers.slice(0, 5).map(player => (
                                        <li key={player.id} className='flex justify-between items-center bg-gray-700 p-2 rounded'>
                                            <span className='text-sm'>{player.name}</span>
                                            <button 
                                                onClick={() => nominatePlayer(player.id, player.name, player.basePrice)}
                                                className='text-xs bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded'
                                                disabled={auctionState.status === AUCTION_STATES.BIDDING_ACTIVE}
                                            >
                                                Nominate
                                            </button>
                                        </li>
                                    ))}
                                    {availablePlayers.length > 5 && <p className='text-xs text-gray-500'>...and {availablePlayers.length - 5} more.</p>}
                                </ul>
                             </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-xl shadow-neon-lg border border-red-500/50">
                            <h3 className="text-xl font-bold text-red-400 mb-4">DANGER ZONE</h3>
                            <button 
                                onClick={resetAuction}
                                className="w-full py-3 rounded-lg font-bold text-white bg-red-800 hover:bg-red-700 transition flex items-center justify-center"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2"/> RESET ENTIRE AUCTION
                            </button>
                        </div>
                    </div>

                    {/* Column 2 & 3: Player List / Filters */}
                    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-white">All Player List ({players.length} Total)</h3>
                        
                        <div className="flex space-x-4 mb-4">
                            <input 
                                type="text"
                                placeholder="Search Player Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="p-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Categories</option>
                                {teamCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <div className="h-[600px] overflow-y-auto space-y-3 pr-2">
                            {filteredPlayers.map(player => (
                                <PlayerListItem 
                                    key={player.id} 
                                    player={player} 
                                    currentTeam={currentTeams[player.team_assigned]}
                                    isCurrentAuction={player.id === auctionState.currentPlayerId}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'data' && <DataManagementPanel players={players} allTeams={allTeams} actions={playerImportActions} setToast={setToast} />}
            {activeTab === 'rosters' && <RosterManagementPanel allTeams={allTeams} players={players} getTeamLogoUrl={getTeamLogoUrl} />}

        </div>
    );
};

const PlayerListItem = ({ player, currentTeam, isCurrentAuction }) => {
    const statusColor = player.status === 'sold' ? 'text-green-500' : player.status === 'unsold' ? 'text-yellow-500' : 'text-indigo-400';
    const statusBg = player.status === 'sold' ? 'bg-green-900/30' : player.status === 'unsold' ? 'bg-yellow-900/30' : 'bg-indigo-900/30';
    
    return (
        <div className={`p-4 rounded-xl flex justify-between items-center border border-gray-700 transition ${statusBg} ${isCurrentAuction ? 'border-4 border-red-500 shadow-xl' : ''}`}>
            <div className="flex items-center space-x-4 w-1/3">
                <img 
                    src={player.photoUrl} 
                    alt={player.name} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-600"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/4f46e5/ffffff?text=P' }}
                />
                <div>
                    <p className="font-semibold text-white truncate">{player.name}</p>
                    <p className="text-xs text-gray-400">{player.category} - {player.points} pts</p>
                </div>
            </div>
            <div className="text-right w-2/3 flex justify-between items-center">
                <p className={`font-medium ${statusColor} text-sm uppercase`}>
                    {player.status}
                </p>
                {player.status === 'sold' && currentTeam ? (
                    <span className="text-sm font-light text-gray-300">
                        {currentTeam.name.split(' ')[0]} for {formatCurrency(player.total_spent)}
                    </span>
                ) : (
                    <span className="text-sm font-light text-gray-300">Base: {formatCurrency(player.basePrice)}</span>
                )}
                {/* Edit functionality (placeholder) */}
                <button className='text-gray-500 hover:text-indigo-400 transition'>
                    <Edit className='w-4 h-4' />
                </button>
            </div>
        </div>
    );
};

const DataManagementPanel = ({ players, allTeams, actions, setToast }) => {
    const [playersJson, setPlayersJson] = useState(JSON.stringify(INITIAL_PLAYERS, null, 2));
    const [teamsJson, setTeamsJson] = useState(JSON.stringify(INITIAL_TEAMS, null, 2));
    const [dataError, setDataError] = useState(null);
    const [activeInput, setActiveInput] = useState('players');
    
    // Use the stored JSON strings for editing, but initial load uses static data structure for reference
    const currentData = activeInput === 'players' ? playersJson : teamsJson;
    const setCurrentData = activeInput === 'players' ? setPlayersJson : setTeamsJson;
    const importAction = activeInput === 'players' ? actions.importPlayers : actions.importTeams;

    const handleImport = () => {
        try {
            const data = JSON.parse(currentData);
            importAction(data);
            setDataError(null);
        } catch (e) {
            setDataError(`JSON Parsing Error: ${e.message}`);
            setToast({ message: "JSON Data is invalid. Check console.", type: 'error' });
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center"><Upload className='w-5 h-5 mr-2 text-indigo-400' /> Player/Team Data Management (JSON Import)</h3>
            
            <div className="flex space-x-4 mb-4">
                <button 
                    onClick={() => setActiveInput('players')}
                    className={`px-4 py-2 rounded-lg font-semibold ${activeInput === 'players' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                    Players Data
                </button>
                <button 
                    onClick={() => setActiveInput('teams')}
                    className={`px-4 py-2 rounded-lg font-semibold ${activeInput === 'teams' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                    Teams Data
                </button>
            </div>

            <textarea
                value={currentData}
                onChange={(e) => setCurrentData(e.target.value)}
                className="w-full h-80 p-4 border border-gray-600 rounded-lg bg-gray-700 text-white font-mono text-sm resize-none focus:ring-indigo-500 focus:border-indigo-500"
                spellCheck="false"
            />
            
            {dataError && <p className="text-red-500 my-2 font-semibold">Error: {dataError}</p>}
            
            <button
                onClick={handleImport}
                className="w-full mt-4 py-3 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition flex items-center justify-center"
            >
                <Upload className="w-5 h-5 mr-2" /> Import/Overwrite {activeInput.toUpperCase()} Data
            </button>
            <p className='text-xs text-gray-500 mt-2'>*This action simulates Excel/CSV upload by parsing JSON, overwriting existing data. Team budget/roster will reset on team import.</p>
        </div>
    );
};

const RosterManagementPanel = ({ allTeams, players, getTeamLogoUrl }) => {
    const [selectedTeam, setSelectedTeam] = useState(allTeams[0]?.id || null);
    
    useEffect(() => {
        if (!selectedTeam && allTeams.length > 0) {
            setSelectedTeam(allTeams[0].id);
        }
    }, [allTeams, selectedTeam]);

    const currentTeamData = allTeams.find(t => t.id === selectedTeam);
    const teamPlayers = players.filter(p => p.team_assigned === selectedTeam);
    const categories = ['Batsman', 'Bowler', 'All-Rounder', 'Wk-Batsman'];

    if (allTeams.length === 0) return <p className="text-gray-400">No teams loaded.</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center"><List className='w-5 h-5 mr-2 text-indigo-400' /> Roster Overview & Analysis</h3>
            
            <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="mb-4 p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-1/3"
            >
                {allTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name} ({team.roster.length} P)</option>
                ))}
            </select>

            {currentTeamData && (
                <div className="bg-gray-700 p-6 rounded-xl space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <img src={getTeamLogoUrl(currentTeamData.id)} alt={currentTeamData.name} className="w-16 h-16 rounded-full border-4 border-indigo-400" />
                        <div>
                            <h4 className={`text-3xl font-black ${currentTeamData.color}`}>{currentTeamData.name}</h4>
                            <p className="text-md text-gray-400">Owner: {currentTeamData.ownerName || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Spent" value={formatCurrency(currentTeamData.total_spent)} icon={DollarSign} color="text-red-400" />
                        <StatCard title="Remaining" value={formatCurrency(currentTeamData.currentCapital)} icon={DollarSign} color="text-green-400" />
                        <StatCard title="Total Players" value={currentTeamData.roster.length} icon={Users} color="text-sky-400" />
                        <StatCard title="Avg Price" value={formatCurrency(currentTeamData.total_spent / Math.max(1, currentTeamData.roster.length))} icon={Gauge} color="text-yellow-400" />
                    </div>

                    <h5 className="text-lg font-bold mt-4 text-white border-b border-gray-600 pb-2">Roster Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {categories.map(category => (
                            <div key={category} className="p-3 bg-gray-800 rounded-lg border border-indigo-500/30">
                                <h6 className="font-bold text-indigo-400 mb-2">{category} ({teamPlayers.filter(p => p.category === category).length})</h6>
                                <ul className="space-y-1 text-sm text-gray-300">
                                    {teamPlayers.filter(p => p.category === category).map(player => (
                                        <li key={player.id} className="flex justify-between">
                                            <span>{player.name}</span>
                                            <span className='font-semibold text-pink-400'>{formatCurrency(player.total_spent)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
};


// --- MAIN APPLICATION COMPONENT ---
const App = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [mode, setMode] = useState(AUCTION_STATES.HOME); 
    
    // Core Real-time Data
    const [userTeam, setUserTeam] = useState(null);
    const [allTeams, setAllTeams] = useState([]);
    const [auctionState, setAuctionState] = useState(initialAuctionState);
    const [players, setPlayers] = useState([]);
    
    // UI State
    const [toast, setToast] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminKeyInput, setAdminKeyInput] = useState('');
    
    const isAuthenticated = isAuthReady && userId;
    const auctionStateRef = useRef(auctionState);
    auctionStateRef.current = auctionState;

    // --- Core Data Getters ---
    const currentPlayer = players.find(p => p.id === auctionState.currentPlayerId);
    const currentBidderTeam = allTeams.find(t => t.id === auctionState.highestTeamId);
    const getTeamLogoUrl = (teamId) => allTeams.find(t => t.id === teamId)?.logoUrl || 'https://placehold.co/40x40/555/fff?text=T';

    // --- Authentication & Initialization ---
    useEffect(() => {
        const initFirebase = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error("Firebase Auth Error:", e);
                setToast({ message: "Authentication failed.", type: 'error' });
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                await initializeDatabase(db); 
            } else {
                setUserId(crypto.randomUUID());
            }
            setIsAuthReady(true);
        });

        initFirebase();
        return () => unsubscribe();
    }, []);

    // --- Real-time Data Listeners ---
    useEffect(() => {
        if (!isAuthReady) return;

        // Listener 1: All Teams (Public Data)
        const teamQuery = query(collection(db, TEAMS_COLLECTION));
        const unsubscribeTeams = onSnapshot(teamQuery, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTeams(teamsData);
            
            const myTeam = teamsData.find(t => t.ownerId === userId);
            setUserTeam(myTeam);
            
            // Auto-redirect claimed users to their dashboard after initialization
            if (myTeam && (mode === AUCTION_STATES.TEAM_CLAIM || mode === AUCTION_STATES.HOME)) {
                 setMode(AUCTION_STATES.OWNER);
            }

        }, (e) => console.error("Error fetching teams:", e));
        
        // Listener 2: Auction State (Real-time Bidding Core)
        const unsubscribeAuction = onSnapshot(doc(db, AUCTION_STATE_DOC), (docSnap) => {
            if (docSnap.exists()) {
                const newState = docSnap.data();
                
                // Real-time Bidding Feedback (only play sound if bid actually increased)
                if (auctionStateRef.current.highestAmount > 0 && newState.highestAmount > auctionStateRef.current.highestAmount) {
                    playSound('bid');
                }
                
                // Sold animation trigger
                if (newState.status === AUCTION_STATES.PLAYER_SOLD && auctionStateRef.current.status !== AUCTION_STATES.PLAYER_SOLD) {
                    playSound('sold');
                    setToast({ message: `SOLD! ${allTeams.find(t => t.id === newState.lastSoldTeam)?.name.split(' ')[0]} wins!`, type: 'success' });
                }
                
                setAuctionState(newState);
            }
        }, (e) => console.error("Error fetching auction state:", e));

        // Listener 3: Players (Auction Inventory)
        const playersQuery = query(collection(db, PLAYERS_COLLECTION));
        const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
            const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlayers(playersData.sort((a, b) => b.points - a.points));
        }, (e) => console.error("Error fetching players:", e));


        return () => {
            unsubscribeTeams();
            unsubscribeAuction();
            unsubscribePlayers();
        };
    }, [isAuthReady, userId, allTeams.length]); 

    // --- Timer Expiry Logic (Handles Hammer Fall) ---
    const handleTimeout = useCallback(async () => {
        const state = auctionStateRef.current;
        if (state.status === AUCTION_STATES.BIDDING_ACTIVE) {
            console.log("Auction timer expired. Moving to pending sale status.");
            // Admin must finalize the sale manually by hitting the hammer
            await updateDoc(doc(db, AUCTION_STATE_DOC), {
                status: AUCTION_STATES.PLAYER_SOLD // Change state to signal time is up (but not yet finalized)
            });
            setToast({ message: "Time Up! Admin must announce SOLD or UNSOLD.", type: 'info' });
        }
    }, []);


    // --- ACTIONS (TEAM OWNER) ---
    const teamClaimAction = useCallback(async (teamId, teamName) => {
        if (!userId) { setToast({ message: "Authentication not ready.", type: 'error' }); return; }
        const teamRef = doc(db, TEAMS_COLLECTION, teamId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const teamSnap = await transaction.get(teamRef);
                const teamData = teamSnap.data();

                if (teamData.ownerId !== null) {
                    throw new Error("This team is already claimed.");
                }
                
                const alreadyClaimed = allTeams.some(t => t.ownerId === userId);
                if (alreadyClaimed) {
                     throw new Error("You have already claimed a team.");
                }

                const ownerDisplayName = `Owner-${userId.substring(0, 4)} (APL)`;

                // Update team to assign ownerId, reset capital, and initial roster structure
                transaction.update(teamRef, { 
                    ownerId: userId, 
                    currentCapital: INITIAL_CAPITAL, 
                    total_spent: 0,
                    players_count: 0,
                    roster: [],
                    ownerName: ownerDisplayName 
                });
            });
            setToast({ message: `Successfully claimed team: ${teamName}!`, type: 'success' });
            setMode(AUCTION_STATES.OWNER); // Navigate to owner dashboard
        } catch (e) {
            console.error("Error claiming team:", e);
            setToast({ message: `Claim failed: ${e.message}`, type: 'error' });
        }
    }, [userId, allTeams]);


    const placeBid = useCallback(async (bidAmount) => {
        const state = auctionStateRef.current;
        if (!userTeam || !state || state.status !== AUCTION_STATES.BIDDING_ACTIVE) {
            setToast({ message: "Bidding is closed or you are not a team owner.", type: 'error' });
            return;
        }
        
        const nextBidIncrement = getNextBidIncrement(state.highestAmount);
        const minBid = state.highestAmount === 0 ? (currentPlayer?.basePrice || 0) : state.highestAmount + nextBidIncrement;

        if (bidAmount < minBid) {
            setToast({ message: `Bid must be at least ${formatCurrencyFull(minBid)}`, type: 'error' });
            return;
        }
        
        if (bidAmount > userTeam.currentCapital) {
            setToast({ message: "Insufficient funds. Bid failed.", type: 'error' });
            return;
        }

        if (userTeam.id === state.highestTeamId) {
            setToast({ message: "You are already the highest bidder.", type: 'info' });
            return;
        }
        
        try {
            const auctionRef = doc(db, AUCTION_STATE_DOC);
            
            let newEndTime = state.end_time;
            
            if (newEndTime && newEndTime.toDate) {
                newEndTime = newEndTime.toDate().getTime();
            } else if (typeof newEndTime === 'string') {
                newEndTime = new Date(newEndTime).getTime();
            }

            const now = Date.now();
            const timeRemaining = newEndTime - now;
            
            let extensionUsed = 0;
            let finalEndTime = new Date(newEndTime);

            // Anti-Snipe Logic
            if (timeRemaining < ANTI_SNIPE_WINDOW * 1000) {
                const extendedTime = now + ANTI_SNIPE_EXTENSION * 1000;
                finalEndTime = new Date(extendedTime);
                extensionUsed = 1;
                setToast({ message: "Anti-Snipe activated! Auction extended.", type: 'info' });
            }

            // Perform atomic update for bid and timer
            await updateDoc(auctionRef, {
                highestAmount: bidAmount,
                highestTeamId: userTeam.id,
                end_time: finalEndTime,
                extensions_used: state.extensions_used + extensionUsed
            });
            playSound('bid');
            console.log(`${userTeam.name} bid ${formatCurrencyFull(bidAmount)}`);
        } catch (e) {
            console.error("Error placing bid:", e);
            setToast({ message: "Failed to place bid due to a database error.", type: 'error' });
        }
    }, [userTeam, currentPlayer]);


    // --- ACTIONS (ADMIN) ---

    const nominatePlayer = useCallback(async (playerId, playerName, basePrice) => {
        try {
            const auctionRef = doc(db, AUCTION_STATE_DOC);
            const endTime = new Date(Date.now() + AUCTION_DURATION_SECONDS * 1000);

            await updateDoc(auctionRef, {
                status: AUCTION_STATES.BIDDING_ACTIVE,
                currentPlayerId: playerId,
                highestAmount: basePrice,
                highestTeamId: null,
                auction_open: true,
                end_time: endTime,
                extensions_used: 0,
                lastSoldPlayer: null, // Clear last sold data
                lastSoldPrice: 0,
                lastSoldTeam: null,
            });
            setToast({ message: `Player ${playerName} nominated! Bid starts at ${formatCurrency(basePrice)}.`, type: 'info' });
        } catch (e) {
            console.error("Error nominating player:", e);
            setToast({ message: "Admin Error: Could not nominate player.", type: 'error' });
        }
    }, []);

    const finalizeSale = useCallback(async () => {
        const state = auctionStateRef.current;
        if (state.status !== AUCTION_STATES.BIDDING_ACTIVE && state.status !== AUCTION_STATES.PLAYER_SOLD) {
            setToast({ message: "Cannot finalize sale: Bidding is not active/resolved.", type: 'error' });
            return;
        }
        if (!state.highestTeamId) {
            setToast({ message: "Cannot finalize sale: No valid bid placed.", type: 'error' });
            return;
        }

        const { currentPlayerId, highestAmount, highestTeamId } = state;
        const playerRef = doc(db, PLAYERS_COLLECTION, currentPlayerId);
        const teamRef = doc(db, TEAMS_COLLECTION, highestTeamId);
        const auctionRef = doc(db, AUCTION_STATE_DOC);

        try {
            await runTransaction(db, async (transaction) => {
                const teamDoc = await transaction.get(teamRef);
                const playerDoc = await transaction.get(playerRef);
                const teamData = teamDoc.data();
                
                if (teamData.currentCapital < highestAmount) {
                    throw new Error("Winning team cannot afford this player. Budget violation.");
                }

                const newCapital = teamData.currentCapital - highestAmount;
                const newTotalSpent = teamData.total_spent + highestAmount;
                const newRoster = [...(teamData.roster || []), { 
                    id: currentPlayerId, 
                    name: playerDoc.data().name, 
                    soldPrice: highestAmount,
                    category: playerDoc.data().category,
                }];

                // 1. Update Team 
                transaction.update(teamRef, { 
                    currentCapital: newCapital, 
                    total_spent: newTotalSpent,
                    players_count: newRoster.length,
                    roster: newRoster 
                });

                // 2. Update Player 
                transaction.update(playerRef, {
                    status: 'sold',
                    team_assigned: highestTeamId,
                    total_spent: highestAmount,
                });

                // 3. Update Auction State 
                transaction.update(auctionRef, {
                    status: AUCTION_STATES.PLAYER_SOLD,
                    lastSoldPlayer: currentPlayerId,
                    lastSoldPrice: highestAmount,
                    lastSoldTeam: highestTeamId,
                    auction_open: false,
                    end_time: null,
                    // Clear current player fields 
                    currentPlayerId: null,
                    highestAmount: 0,
                    highestTeamId: null,
                });
            });

            console.log(`Player ${currentPlayerId} sold to ${highestTeamId} for ${formatCurrencyFull(highestAmount)}`);
            setToast({ message: "Hammer Fall! Player SOLD!", type: 'success' });
            playSound('sold');

        } catch (e) {
            console.error("Transaction failed:", e);
            setToast({ message: `Sale failed: ${e.message}`, type: 'error' });
        }
    }, [auctionState]);

    const markUnsold = useCallback(async () => {
        const state = auctionStateRef.current;
        
        const auctionRef = doc(db, AUCTION_STATE_DOC);
        const playerRef = doc(db, PLAYERS_COLLECTION, state.currentPlayerId);

        try {
            const batch = writeBatch(db);
            
            // 1. Mark player as unsold
            batch.update(playerRef, { status: 'unsold' });

            // 2. Reset auction state
            batch.update(auctionRef, {
                status: AUCTION_STATES.PLAYER_UNSOLD,
                lastSoldPlayer: state.currentPlayerId,
                lastSoldPrice: state.highestAmount, 
                lastSoldTeam: null,
                auction_open: false,
                currentPlayerId: null,
                highestAmount: 0,
                highestTeamId: null,
                end_time: null,
            });

            await batch.commit();
            setToast({ message: "Player marked UNSOLD.", type: 'info' });
        } catch (e) {
            console.error("Error marking unsold:", e);
            setToast({ message: `Unsold marking failed: ${e.message}`, type: 'error' });
        }
    }, [auctionState]);

    const resetAuction = async () => {
        if (!window.confirm("ARE YOU SURE? This will reset ALL auction data (capital, rosters, player status, and state).")) return;

        const batch = writeBatch(db);
        
        // 1. Reset Teams
        const teamsRef = collection(db, TEAMS_COLLECTION);
        const teamDocs = await getDocs(teamsRef);
        teamDocs.docs.forEach(docSnap => {
            const originalTeam = INITIAL_TEAMS.find(t => t.id === docSnap.id);
            batch.update(docSnap.ref, { 
                currentCapital: originalTeam ? originalTeam.maxCapital : INITIAL_CAPITAL, 
                total_spent: 0,
                players_count: 0,
                roster: [],
                ownerId: null, // Unclaim all teams
            });
        });

        // 2. Reset Players
        const playersRef = collection(db, PLAYERS_COLLECTION);
        const playerDocs = await getDocs(playersRef);
        playerDocs.docs.forEach(docSnap => {
            batch.update(docSnap.ref, {
                status: 'available',
                team_assigned: null,
                total_spent: 0
            });
        });

        // 3. Reset Auction State
        const auctionRef = doc(db, AUCTION_STATE_DOC);
        batch.set(auctionRef, initialAuctionState);

        try {
            await batch.commit();
            setToast({ message: "Auction system fully reset! Users must reclaim teams.", type: 'success' });
            setMode(AUCTION_STATES.HOME);
        } catch (e) {
            console.error("Reset failed:", e);
            setToast({ message: "Failed to reset auction data.", type: 'error' });
        }
    };
    
    // Auto-Balanced Random Player Selection
    const startRandomPlayer = useCallback(() => {
        const available = players.filter(p => p.status === 'available');
        if (available.length === 0) {
            setToast({ message: "All players have been auctioned!", type: 'error' });
            return;
        }

        // 1. Find category distribution of unpicked players
        const categoryCounts = available.reduce((acc, player) => {
            acc[player.category] = (acc[player.category] || 0) + 1;
            return acc;
        }, {});
        
        // 2. Identify the categories with the fewest available players (prioritize balance)
        const minCount = Math.min(...Object.values(categoryCounts));
        const balancedCategories = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] === minCount);

        // 3. Select a player randomly from the most 'needed' category
        const targetPlayers = available.filter(p => balancedCategories.includes(p.category));
        const selectedPlayer = targetPlayers[Math.floor(Math.random() * targetPlayers.length)];

        if (selectedPlayer) {
            nominatePlayer(selectedPlayer.id, selectedPlayer.name, selectedPlayer.basePrice);
        } else {
             setToast({ message: "Error in random selection logic. Fallback to manual selection.", type: 'error' });
        }
    }, [players, nominatePlayer]);


    // --- ACTIONS (DATA MANAGEMENT) ---
    const importPlayers = async (newPlayersData) => {
        const batch = writeBatch(db);
        const playersRef = collection(db, PLAYERS_COLLECTION);
        
        const existingDocs = await getDocs(playersRef);
        existingDocs.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });

        newPlayersData.forEach((playerData, index) => {
            const playerId = playerData.id || `p${Date.now()}_${index}`;
            const playerDocRef = doc(playersRef, playerId);
            batch.set(playerDocRef, { 
                id: playerId,
                name: playerData.name || 'New Player',
                category: playerData.category || 'Uncategorized',
                basePrice: playerData.basePrice || 1000000,
                points: playerData.points || 50,
                photoUrl: playerData.photoUrl || 'https://placehold.co/80x80/22d3ee/ffffff?text=P',
                status: 'available',
                team_assigned: null,
                total_spent: 0
            });
        });

        try {
            await batch.commit();
            setToast({ message: `${newPlayersData.length} players imported successfully!`, type: 'success' });
        } catch (e) {
            console.error("Player import failed:", e);
            setToast({ message: "Player import failed. Check JSON structure.", type: 'error' });
        }
    };
    
    const importTeams = async (newTeamsData) => {
        const batch = writeBatch(db);
        const teamsRef = collection(db, TEAMS_COLLECTION);
        
        const existingDocs = await getDocs(teamsRef);
        existingDocs.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });

        newTeamsData.forEach(teamData => {
            const teamId = teamData.id || `t${Date.now()}`;
            const teamDocRef = doc(teamsRef, teamId);
            batch.set(teamDocRef, { 
                id: teamId,
                name: teamData.name || 'New Team',
                maxCapital: teamData.maxCapital || INITIAL_CAPITAL,
                ownerName: teamData.ownerName || 'TBD',
                color: teamData.color || 'text-gray-400',
                logoUrl: teamData.logoUrl || 'https://placehold.co/60x60/555/fff?text=T',
                ownerId: null,
                currentCapital: teamData.maxCapital || INITIAL_CAPITAL, 
                players_count: 0, 
                total_spent: 0,
                roster: []
            });
        });

        try {
            await batch.commit();
            setToast({ message: `${newTeamsData.length} teams imported successfully! All budgets and rosters reset.`, type: 'success' });
        } catch (e) {
            console.error("Team import failed:", e);
            setToast({ message: "Team import failed. Check JSON structure.", type: 'error' });
        }
    };


    // --- UI Mode Check ---
    
    // Admin Key Handler
    const handleAdminKeySubmit = (e) => {
        e.preventDefault();
        if (adminKeyInput === ADMIN_KEY) {
            setIsAdmin(true);
            setMode(AUCTION_STATES.ADMIN);
            setToast({ message: "Admin access granted!", type: 'success' });
            setAdminKeyInput('');
        } else {
            setToast({ message: "Invalid Admin Key.", type: 'error' });
        }
    };
    
    // Fallback loading screen
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="text-center p-8 bg-gray-800 rounded-xl shadow-xl">
                    <RefreshCcw className="w-8 h-8 mx-auto animate-spin text-indigo-400 mb-3" />
                    <p className="text-lg font-semibold text-gray-300">Establishing real-time connection...</p>
                </div>
            </div>
        );
    }
    
    let currentView;
    switch (mode) {
        case AUCTION_STATES.ADMIN_LOGIN:
            currentView = (
                <AdminLogin
                    setMode={setMode}
                    handleAdminKeySubmit={handleAdminKeySubmit}
                    adminKeyInput={adminKeyInput}
                    setAdminKeyInput={setAdminKeyInput}
                />
            );
            break;
        case AUCTION_STATES.ADMIN:
            currentView = (
                <AdminPage 
                    isAdmin={isAdmin}
                    allTeams={allTeams}
                    players={players}
                    auctionState={auctionState}
                    getTeamLogoUrl={getTeamLogoUrl}
                    setMode={setMode}
                    setToast={setToast}
                    adminActions={{ nominatePlayer, finalizeSale, markUnsold, resetAuction, startRandomPlayer }}
                    playerImportActions={{ importPlayers, importTeams }}
                />
            );
            break;

        case AUCTION_STATES.PROJECTOR:
            currentView = (
                <ProjectorView 
                    setMode={setMode}
                    auctionState={auctionState} 
                    currentPlayer={currentPlayer} 
                    currentBidderTeam={currentBidderTeam} 
                    getTeamLogoUrl={getTeamLogoUrl}
                    allTeams={allTeams}
                    players={players}
                />
            );
            break;
            
        case AUCTION_STATES.OWNER:
            if (!userTeam) {
                setMode(AUCTION_STATES.TEAM_CLAIM);
                return null;
            }
            currentView = (
                <OwnerDashboard 
                    setMode={setMode}
                    userTeam={userTeam} 
                    auctionState={auctionState} 
                    currentPlayer={currentPlayer} 
                    currentBidderTeam={currentBidderTeam} 
                    placeBid={placeBid}
                    players={players}
                    getTeamLogoUrl={getTeamLogoUrl}
                    setToast={setToast}
                />
            );
            break;
            
        case AUCTION_STATES.TEAM_CLAIM:
            currentView = (
                <div className="min-h-screen bg-gray-900 p-4 md:p-8 text-white">
                    <h1 className="text-3xl font-extrabold text-indigo-400 mb-6 flex items-center">
                        <LogIn className="w-8 h-8 mr-2 text-pink-400"/>
                        Claim Your Aqua Premier League Team
                    </h1>
                    <p className="text-lg text-gray-400 mb-8">
                        Your unique User ID: <span className="font-mono text-sm bg-gray-800 p-1 rounded font-bold">{userId}</span>. 
                        Claim one team to become the official owner.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {allTeams.map(team => (
                            <div 
                                key={team.id} 
                                className={`p-6 rounded-xl shadow-lg transition-all border-2 ${
                                    team.ownerId 
                                        ? 'bg-gray-800 text-gray-500 border-gray-700' 
                                        : 'bg-gray-700 hover:shadow-neon-sm border-green-500/50'
                                }`}
                            >
                                <div className='flex items-center space-x-3 mb-3'>
                                    <img src={getTeamLogoUrl(team.id)} alt={team.name} className='w-10 h-10 rounded-full'/>
                                    <h2 className="text-xl font-bold">{team.name.split(' ')[0]}</h2>
                                </div>
                                <p className="text-sm text-gray-400">Budget: {formatCurrency(team.maxCapital)}</p>
                                
                                {team.ownerId ? (
                                    <>
                                        <p className="mt-4 text-red-400 font-semibold">CLAIMED</p>
                                        <p className="text-xs truncate">Owner: {team.ownerName}</p>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => teamClaimAction(team.id, team.name)} 
                                        className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition duration-150"
                                    >
                                        Claim This Team
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setMode(AUCTION_STATES.HOME)} className="mt-8 text-indigo-400 hover:text-indigo-300 transition flex items-center">
                        <ArrowRight className='w-4 h-4 mr-2 rotate-180'/> Back to Home
                    </button>
                </div>
            );
            break;

        case AUCTION_STATES.HOME:
        default:
            currentView = (
                <HomePage 
                    setMode={setMode}
                    allTeams={allTeams.filter(t => t.ownerId)}
                    userId={userId}
                />
            );
            break;
    }


    return (
        <>
            {currentView}
            {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

export default App;