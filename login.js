// login.js
// Ensure Firebase app and auth are initialized via CDN scripts in login.html

// Your web app's Firebase configuration (MUST BE THE SAME AS IN firebase.js)
const firebaseConfig = {
    apiKey: "AIzaSyDSR6eGntpstfoS62lD_QLCCTDa9Hj1Ugs",
    authDomain: "lappid-fd.firebaseapp.com",
    projectId: "lappid-fd",
    storageBucket: "lappid-fd.firebasestorage.app",
    messagingSenderId: "987945505626",
    appId: "1:987945505626:web:77ba9cc6f10e5972691963"
};

// Initialize Firebase app if not already initialized
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

// Get references to HTML elements for Login Form
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const openSignupPopupBtn = document.getElementById('openSignupPopupBtn');
const authMessageBox = document.getElementById('authMessageBox');
const authMessageText = document.getElementById('authMessageText');

// Get references to HTML elements for Signup Modal
const signupModal = document.getElementById('signupModal');
const closeSignupModalBtn = document.getElementById('closeSignupModalBtn');
const signupNameInput = document.getElementById('signupName');
const signupEmailInput = document.getElementById('signupEmail');
const signupPasswordInput = document.getElementById('signupPassword');

// Signup Team Checkboxes
const signupRoleFirefighting = document.getElementById('signupRoleFirefighting');
const signupRoleMedical = document.getElementById('signupRoleMedical');
const signupRoleHafak = document.getElementById('signupRoleHafak');

const registerBtn = document.getElementById('registerBtn');
const signupMessageBox = document.getElementById('signupMessageBox');
const signupMessageText = document.getElementById('signupMessageText');

/**
 * Displays a message in the specified message box.
 * @param {HTMLElement} messageBoxElement The div element to display the message in.
 * @param {HTMLElement} messageTextElement The span element inside the message box for text.
 * @param {string} message The message to display.
 * @param {boolean} isError True if it's an error message (red), false for success (green).
 */
function displayMessage(messageBoxElement, messageTextElement, message, isError) {
    messageTextElement.innerText = message;
    messageBoxElement.classList.remove('hidden');

    if (isError) {
        messageBoxElement.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
        messageBoxElement.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
    } else {
        messageBoxElement.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
        messageBoxElement.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
    }

    setTimeout(() => {
        messageBoxElement.classList.add('hidden');
    }, 3000);
}

/**
 * Opens the signup modal.
 */
function openSignupModal() {
    signupModal.classList.remove('hidden');
    signupNameInput.value = ''; // Clear fields
    signupEmailInput.value = '';
    signupPasswordInput.value = '';
    // Uncheck all checkboxes
    signupRoleFirefighting.checked = false;
    signupRoleMedical.checked = false;
    signupRoleHafak.checked = false;
    signupMessageBox.classList.add('hidden'); // Hide any previous messages
}

/**
 * Closes the signup modal.
 */
function closeSignupModal() {
    signupModal.classList.add('hidden');
}

/**
 * Handles user sign-up with email, password, name, and selected team.
 */
async function handleSignUp() {
    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();

    const selectedTeams = [];
    if (signupRoleFirefighting.checked) {
        selectedTeams.push(signupRoleFirefighting.value);
    }
    if (signupRoleMedical.checked) {
        selectedTeams.push(signupRoleMedical.value);
    }
    if (signupRoleHafak.checked) {
        selectedTeams.push(signupRoleHafak.value);
    }


    if (!name || !email || !password || selectedTeams.length === 0) {
        displayMessage(signupMessageBox, signupMessageText, "אנא מלא את כל השדות ובחר צוות אחד לפחות.", true);
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.updateProfile({
            displayName: name
        });

        // Save user's selected teams to Firestore
        await db.collection("userRoles").doc(user.uid).set({
            roles: selectedTeams, // Store as an array with multiple selected teams
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("User signed up and profile updated:", user);
        console.log("User teams saved:", selectedTeams);
        displayMessage(signupMessageBox, signupMessageText, "ההרשמה בוצעה בהצלחה! מועבר לדף הראשי...", false);

        localStorage.setItem('lastActivity', Date.now()); // Update last activity on successful signup

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error("Signup error:", error);
        let errorMessage = "שגיאה בהרשמה: ";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += "כתובת האימייל כבר בשימוש.";
                break;
            case 'auth/invalid-email':
                errorMessage += "כתובת האימייל אינה תקינה.";
                break;
            case 'auth/operation-not-allowed':
                errorMessage += "אימות באמצעות אימייל/סיסמה אינו מופעל.";
                break;
            case 'auth/weak-password':
                errorMessage += "הסיסמה חלשה מדי. אנא בחר סיסמה חזקה יותר.";
                break;
            default:
                errorMessage += error.message;
        }
        displayMessage(signupMessageBox, signupMessageText, errorMessage, true);
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!email || !password) {
        displayMessage(authMessageBox, authMessageText, "אנא הכנס אימייל וסיסמה.", true);
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("User signed in successfully.");
        displayMessage(authMessageBox, authMessageText, "התחברת בהצלחה! מועבר לדף הראשי...", false);

        localStorage.setItem('lastActivity', Date.now()); // Update last activity on successful signin

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error("Sign-in error:", error);
        let errorMessage = "שגיאה בהתחברות: ";
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += "כתובת האימייל אינה תקינה.";
                break;
            case 'auth/user-disabled':
                errorMessage += "חשבון זה נחסם.";
                break;
            case 'auth/user-not-found':
                errorMessage += "משתמש לא נמצא עם אימייל זה.";
                break;
            case 'auth/wrong-password':
                errorMessage += "הסיסמה שהוזנה שגויה.";
                break;
            default:
                errorMessage += error.message;
        }
        displayMessage(authMessageBox, authMessageText, errorMessage, true);
    }
}

// Event Listeners
loginBtn.addEventListener('click', handleSignIn);
openSignupPopupBtn.addEventListener('click', openSignupModal);
closeSignupModalBtn.addEventListener('click', closeSignupModal);
registerBtn.addEventListener('click', handleSignUp);

// Optional: Automatically redirect if user is already signed in
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in. You might want to redirect them immediately.
        console.log("User already signed in:", user.email);
        // window.location.href = 'index.html'; // Uncomment if immediate redirect is desired
    }
});
