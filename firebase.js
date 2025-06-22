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
const auth = app.auth(); // Get Auth instance using the compat API and expose it

// Expose auth globally for easier access in other scripts
window.auth = auth;


/**
 * Initializes Firebase related functionalities.
 * This function will be called from script.js on DOMContentLoaded.
 * It also triggers loading of any previously saved attendance data.
 */
window.initFirebase = function() {
    console.log("Firebase initialized and initFirebase() called.");
    // Load existing data when Firebase is ready
    // We will now load attendance data specific to the logged-in user
    window.auth.onAuthStateChanged(user => { // Use window.auth
        if (user) {
            window.loadAttendanceData(user.uid); // Pass UID to load specific data
        } else {
            console.log("No user signed in. Cannot load user-specific attendance data.");
        }
    });
};

/**
 * Saves attendance data to Firestore.
 * Reads the current state of the radio buttons from the form.
 * The attendance data is stored under a collection named "attendanceRecords".
 * Each document will contain the week's start/end dates, a timestamp, and the attendance data itself.
 * The document ID will be a combination of week start date and user UID to allow for single submission per user per week.
 */
window.saveAttendanceData = async function() {
    const user = window.auth.currentUser; // Use window.auth
    if (!user) {
        window.alertMessage("אנא התחבר כדי לשמור נתונים.");
        console.error("No user signed in. Cannot save attendance data.");
        return;
    }

    const attendanceData = {};
    const radioButtons = document.querySelectorAll('#attendance-view input[type="radio"]:checked');
    radioButtons.forEach(radio => {
        attendanceData[radio.name] = radio.value;
    });

    // Get current week dates to save with attendance, using the global function from script.js
    const { startDateFormatted, endDateFormatted } = window.getCurrentWeekDates();

    // Create a unique document ID using user UID and week start date
    const docId = `${startDateFormatted.replace(/\//g, '-')}_${user.uid}`;

    try {
        // Use set() with merge:true to update an existing document or create a new one
        await db.collection("attendanceRecords").doc(docId).set({
            weekStart: startDateFormatted,
            weekEnd: endDateFormatted,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Firestore server timestamp
            data: attendanceData, // Store the actual attendance data object
            userId: user.uid, // Store the user's UID
            username: user.displayName || user.email // Store the user's display name or email
        }, { merge: true }); // Merge ensures other fields are not overwritten if the document exists

        window.alertMessage("נתונים נשמרו בהצלחה!"); // Show success message
        console.log("Attendance data saved/updated for", user.displayName || user.email, ":", attendanceData);
    } catch (e) {
        console.error("Error saving attendance data: ", e);
        window.alertMessage("שגיאה בשמירת נתונים: " + e.message); // Show error message
    }
};

/**
 * Loads the most recent attendance data from Firestore for the given user and pre-fills the form.
 * It queries the "attendanceRecords" collection for the current week's data for the specific user.
 * @param {string} userId The UID of the current authenticated user.
 */
window.loadAttendanceData = async function(userId) {
    if (!userId) {
        console.log("User ID is not available to load attendance data.");
        return;
    }

    const { startDateFormatted } = window.getCurrentWeekDates();
    const docId = `${startDateFormatted.replace(/\//g, '-')}_${userId}`;

    try {
        const docRef = db.collection("attendanceRecords").doc(docId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
            const latestRecord = docSnapshot.data();
            const loadedData = latestRecord.data;

            if (loadedData) {
                console.log("Loading latest attendance data for user", userId, ":", loadedData);
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
                console.log("No 'data' field found in the latest record, or it was empty for user", userId);
            }
        } else {
            console.log("No attendance data found in Firestore for user", userId, "for this week.");
            // If no data exists, ensure all radios are set to 'נוכח' (Present) as default
            const radioButtons = document.querySelectorAll('#attendance-view input[type="radio"]');
            radioButtons.forEach(radio => {
                if (radio.value === 'נוכח') {
                    radio.checked = true;
                }
            });
        }
    } catch (e) {
        console.error("Error loading attendance data: ", e);
        window.alertMessage("שגיאה בטעינת נתונים קודמים: " + e.message); // Show error message
    }
};
