// firebase.js
// This file initializes Firebase and defines functions for data operations.
// Firebase SDKs are loaded via CDN in index.html, making 'firebase' global.

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSR6eGntpstfoS62lD_QLCCTDa9Hj1Ugs",
  authDomain: "lappid-fd.firebaseapp.com",
  projectId: "lappid-fd",
  storageBucket: "lappid-fd.firebasestorage.app",
  messagingSenderId: "987945505626",
  appId: "1:987945505626:web:77ba9cc6f10e5972691963"
};

// Initialize Firebase app and Firestore
// 'firebase' object is available globally because of the CDN scripts loaded in index.html
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore(); // Get Firestore instance using the compat API
const auth = app.auth(); // Get Auth instance to get current user ID/name

/**
 * Initializes Firebase related functionalities.
 * This function will be called from script.js on DOMContentLoaded.
 * It also triggers loading of any previously saved attendance data.
 */
window.initFirebase = function() {
    console.log("Firebase initialized and initFirebase() called.");
    // Load existing data when Firebase is ready
    window.loadAttendanceData(); // Call loadAttendanceData after Firebase is initialized
};

/**
 * Saves attendance data to Firestore.
 * Reads the current state of the radio buttons from the form.
 * The attendance data is stored under a collection named "attendanceRecords".
 * Each document will contain the week's start/end dates, a timestamp, and the attendance data itself.
 * It now also includes the current user's display name if authenticated.
 */
window.saveAttendanceData = async function() {
    const attendanceData = {};
    const radioButtons = document.querySelectorAll('#attendance-view input[type="radio"]:checked');
    radioButtons.forEach(radio => {
        attendanceData[radio.name] = radio.value;
    });

    // Get current week dates to save with attendance, using the global function from script.js
    const { startDateFormatted, endDateFormatted } = window.getCurrentWeekDates();

    // Get current user's display name if available
    const currentUser = auth.currentUser;
    const username = currentUser ? currentUser.displayName || currentUser.email || "משתמש לא ידוע" : "אורח";

    try {
        // Add a new document to the "attendanceRecords" collection
        await db.collection("attendanceRecords").add({
            weekStart: startDateFormatted,
            weekEnd: endDateFormatted,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Firestore server timestamp
            username: username, // Save the username with the record
            data: attendanceData // Store the actual attendance data object
        });
        window.alertMessage("נתונים נשמרו בהצלחה!"); // Show success message
        console.log("Attendance data saved:", attendanceData, "by user:", username);
    } catch (e) {
        console.error("Error saving attendance data: ", e);
        window.alertMessage("שגיאה בשמירת נתונים: " + e.message); // Show error message
    }
};

/**
 * Loads the most recent attendance data from Firestore and pre-fills the form.
 * It queries the "attendanceRecords" collection, orders by timestamp in descending order,
 * and limits to one document to get the latest entry.
 */
window.loadAttendanceData = async function() {
    try {
        // IMPORTANT: For a multi-user app, you might want to load data specific to the current user.
        // For simplicity and matching previous behavior (loading any latest record),
        // we're still loading the single latest record here.
        // If you want user-specific loading, you'd filter by userId:
        // .where("userId", "==", auth.currentUser.uid)

        const querySnapshot = await db.collection("attendanceRecords")
            .orderBy("timestamp", "desc") // Order by timestamp to get the latest record
            .limit(1) // Get only the most recent record
            .get();

        if (!querySnapshot.empty) {
            const latestRecord = querySnapshot.docs[0].data(); // Get the data of the latest document
            const loadedData = latestRecord.data; // Access the 'data' field

            if (loadedData) {
                console.log("Loading latest attendance data into form:", loadedData);
                // Iterate over loadedData and set radio button states in the form
                for (const shiftName in loadedData) {
                    const status = loadedData[shiftName];
                    const radio = document.querySelector(`input[name="${shiftName}"][value="${status}"]`);
                    if (radio) {
                        radio.checked = true; // Set the radio button as checked
                    }
                }
                window.alertMessage("נתונים קודמים נטענו בהצלחה!"); // Notify user
            } else {
                console.log("No 'data' field found in the latest record, or it was empty.");
            }
        } else {
            console.log("No attendance data found in Firestore to load.");
        }
    } catch (e) {
        console.error("Error loading attendance data: ", e);
        window.alertMessage("שגיאה בטעינת נתונים קודמים: " + e.message); // Show error message
    }
};
