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
// This ensures that the login page can function independently
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth(); // Get the Auth service using the compat API

// Get references to HTML elements
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const authMessageBox = document.getElementById('authMessageBox');
const authMessageText = document.getElementById('authMessageText');

/**
 * Displays a message in the message box.
 * @param {string} message The message to display.
 * @param {boolean} isError True if it's an error message (red), false for success (green).
 */
function displayAuthMessage(message, isError) {
    authMessageText.innerText = message;
    authMessageBox.classList.remove('hidden'); // Show the message box

    if (isError) {
        authMessageBox.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
        authMessageBox.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
    } else {
        authMessageBox.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
        authMessageBox.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
    }

    setTimeout(() => {
        authMessageBox.classList.add('hidden'); // Hide after 3 seconds
    }, 3000);
}

/**
 * Handles user sign-up with email, password, and name.
 */
async function handleSignUp() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !email || !password) {
        displayAuthMessage("אנא מלא את כל השדות (שם, אימייל וסיסמה).", true);
        return;
    }

    try {
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update user profile with the provided name
        await user.updateProfile({
            displayName: name
        });

        console.log("User signed up and profile updated:", user);
        displayAuthMessage("ההרשמה בוצעה בהצלחה! מועבר לדף הראשי...", false);

        // Redirect to the main application page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html'; // Adjust this to your main app page
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
        displayAuthMessage(errorMessage, true);
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        displayAuthMessage("אנא הכנס אימייל וסיסמה.", true);
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("User signed in successfully.");
        displayAuthMessage("התחברת בהצלחה! מועבר לדף הראשי...", false);

        // Redirect to the main application page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html'; // Adjust this to your main app page
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
        displayAuthMessage(errorMessage, true);
    }
}

// Add event listeners to the buttons
loginBtn.addEventListener('click', handleSignIn);
signupBtn.addEventListener('click', handleSignUp);

// Optional: Automatically redirect if user is already signed in
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in. You might want to redirect them immediately.
        console.log("User already signed in:", user.email);
        // window.location.href = 'index.html'; // Uncomment if immediate redirect is desired
    }
});

// Hide name input field for login view initially, show on signup button click
// This requires a minor modification to how name field is handled, or a toggle view.
// For simplicity, it's always visible here, which works for both.
// If you want to dynamically hide/show the name field based on login/signup,
// you would add toggle logic here.
