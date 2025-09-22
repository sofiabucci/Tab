/**
 * Navigates to a specified URL using the History API and triggers the router.
 */
function navigateTo(url) {
    history.pushState(null, null, url);
    router();
}



/**
 * Checks if a user is authenticated.
 */
function isAuthenticated() {
    return sessionStorage.getItem('isAuthenticated') === 'true';
}



// Cache for views to avoid repeated imports
let views = null;



/**
 * Lazy loads view components.
 */
async function getViews() {
    if (!views) {
        views = await import('./views.js');
    }
    return views;
}



/**
 * Main router function that handles navigation and view rendering.
 * Matches current URL against defined routes and renders appropriate view.
 * Handles authentication and 404 cases.
 */
const router = async () => {
    const views = await getViews();
    const routes = [
        { path: "/login", view: views.LoginView },
        { path: "/", view: views.BaseView },
        { path: "/rules", view: views.RulesView },
        { path: "/game-setup", view: views.GameView },
        { path: "/how-to-play", view: views.HowToPlayView },
        { path: "/ranking", view: views.RankingView },
        { path: "/game", view: views.GameRunnerView },
        { path: "/game-online", view: views.GameRunnerServerView },
    ];

    // Map routes to potential matches
    const potentialMatches = routes.map(route => ({
        route: route,
        isMatch: location.pathname === route.path
    }));

    // Find matching route or default to 404
    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);
    
    if (!match) {
        match = {
            route: { view: views.NotFoundView },
            isMatch: true
        };
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated() && location.pathname !== '/login') {
        match = {
            route: routes[0],
            isMatch: true
        };
    }

    // Initialize and render the matched view
    const view = new match.route.view();
    try {
        const html = await view.getHtml();
        document.querySelector("#app").innerHTML = html;
        if (typeof view.initialize === 'function') {
            view.initialize();
            logout();
        }
    } catch (error) {
        console.error('Error in router:', error);
    }
};



/**
 * Initializes the application's content and sets up event listeners.
 * Handles initial authentication state and navigation.
 */
function loadInitialContent() {
    sessionStorage.removeItem('isAuthenticated');
    
    // Set up click handlers for navigation links
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    // Initial navigation based on authentication state
    !isAuthenticated() ? navigateTo('/login') : router();
}



/**
 * Sets up logout functionality.
 * Adds click event listener to logout button if it exists.
 */
const logout = () => {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.removeItem('isAuthenticated');
            navigateTo("/login");
        });
    }
};



// Set up browser history navigation
window.addEventListener("popstate", router);



// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", loadInitialContent);



export { navigateTo };