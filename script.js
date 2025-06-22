// script.js
// Firebase functions (initFirebase, saveAttendanceData, loadAttendanceData)
// are now expected to be available globally on the 'window' object,
// defined in firebase.js after Firebase SDKs are loaded via CDN.

const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
let inactivityTimer;

/**
 * Checks for inactivity and logs out if necessary.
 */
function checkInactivity() {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
        const elapsedTime = Date.now() - parseInt(lastActivity, 10);
        if (elapsedTime > INACTIVITY_TIMEOUT) {
            console.log("Inactivity detected. Logging out user.");
            logoutUser();
        }
    }
    resetInactivityTimer(); // Always reset to keep checking
}

/**
 * Resets the inactivity timer and updates last activity timestamp.
 */
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    localStorage.setItem('lastActivity', Date.now());
    inactivityTimer = setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
}

/**
 * Logs out the user and redirects to the login page.
 */
async function logoutUser() {
    try {
        if (window.auth) {
            await window.auth.signOut();
        }
        localStorage.removeItem('lastActivity'); // Clear activity stamp on logout
        window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
        console.error("Error logging out:", error);
        window.alertMessage("שגיאה בהתנתקות: " + error.message);
    }
}

/**
 * Formats a Date object into a DD/MM/YYYY string.
 * @param {Date} date The date object to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Calculates the start and end dates for the current week (Saturday to Saturday).
 * @returns {{startDate: Date, endDate: Date, startDateFormatted: string, endDateFormatted: string}}
 */
export function getCurrentWeekDates() {
    const today = new Date();
    let dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

    // Calculate the date of the most recent Saturday (or today if it's Saturday)
    // If today is Saturday (6), daysToSubtract is 0. Otherwise, it's (dayOfWeek + 1)
    // to go back to the previous Saturday.
    const daysToSubtract = (dayOfWeek === 6) ? 0 : (dayOfWeek + 1);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0); // Set to start of the day

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // End date is 7 days after the start date to include both Saturdays
    endDate.setHours(23, 59, 59, 999); // Set to end of the day

    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);

    return { startDate, endDate, startDateFormatted, endDateFormatted };
}

// Expose getCurrentWeekDates to the global scope for firebase.js to use
window.getCurrentWeekDates = getCurrentWeekDates;

/**
 * Displays the current week's dates in the HTML.
 */
function displayWeekDates() {
    const { startDateFormatted, endDateFormatted } = getCurrentWeekDates();
    const weekDatesElement = document.getElementById('weekDates');
    if (weekDatesElement) {
        weekDatesElement.innerText = `תאריכי שבוע: ${startDateFormatted} - ${endDateFormatted}`;
    }

    const summaryWeekDatesElement = document.getElementById('summaryWeekDates');
    if (summaryWeekDatesElement) {
        // Reversed order for summary dates based on user's image example
        summaryWeekDatesElement.innerText = `${endDateFormatted} - ${startDateFormatted}`;
    }
}

/**
 * Displays the welcome message with the authenticated user's name.
 */
function displayWelcomeMessage() {
    const container = document.querySelector('.container');
    if (!container) {
        console.warn("Container element not found for welcome message.");
        return;
    }

    // Use onAuthStateChanged to ensure we have the user state
    if (typeof window.auth !== 'undefined') { // Use window.auth
        window.auth.onAuthStateChanged(user => {
            let username = "אורח"; // Default for unauthenticated users, will be overwritten if user exists
            if (user) {
                if (user.displayName) {
                    username = user.displayName;
                } else if (user.email) {
                    username = user.email; // Fallback to email if displayName is not set
                }
            } else {
                // If no user is logged in, redirect to login page
                if (window.location.pathname !== '/login.html') { // Prevent infinite redirects
                    window.location.href = 'login.html';
                }
                return; // Stop execution if not authenticated
            }

            // Remove any existing welcome message before creating a new one
            const existingWelcome = container.querySelector('.text-center.text-xl.font-semibold.text-gray-700.mb-4');
            if (existingWelcome) {
                existingWelcome.remove();
            }

            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = "text-center text-xl font-semibold text-gray-700 mb-4";
            welcomeDiv.innerText = `ברוך הבא ${username}`;
            container.prepend(welcomeDiv);
        });
    } else {
        // Fallback if Firebase auth is not initialized or available (should not happen if firebase.js loads first)
        console.warn("Firebase auth not available. Displaying generic welcome message.");
        // Redirect to login if Firebase Auth is not available
        if (window.location.pathname !== '/login.html') {
            window.location.href = 'login.html';
        }
        return;
    }
}

/**
 * Switches the view between the attendance input form and the summary page.
 * @param {string} viewId The ID of the view to show ('attendance-view' or 'summary-view').
 */
window.switchView = function(viewId) {
    const attendanceView = document.getElementById('attendance-view');
    const summaryView = document.getElementById('summary-view');

    if (attendanceView) attendanceView.classList.add('hidden');
    if (summaryView) summaryView.classList.add('hidden');

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    if (viewId === 'summary-view') {
        // Populate summary data when switching to summary view
        // Pass 'null' for selectedTeam to indicate no specific team is clicked initially,
        // so it will rely on the current user's teams.
        populateSummaryData(null);
    }
};

/**
 * Populates the team filter list with clickable team names.
 */
window.displayTeamFilterList = function() {
    const teamFilterListContainer = document.getElementById('teamFilterList');
    if (!teamFilterListContainer) return;

    // Ensure window.db is available before proceeding
    if (typeof window.db === 'undefined' || !window.db) {
        console.warn("Firestore (window.db) is not initialized when calling displayTeamFilterList.");
        return;
    }

    // Clear existing buttons
    teamFilterListContainer.innerHTML = '';

    // Hardcode the known roles as options for the filter
    // Removed "כל הקבוצות" from here
    const allTeams = ["כיבוי אש חילוץ והצלה", "הנרי לרפואה", "תורני חפק"];

    allTeams.forEach(team => {
        const teamButton = document.createElement('button');
        teamButton.className = `px-4 py-2 rounded-full font-semibold transition-colors duration-200
                                bg-gray-200 text-gray-700 hover:bg-blue-500 hover:text-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;
        teamButton.textContent = team;
        teamButton.value = team; // Store the team name as a value

        teamButton.addEventListener('click', () => {
            // Remove active style from all buttons
            document.querySelectorAll('#teamFilterList button').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            // Add active style to the clicked button
            teamButton.classList.remove('bg-gray-200', 'text-gray-700');
            teamButton.classList.add('bg-blue-600', 'text-white');

            // Pass the clicked team value to populateSummaryData
            // If "כל הקבוצות" was still here, its value would be null. Now we pass the team directly.
            populateSummaryData(team);
        });
        teamFilterListContainer.appendChild(teamButton);
    });

    // Removed the automatic selection of "כל הקבוצות" button
};


/**
 * Populates the summary tables by fetching and aggregating data from Firestore.
 * This function will now dynamically calculate counts and list names based on
 * the attendance records stored in Firebase.
 * @param {string | null} filterByTeam The team to filter by, or null for all teams (within user's accessible teams).
 */
async function populateSummaryData(filterByTeam = null) {
    // Ensure window.db is available before proceeding
    if (typeof window.db === 'undefined' || !window.db) {
        console.error("Firestore (window.db) is not initialized.");
        window.alertMessage("שגיאה: Firestore אינו מאותחל. אנא רענן את הדף.");
        return;
    }
     // Ensure window.auth is available before proceeding
     if (typeof window.auth === 'undefined' || !window.auth) {
        console.error("Firebase Auth (window.auth) is not initialized.");
        window.alertMessage("שגיאה: Firebase Auth אינו מאותחל. אנא רענן את הדף.");
        return;
    }


    displayWeekDates(); // Ensure dates are updated on summary view

    const quantityTableBody = document.querySelector('#quantitySummaryTable tbody');
    const namesTableBody = document.querySelector('#namesSummaryTable tbody');

    // Clear previous data from tables
    if (quantityTableBody) quantityTableBody.innerHTML = '';
    if (namesTableBody) namesTableBody.innerHTML = '';

    // Define all possible shifts to ensure all rows are displayed, even if no data exists for them
    const shiftsData = [
        { name: "שבת בוקר_1", label: "שבת בוקר" },
        { name: "שבת ערב_1", label: "שבת ערב" },
        { name: "ראשון בוקר", label: "ראשון בוקר" },
        { name: "ראשון ערב", label: "ראשון ערב" },
        { name: "שני בוקר", label: "שני בוקר" },
        { name: "שני ערב", label: "שני ערב" },
        { name: "שלישי בוקר", label: "שלישי בוקר" },
        { name: "שלישי ערב", label: "שלישי ערב" },
        { name: "רביעי בוקר", label: "רביעי בוקר" },
        { name: "רביעי ערב", label: "רביעי ערב" },
        { name: "חמישי בוקר", label: "חמישי בוקר" },
        { name: "חמישי ערב", label: "חמישי ערב" },
        { name: "שישי בוקר", label: "שישי בוקר" },
        { name: "שישי ערב", label: "שישי ערב" },
        { name: "שבת בוקר_2", label: "שבת בוקר" },
        { name: "שבת ערב_2", label: "שבת ערב" }
    ];

    // Initialize aggregation objects for both quantity and names summaries
    const shiftCounts = {};
    const shiftNames = {};

    // Populate initial structure for all shifts with zero counts and empty name arrays
    shiftsData.forEach(shift => {
        shiftCounts[shift.name] = { "נוכח": 0, "נעדר": 0, "חלקי": 0, "לא ידוע": 0 };
        shiftNames[shift.name] = { "נוכח": [], "נעדר": [], "חלקי": [], "לא ידוע": [] };
    });

    const currentUser = window.auth.currentUser;
    let currentUserAssignedTeams = []; // This will store the teams the current user is assigned to

    if (currentUser) {
        try {
            // Fetch the current user's roles/teams from the 'userRoles' collection
            const userRolesDoc = await window.db.collection("userRoles").doc(currentUser.uid).get();
            if (userRolesDoc.exists && userRolesDoc.data().roles) {
                currentUserAssignedTeams = userRolesDoc.data().roles;
            }
        } catch (e) {
            console.error("Error fetching current user's assigned teams for summary:", e);
        }
    }

    try {
        // Fetch all attendance records from Firestore
        const querySnapshot = await window.db.collection("attendanceRecords").get();
        const recordsToProcess = [];

        querySnapshot.forEach(doc => {
            const record = doc.data();
            const recordUserRoles = record.userRoles || []; // Get roles (teams) from attendance record

            let passesCurrentUserTeamsFilter = false;
            // A record passes this filter if the record's user has at least one common team with the current user
            if (currentUserAssignedTeams.length > 0) {
                if (recordUserRoles.some(role => currentUserAssignedTeams.includes(role))) {
                    passesCurrentUserTeamsFilter = true;
                }
            } else {
                // If the current user has no assigned teams, they shouldn't see any team-specific data.
                // Or you could make them see all if they are an admin
                passesCurrentUserTeamsFilter = false;
            }

            // Apply the overall filter based on the clicked team in the summary view
            let passesClickedTeamFilter = true;
            // Now, filterByTeam will be the actual team name (or null).
            if (filterByTeam !== null) {
                // If a specific team button was clicked, check if the record user belongs to that team
                passesClickedTeamFilter = recordUserRoles.includes(filterByTeam);
            }

            // Only add the record if it passes both filters
            if (passesCurrentUserTeamsFilter && passesClickedTeamFilter) {
                recordsToProcess.push(record);
            }
        });

        // Process filtered attendance data
        recordsToProcess.forEach(record => {
            const attendanceData = record.data;
            const username = record.username || "משתמש אנונימי";

            for (const shiftName in attendanceData) {
                const status = attendanceData[shiftName];

                if (shiftCounts[shiftName] && shiftCounts[shiftName][status] !== undefined) {
                    shiftCounts[shiftName][status]++;
                    // Only add the username to the list if it's not already there for this shift and status
                    if (!shiftNames[shiftName][status].includes(username)) {
                        shiftNames[shiftName][status].push(username);
                    }
                }
            }
        });


        // Populate "לפי כמות" (By Quantity) table using aggregated data
        shiftsData.forEach(shift => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-200 hover:bg-gray-50 text-center";
            const counts = shiftCounts[shift.name]; // Get the counts for the current shift
            row.innerHTML = `
                <td class="py-3 px-4 text-right">${shift.label}</td>
                <td class="py-3 px-4">${counts["לא ידוע"]}</td>
                <td class="py-3 px-4">${counts["חלקי"]}</td>
                <td class="py-3 px-4">${counts["נעדר"]}</td>
                <td class="py-3 px-4">${counts["נוכח"]}</td>
            `;
            quantityTableBody.appendChild(row);
        });

        // Populate "לפי שמות" (By Names) table using aggregated data
        shiftsData.forEach(shift => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-200 hover:bg-gray-50 text-center";
            const names = shiftNames[shift.name]; // Get the names list for the current shift
            row.innerHTML = `
                <td class="py-3 px-4 text-right">${shift.label}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${names["לא ידוע"].join(', ')}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${names["חלקי"].join(', ')}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${names["נעדר"].join(', ')}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${names["נוכח"].join(', ')}</td>
            `;
            namesTableBody.appendChild(row);
        });

    } catch (e) {
        console.error("Error populating summary data from Firestore: ", e);
        window.alertMessage("שגיאה בטעינת נתוני סיכום: " + e.message);
    }
}

/**
 * Dynamically generates the attendance table rows for the input form.
 */
function generateAttendanceTableRows() {
    const shiftsData = [
        { name: "שבת בוקר_1", label: "שבת בוקר" },
        { name: "שבת ערב_1", label: "שבת ערב" },
        { name: "ראשון בוקר", label: "ראשון בוקר" },
        { name: "ראשון ערב", label: "ראשון ערב" },
        { name: "שני בוקר", label: "שני בוקר" },
        { name: "שני ערב", label: "שני ערב" },
        { name: "שלישי בוקר", label: "שלישי בוקר" },
        { name: "שלישי ערב", label: "שלישי ערב" },
        { name: "רביעי בוקר", label: "רביעי בוקר" },
        { name: "רביעי ערב", label: "רביעי ערב" },
        { name: "חמישי בוקר", label: "חמישי בוקר" },
        { name: "חמישי ערב", label: "חמישי ערב" },
        { name: "שישי בוקר", label: "שישי בוקר" },
        { name: "שישי ערב", label: "שישי ערב" },
        { name: "שבת בוקר_2", label: "שבת בוקר" },
        { name: "שבת ערב_2", label: "שבת ערב" }
    ];

    const tbody = document.querySelector('#attendance-view table tbody');
    if (tbody) {
        tbody.innerHTML = ''; // Clear existing rows
        shiftsData.forEach(shift => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-200 hover:bg-gray-50 text-center";
            row.innerHTML = `
                <td class="py-3 px-4 text-right">${shift.label}</td>
                <td class="py-3 px-4">
                    <label class="inline-flex items-center p-2 rounded-full cursor-pointer">
                        <span class="ml-2 text-gray-700">לא ידוע</span>
                        <input type="radio" name="${shift.name}" value="לא ידוע" class="form-radio h-4 w-4 text-blue-600 rounded-full">
                    </label>
                </td>
                <td class="py-3 px-4">
                    <label class="inline-flex items-center p-2 rounded-full cursor-pointer">
                        <span class="ml-2 text-gray-700">חלקי</span>
                        <input type="radio" name="${shift.name}" value="חלקי" class="form-radio h-4 w-4 text-blue-600 rounded-full">
                    </label>
                </td>
                <td class="py-3 px-4">
                    <label class="inline-flex items-center p-2 rounded-full cursor-pointer">
                        <span class="ml-2 text-gray-700">נעדר</span>
                        <input type="radio" name="${shift.name}" value="נעדר" class="form-radio h-4 w-4 text-blue-600 rounded-full">
                    </label>
                </td>
                <td class="py-3 px-4">
                    <label class="inline-flex items-center p-2 rounded-full cursor-pointer">
                        <span class="ml-2 text-gray-700">נוכח</span>
                        <input type="radio" name="${shift.name}" value="נוכח" class="form-radio h-4 w-4 text-blue-600 rounded-full" checked>
                    </label>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Custom alert message box (now global via window)
window.alertMessage = function(message) {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    if (messageBox && messageText) {
        messageText.innerText = message;
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 3000); // Hide after 3 seconds
    }
}


// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for inactivity immediately on page load
    checkInactivity();

    generateAttendanceTableRows(); // Generate rows dynamically
    displayWeekDates(); // Display current week's dates
    displayWelcomeMessage(); // Display welcome message
    window.initFirebase(); // Initialize Firebase and trigger data load/welcome message
    // Moved to initFirebase's onAuthStateChanged: window.displayTeamFilterList();
    // Moved to initFirebase's onAuthStateChanged: window.switchView('attendance-view');

    // Add global event listeners to reset the inactivity timer
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
});

// window.saveAttendanceData and window.loadAttendanceData are now defined in firebase.js
// and automatically exposed to the global window object.
