// GLOBAL LOGOUT FUNCTION

async function logoutUser() {

    // 1. Check if user session exists
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    // 2. If no session → redirect directly (prevents "Auth session missing!")
    if (!session) {
        //console.log("No active session. Redirecting to login.");
         showError("Auth Session Missing", "You were already logged out.", {
            buttonText: "OK",
            onClose: () => window.location.href = "Login_Admin.html"
        });
        return;
    }

    // 3. If session exists → log out normally
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
       // alert("🚫 Logout failed: " + error.message);
             showError("Logout Failed", error.message, {
            buttonText: "Try Again"
        });
    }else {
        showSuccess("Logged Out", "You have been logged out successfully.", {
            buttonText: "Continue",
            onClose: () => window.location.href = "Login_Admin.html"
        });
    }
}
