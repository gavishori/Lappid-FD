// Imports from firebase.js
import { initFirebase, saveAttendanceData, loadAttendanceData } from './firebase.js';

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
    const username = "שמעון לוי"; // This should ideally be fetched from user data
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
 * Populates the summary tables with mock data (based on provided images).
 * In a real multi-user app, this would involve fetching and aggregating data from all users
 * from Firestore, based on the `attendanceRecords` collection, potentially from a `public` subcollection
 * if data is meant to be shared.
 */
function populateSummaryData() {
    displayWeekDates(); // Ensure dates are updated on summary view

    // Mock Data for "לפי כמות" (By Quantity) - based on image WhatsApp Image 2025-06-22 at 13.02.02 (1).jpeg
    const quantitySummaryData = [
        { shift: "ראשון בוקר", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "ראשון ערב", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "שני בוקר", present: 1, absent: 1, partial: 1, unknown: 0 },
        { shift: "שני ערב", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "שלישי בוקר", present: 2, absent: 0, partial: 0, unknown: 1 },
        { shift: "שלישי ערב", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "רביעי בוקר", present: 1, absent: 1, partial: 1, unknown: 1 },
        { shift: "רביעי ערב", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "חמישי בוקר", present: 2, absent: 1, partial: 0, unknown: 0 },
        { shift: "חמישי ערב", present: 3, absent: 0, partial: 0, unknown: 0 },
        { shift: "שישי בוקר", present: 2, absent: 0, partial: 1, unknown: 0 },
        { shift: "שישי ערב", present: 1, absent: 0, partial: 2, unknown: 0 },
        { shift: "שבת בוקר", present: 1, absent: 0, partial: 2, unknown: 0 },
        { shift: "שבת ערב", present: 2, absent: 0, partial: 1, unknown: 0 },
    ];

    const quantityTableBody = document.querySelector('#quantitySummaryTable tbody');
    if (quantityTableBody) {
        quantityTableBody.innerHTML = ''; // Clear previous data
        quantitySummaryData.forEach(data => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-200 hover:bg-gray-50 text-center";
            row.innerHTML = `
                <td class="py-3 px-4 text-right">${data.shift}</td>
                <td class="py-3 px-4">${data.unknown}</td>
                <td class="py-3 px-4">${data.partial}</td>
                <td class="py-3 px-4">${data.absent}</td>
                <td class="py-3 px-4">${data.present}</td>
            `;
            quantityTableBody.appendChild(row);
        });
    }


    // Mock Data for "לפי שמות" (By Names) - based on image WhatsApp Image 2025-06-22 at 13.02.02.jpeg
    const namesSummaryData = [
        { shift: "ראשון בוקר", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "ראשון ערב", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "שני בוקר", present: "אורי גביש", absent: "אדיר מנצור", partial: "אילן דביר", unknown: "" },
        { shift: "שני ערב", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "שלישי בוקר", present: "אדיר מנצור, אורי גביש", absent: "", partial: "", unknown: "אילן דביר" },
        { shift: "שלישי ערב", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "רביעי בוקר", present: "אורי גביש", absent: "אדיר מנצור", partial: "אילן דביר", unknown: "" },
        { shift: "רביעי ערב", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "חמישי בוקר", present: "אדיר מנצור, אורי גביש", absent: "אילן דביר", partial: "", unknown: "" },
        { shift: "חמישי ערב", present: "אדיר מנצור, אורי גביש, אילן דביר", absent: "", partial: "", unknown: "" },
        { shift: "שישי בוקר", present: "אדיר מנצור, אורי גביש", absent: "", partial: "אילן דביר", unknown: "" },
        { shift: "שישי ערב", present: "אדיר מנצור", absent: "", partial: "אורי גביש, אילן דביר", unknown: "" },
        { shift: "שבת בוקר", present: "אורי גביש", absent: "", partial: "אדיר מנצור, אילן דביר", unknown: "" },
        { shift: "שבת ערב", present: "אדיר מנצור, אורי גביש", absent: "", partial: "אילן דביר", unknown: "" },
    ];

    const namesTableBody = document.querySelector('#namesSummaryTable tbody');
    if (namesTableBody) {
        namesTableBody.innerHTML = ''; // Clear previous data
        namesSummaryData.forEach(data => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-200 hover:bg-gray-50 text-center";
            row.innerHTML = `
                <td class="py-3 px-4 text-right">${data.shift}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${data.unknown}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${data.partial}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${data.absent}</td>
                <td class="py-3 px-4 text-sm whitespace-normal">${data.present}</td>
            `;
            namesTableBody.appendChild(row);
        });
    }
}

/**
 * Dynamically generates the attendance table rows.
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
    initFirebase(); // Initialize Firebase and trigger data load/welcome message
    window.switchView('attendance-view'); // Show attendance view by default
});

// Expose functions to the global scope for HTML event handlers
window.saveAttendanceData = saveAttendanceData;
