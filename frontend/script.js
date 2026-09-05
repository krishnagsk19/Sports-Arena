const API_BASE = "/api/compare";
let currentSport = "football";
let currentRole = "attackers";
let fullPlayerList = [];

// Define the available roles for each sport
const roleConfigs = {
    football: ["Attackers", "Midfielders", "Defenders", "Goalkeepers"],
    cricket: ["Batsmans", "Bowlers", "Fielders", "Wicketkeepers"],
    tennis: ["Singles"],
    f1: ["Drivers"]
};

document.addEventListener("DOMContentLoaded", () => {
    buildRoleNav();
    loadSportData(currentSport, currentRole);
});

function changeSport(sport) {
    currentSport = sport;
    currentRole = roleConfigs[sport][0].toLowerCase();
    
    // Update active state on main nav
    document.querySelectorAll(".sport-nav .nav-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`btn-${sport}`).classList.add("active");
    
    buildRoleNav();
    loadSportData(currentSport, currentRole);
}

function buildRoleNav() {
    const roleNav = document.getElementById("role-nav");
    roleNav.innerHTML = "";
    
    // Hide the role nav bar if the sport only has one category (e.g., Tennis, F1)
    if (roleConfigs[currentSport].length === 1) {
        roleNav.style.display = "none";
    } else {
        roleNav.style.display = "block";
    }
    
    roleConfigs[currentSport].forEach(role => {
        const roleId = role.toLowerCase();
        const btn = document.createElement("button");
        btn.className = `nav-btn ${roleId === currentRole ? "active" : ""}`;
        btn.innerText = role;
        btn.onclick = () => {
            currentRole = roleId;
            document.querySelectorAll("#role-nav .nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadSportData(currentSport, currentRole);
        };
        roleNav.appendChild(btn);
    });
}

async function loadSportData(sport, role) {
    document.body.className = `bg-${sport}`;
    
    // Dynamically update background animations based on the sport
    const animLayer = document.querySelector(".animation-layer");
    animLayer.innerHTML = ""; // Clear old elements
    
    let elementClass = "element-1";
    let count = 3;
    
    if (sport === "football") elementClass = "football-ball";
    else if (sport === "cricket") elementClass = "cricket-ball";
    else if (sport === "tennis") elementClass = "tennis-ball";
    else if (sport === "f1") {
        elementClass = "f1-streak";
        count = 6; // More streaks for F1 racing effect
    }

    for (let i = 0; i < count; i++) {
        const div = document.createElement("div");
        div.className = `anim-element ${elementClass}`;
        
        // Randomize initial positions
        div.style.top = `${Math.random() * 80}%`;
        div.style.left = `${Math.random() * 80}%`;
        div.style.animationDuration = `${6 + Math.random() * 8}s`;
        div.style.animationDelay = `${Math.random() * 3}s`;
        
        animLayer.appendChild(div);
    }

    try {
        const res = await fetch(`${API_BASE}/${sport}/${role}`);
        if (!res.ok) throw new Error("Data not found");
        const data = await res.json();
        fullPlayerList = data.players;

        document.getElementById("comparison-screen").classList.add("hidden");
        document.getElementById("selection-screen").classList.remove("hidden");
        document.getElementById("error-message").style.display = "none";
        
        renderCheckboxes();
    } catch (err) {
        console.error(`Error loading data:`, err);
        document.getElementById("player-checkbox-grid").innerHTML = `<p style="color:#ff5252;">Data file missing: ${sport}_${role}.json</p>`;
        fullPlayerList = [];
    }
}

function renderCheckboxes() {
    const grid = document.getElementById("player-checkbox-grid");
    grid.innerHTML = "";
    
    fullPlayerList.forEach(player => {
        const label = document.createElement("label");
        label.className = "player-checkbox";
        label.innerHTML = `
            <input type="checkbox" value="${player.id}" onchange="handleSelectionLimit()">
            <span>${player.name}</span>
        `;
        grid.appendChild(label);
    });
}

function handleSelectionLimit() {
    const checkboxes = document.querySelectorAll('#player-checkbox-grid input[type="checkbox"]');
    const checked = document.querySelectorAll('#player-checkbox-grid input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
        if (!cb.checked) cb.disabled = checked.length >= 4;
    });
}

async function startComparison() {
    const checked = Array.from(document.querySelectorAll('#player-checkbox-grid input[type="checkbox"]:checked'));
    const errorMsg = document.getElementById("error-message");
    
    if (checked.length < 2 || checked.length > 4) {
        errorMsg.style.display = "block";
        return;
    }
    errorMsg.style.display = "none";

    const ids = checked.map(cb => cb.value).join(",");
    try {
        const res = await fetch(`${API_BASE}/${currentSport}/${currentRole}?players=${ids}`);
        const data = await res.json();

        document.getElementById("selection-screen").classList.add("hidden");
        document.getElementById("comparison-screen").classList.remove("hidden");
        
        renderComparison(data);
    } catch (err) {
        console.error("Comparison error:", err);
    }
}

function renderComparison(data) {
    const container = document.getElementById("player-cards-container");
    container.innerHTML = "";
    const chartTraces = [];

    // Find the maximum value for each metric to scale from 0 to 100
    const maxMetrics = {};
    data.metrics.forEach(metric => {
        maxMetrics[metric] = Math.max(...data.players.map(p => p.stats[metric]));
    });

    data.players.forEach(player => {
        // Build Stat Cards
        const card = document.createElement("div");
        card.className = "player-card";
        card.style.borderTop = `4px solid ${player.color}`;
        
        let statsHtml = `<h3>${player.name}</h3>`;
        for (const [key, value] of Object.entries(player.stats)) {
            statsHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        card.innerHTML = statsHtml;
        container.appendChild(card);

        // Normalize data for the chart (0 to 100 scale)
        const normalizedStats = data.metrics.map(metric => {
            return (player.stats[metric] / maxMetrics[metric]) * 100;
        });

        // The actual text shown on hover
        const hoverText = data.metrics.map(metric => {
            return `${metric}: ${player.stats[metric]}`;
        });

        // Build Plotly Trace
        chartTraces.push({
            type: "scatterpolar",
            r: normalizedStats,
            theta: data.metrics,
            fill: "toself",
            name: player.name,
            line: { color: player.color },
            opacity: 0.6,
            text: hoverText,
            hoverinfo: "text+name"
        });
    });

    const layout = {
        polar: { 
            radialaxis: { visible: false, range: [0, 100] }, 
            angularaxis: { color: "#ffffff" } 
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#ffffff", size: 14 },
        showlegend: true,
        legend: { orientation: "h", y: -0.15 }
    };

    Plotly.newPlot("stats-chart", chartTraces, layout, { responsive: true });
}

function resetSelection() {
    document.getElementById("comparison-screen").classList.add("hidden");
    document.getElementById("selection-screen").classList.remove("hidden");
    Plotly.purge("stats-chart");
}