// script.js
// Firebase functions (initFirebase, saveAttendanceData, loadAttendanceData)
// are now expected to be available globally on the 'window' object,
// defined in firebase.js after Firebase SDKs are loaded via CDN.

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
 * Displays the welcome message with a placeholder username.
 * In a real app, this would come from user data fetched from Firebase.
 */
function displayWelcomeMessage() {
    // Placeholder username. In a real app, you'd fetch the user's actual name from Firebase.
    // Assuming auth is available globally via firebase.js and index.html
    const currentUser = firebase.auth().currentUser;
    const username = currentUser ? currentUser.displayName || currentUser.email || "משתמש לא ידוע" : "אורח";
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = "text-center text-xl font-semibold text-gray-700 mb-4";
    welcomeDiv.innerText = `ברוך הבא ${username}`;
    const container = document.querySelector('.container');
    if (container) {
        container.prepend(welcomeDiv); // Add to the top of the container
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
        populateSummaryData();
    }
};

/**
 * Populates the summary tables by fetching and aggregating data from Firestore.
 * This function will now dynamically calculate counts and list names based on
 * the attendance records stored in Firebase.
 */
async function populateSummaryData() {
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
    const shiftCounts = {}; // Stores counts for each status per shift (e.g., { "ראשון בוקר": { "נוכח": 3, ... } })
    const shiftNames = {}; // Stores arrays of names for each status per shift (e.g., { "ראשון בוקר": { "נוכח": ["אורי", "אדיר"], ... } })

    // Populate initial structure for all shifts with zero counts and empty name arrays
    shiftsData.forEach(shift => {
        shiftCounts[shift.name] = { "נוכח": 0, "נעדר": 0, "חלקי": 0, "לא ידוע": 0 };
        shiftNames[shift.name] = { "נוכח": [], "נעדר": [], "חלקי": [], "לא ידוע": [] };
    });

    try {
        // Fetch all attendance records from Firestore
        // Assuming 'db' is globally available from firebase.js
        const querySnapshot = await db.collection("attendanceRecords").get();

        // Iterate over each document (attendance record) fetched from Firestore
        querySnapshot.forEach(doc => {
            const record = doc.data(); // Get the data from the document
            const attendanceData = record.data; // This 'data' object holds shift status (e.g., {"שבת בוקר_1": "נוכח"})
            const username = record.username || "משתמש אנונימי"; // Get username, default if not present

            // Process attendance data for each shift in the current record
            for (const shiftName in attendanceData) {
                const status = attendanceData[shiftName]; // Get the status for the current shift

                // Ensure the shift and status exist in our aggregation objects
                if (shiftCounts[shiftName] && shiftCounts[shiftName][status] !== undefined) {
                    shiftCounts[shiftName][status]++; // Increment count for the status
                    if (!shiftNames[shiftName][status].includes(username)) { // Avoid duplicate names
                        shiftNames[shiftName][status].push(username); // Add username to the list for this status
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
    generateAttendanceTableRows(); // Generate rows dynamically
    displayWeekDates(); // Display current week's dates
    displayWelcomeMessage(); // Display welcome message
    window.initFirebase(); // Initialize Firebase and trigger data load/welcome message
    window.switchView('attendance-view'); // Show attendance view by default
});

// window.saveAttendanceData and window.loadAttendanceData are now defined in firebase.js
// and automatically exposed to the global window object.
