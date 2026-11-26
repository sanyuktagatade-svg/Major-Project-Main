

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    let socket;
    let map;
    let markers = [];

    // AUTHENTICATION
    function showDashboard() {
        $("authPage").hidden = true;
        $("dashboard").hidden = false;
        connectSocket();
        loadAgents();
    }

    async function checkLogin() {
        try {
            const response = await fetch("/api/me");
            const data = await response.json();

            if (response.ok && data.user) {
                showDashboard();
            }
        } catch (error) {
            console.error("Login check:", error);
        }
    }

    $("showRegister").onclick = event => {
        event.preventDefault();
        $("loginBox").hidden = true;
        $("registerBox").hidden = false;
        $("authMessage").textContent = "";
    };

    $("showLogin").onclick = event => {
        event.preventDefault();
        $("registerBox").hidden = true;
        $("loginBox").hidden = false;
        $("authMessage").textContent = "";
    };

    $("loginBtn").onclick = async () => {
        const email = $("loginEmail").value.trim();
        const password = $("loginPassword").value;

        if (!email || !password) {
            $("authMessage").textContent = "Enter email and password.";
            return;
        }

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                $("authMessage").textContent = "Login successful!";
                showDashboard();
            } else {
                $("authMessage").textContent =
                    data.message || "Login failed.";
            }
        } catch (error) {
            $("authMessage").textContent = "Server connection failed.";
        }
    };

    $("registerBtn").onclick = async () => {
        const name = $("registerName").value.trim();
        const email = $("registerEmail").value.trim();
        const password = $("registerPassword").value;

        if (!name || !email || !password) {
            $("authMessage").textContent = "Fill all fields.";
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                $("authMessage").textContent =
                    "Registration successful! Please login.";
                $("registerBox").hidden = true;
                $("loginBox").hidden = false;
            } else {
                $("authMessage").textContent =
                    data.message || "Registration failed.";
            }
        } catch (error) {
            $("authMessage").textContent = "Server connection failed.";
        }
    };

    $("logoutBtn").onclick = async () => {
        await fetch("/api/logout", { method: "POST" });
        location.reload();
    };

    // NAVIGATION
    document.querySelectorAll("nav button").forEach(button => {
        button.onclick = () => {
            document.querySelectorAll(".page").forEach(page => {
                page.hidden = true;
            });

            $(button.dataset.page).hidden = false;

            if (button.dataset.page === "mapPage" && map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
        };
    });

    // MAP
    function initializeMap() {
        if (!window.L || map) return;

        map = L.map("map").setView([15.3173, 75.7139], 7);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(map);
    }

    function displayAgents(data) {
        if (!Array.isArray(data)) return;

        const container = $("agents");
        container.replaceChildren();

        markers.forEach(marker => {
            if (map) map.removeLayer(marker);
        });
        markers = [];

        data.forEach(agent => {
            const item = document.createElement("p");
            item.textContent = `${agent.name} - ${agent.status}`;
            container.appendChild(item);

            const lat = Number(agent.latitude);
            const lng = Number(agent.longitude);

            if (map && Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                lat >= -90 && lat <= 90 &&
                lng >= -180 && lng <= 180) {

                const marker = L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(`${agent.name} - ${agent.status}`);

                markers.push(marker);
            }
        });
    }

    // LOAD AGENTS
    async function loadAgents() {
        try {
            const response = await fetch("/api/agents");

            if (!response.ok) return;

            const data = await response.json();

            displayAgents(Array.isArray(data) ? data : data.agents || []);
        } catch (error) {
            console.error("Agent loading failed:", error);
        }
    }

    // SOCKET CONNECTION
    function connectSocket() {
        if (socket || !window.io) return;

        socket = io();

        socket.on("connect", () => {
            console.log("AURORA connected");
        });

        socket.on("agentsUpdate", data => {
            displayAgents(data);
        });

        socket.on("connect_error", error => {
            console.error("Socket error:", error.message);
        });
    }

    // RUN SIMULATION
    $("runSimulation").onclick = async () => {
        try {
            const response = await fetch("/api/simulation/run", {
                method: "POST"
            });

            const data = await response.json();

            $("simulationStatus").textContent =
                data.message || (response.ok ? "Simulation running" : "Run failed");

            await loadAgents();
        } catch (error) {
            $("simulationStatus").textContent = "Server connection failed.";
        }
    };

    // RESET SIMULATION
    $("resetSimulation").onclick = async () => {
        try {
            const response = await fetch("/api/simulation/reset", {
                method: "POST"
            });

            const data = await response.json();

            $("simulationStatus").textContent =
                data.message || (response.ok ? "Simulation reset" : "Reset failed");

            await loadAgents();
        } catch (error) {
            $("simulationStatus").textContent = "Server connection failed.";
        }
    };

    // START
    initializeMap();
    checkLogin();
});