const engineMainUrl = "screens/#/";
// const functionsUrl = "https://woodmall.neula.cloud/api/functions/woodmall/"
const functionsUrl = "https://woodmalltest.neula.cloud/api/functions/woodmall/"
// const engineMainUrl = "http://localhost:4200/#/";
// const functionsUrl = "http://woodmall.localhost:8080/api/functions/woodmall/"
// const notSecretToken = "5c7285017643837e7b4eb4c60a23ae404f20d6b1ebefaffa4a722a98d06def176730";
const notSecretToken = "ebd7b0f111d250f5f7707690185d80e65d97ea45b66a9742cb5de92dc9bb037c5586";
const portletSettings = "/n-background-color=f6f4f3/n-font-size=14/n-scroll=off";

const history = [];

let currentPage = null;
let currentParams = null;
let currentPageElementId = "MainPage";

document.addEventListener("DOMContentLoaded", function () {
    updateButtonsVisibility();
    openRecentlyAddedPage();
    checkSession();
});


function clearSessionId() {
    localStorage.removeItem("sessionId");
    openRecentlyAddedPage();
    checkSession();
}

function storeSessionId(sessionId) {
    localStorage.setItem("sessionId", sessionId);
    openRecentlyAddedPage();
    checkSession();
}

function getSessionId() {
    return localStorage.getItem("sessionId");
}


function callPortalFunction(name, paramsBody, onSuccess, onFailure) {
    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', functionsUrl + name);
    xhttp.setRequestHeader("Authorization", "Bearer " + notSecretToken);
    xhttp.onload = function () {
        if (this.status === 401) {
            clearSessionId();
            onFailure();
        } else {
            try {
                onSuccess(JSON.parse(xhttp.responseText));
            } catch (e) {
                console.log("Unable to parse response " + this.status + " " + xhttp.responseText);
            }
        }
    }
    xhttp.send(JSON.stringify(paramsBody));
}

function checkSession() {
    const sessionId = getSessionId();
    if (sessionId != null) {
        callPortalFunction("checkSession", {session_id: sessionId}, (userInfo) => {
            if (userInfo.name !== undefined) {
                document.getElementById("welcome").innerText = "Hello " + userInfo.name;
            } else {
                document.getElementById("welcome").innerText = "";
                clearSessionId();
                updateButtonsVisibility();
            }
        }, () => {
            document.getElementById("welcome").innerText = "";
            updateButtonsVisibility();
        });
    } else {
        document.getElementById("welcome").innerText = "";
        updateButtonsVisibility();
    }
}

// initSessionId();

function openLogin() {
    navigateToPage("login");
    markPageActive("Login");
}

function navigateToPage(page, params, noHistory) {

    const element = document.getElementById("enginePage");
    let newUrl = engineMainUrl + "woodmall/" + page + portletSettings + "?" + emptyIfNull(params) +"&"+sessionIdParam();

    if(page !== currentPage) {
        if(currentPage !== null && noHistory !== true) {
            history.push({page: currentPage, params: currentParams});
            console.log("New history", history.map(h => h.page).join(" -> "));
        }
        currentPage = page;
        currentParams = params;
        showPreloader();
        element.contentWindow.location.replace(newUrl);
        // element.setAttribute("src", newUrl);
    }
    element.classList.remove("hidden");
    updateButtonsVisibility();
}


function emptyIfNull(params) {
    if(params === null || params === undefined) {
        return "";
    } else {
        return params;
    }
}

function logout() {
    const sessionId = getSessionId();

    callPortalFunction("logout", {session_id: sessionId}, () => {
        navigateToPage("b");
        clearSessionId();
    }, () => {
        updateButtonsVisibility();
    });

}

function openRegister() {
    navigateToPage("user_registration");
    markPageActive("Register");
}

function openRecentlyAddedPage() {
    navigateToPage("recently_added");
    markPageActive("RecentlyAddedPage");
}

function sessionIdParam() {
    const sessionId = getSessionId();
    if(sessionId === null) {
        return "session_id=&";
    } else {
        return "session_id="+sessionId+"&";
    }
}

function markPageActive(elementId) {
    Array.from(document.querySelectorAll('.navigation button')).forEach((el) => {
        el.classList.remove('active');
    });
    document.getElementById(elementId).classList.add("active");
    currentPageElementId = elementId;
    updateButtonsVisibility();
}

function openAuctionsSearch() {
    navigateToPage("auctions_search")
    markPageActive("AuctionsPage");
}

function openNewAuction() {
    navigateToPage("new_auction")
    markPageActive("NewAuction");
}

function openMySales() {
    navigateToPage("my_sales")
    markPageActive("MySales");
}

function openMyPurchases() {
    navigateToPage("my_purchases")
    markPageActive("MyPurchases");
}

function openUserSettings() {
    navigateToPage("user_settings");
    markPageActive("UserSettingsPage");
}

function openUserAddress() {
    navigateToPage("user_address");
    markPageActive("UserAddress");
}

function openUserPassword() {
    navigateToPage("user_password");
    markPageActive("UserPassword");
}

function openUserAgreements() {
    navigateToPage("user_agreements");
    markPageActive("UserAgreements");
}

function openUserAccountManagement() {
    navigateToPage("user_account_management");
    markPageActive("UserAccountManagement");
}



function updateButtonsVisibility() {
    const sessionId = getSessionId();
    const loggedIn = sessionId !== null;
    showButton("Login", !loggedIn);
    showButton("Logout", loggedIn);
    showButton("Register", !loggedIn);
    showButton("UserSettingsPage", loggedIn);
    showButton("NewAuction", loggedIn);
    showButton("MySales", loggedIn);
    showButton("MyPurchases", loggedIn);
}



function isAnyUserSettingsPage() {
    return currentPageElementId === "UserContactData" ||
    currentPageElementId === "UserAddress" ||
    currentPageElementId === "UserPassword" ||
    currentPageElementId === "UserAgreements" ||
    currentPageElementId === "UserAccountManagement";
}

function showButton(id, visible) {
    document.getElementById(id).classList.toggle("hidden", !visible);
}


function onScreenPortletAttributeChanged(param) {
    console.log("Attribute changed");

    if (param[0] === "session_id" && param[1] !== null && param[1].trim().length > 0) {
        storeSessionId(param[1]);
        console.log("Session: '" + param[1] + "'");
    }

    if (param[0] === "page") {
        if(param[1] === "$back") {
            console.log("History Navigating back");
            if(history.length > 1) {
                let previous = history.pop();
                console.log("New history (popped)", history.map(h => h.page).join(" -> "));
                navigateToPage(previous.page, previous.params, true);
            }

        } else {
            const pageAndParams = param[1].split("?");
            navigateToPage(pageAndParams[0], pageAndParams[1]);
        }
    }


    updateButtonsVisibility();
}

function onScreenPortletLoaded() {
    window.scrollTo(0, 0);
    setTimeout(() => {
        hidePreloader();
    }, 50)
}

function hidePreloader() {
    document.getElementById("preloader").classList.remove("visible");
}

function showPreloader() {
    document.getElementById("preloader").classList.add("visible");
}

window.onpopstate = function(event) {
    alert("History location: " + document.location);
}
