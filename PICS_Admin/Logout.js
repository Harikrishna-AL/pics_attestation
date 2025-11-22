// GLOBAL LOGOUT FUNCTION
async function logoutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert('Error logging out: ' + error.message);
    } else {
        window.location.href = "Login_Admin.html";
    }
}
