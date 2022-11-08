const engineMainUrl = "screens/#/";
const functionsUrl = "https://woodmall.neula.cloud/api/functions/woodmall/"
const notSecretToken = "5c7285017643837e7b4eb4c60a23ae404f20d6b1ebefaffa4a722a98d06def176730";
const portletSettings = "/n-background-color=f6f4f3/n-font-size=14";

// function initSessionId() {
//     let sessionId = sessionStorage.getItem("sessionId");
//     if(sessionId === null) {
//        // based on https://www.w3resource.com/javascript-exercises/fundamental/javascript-fundamental-exercise-253.php
//       sessionId = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
//            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
//        );
//       sessionStorage.setItem("sessionId", sessionId);
//     }
// }


let currentPage = "main";

document.addEventListener("DOMContentLoaded", function () {
    updateButtonsVisibility();
    openMainPage();
    checkSession();
});


function clearSessionId() {
    localStorage.removeItem("sessionId");
    openMainPage();
    checkSession();
}

function storeSessionId(sessionId) {
    localStorage.setItem("sessionId", sessionId);
    openMainPage();
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
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/login" + portletSettings)
    element.classList.remove("hidden");
    markPageActive("Login");
}

function logout() {
    const sessionId = getSessionId();

    callPortalFunction("logout", {session_id: sessionId}, () => {
        const element = document.getElementById("enginePage");
        element.setAttribute("src", engineMainUrl + "a/b"); // hack to ensure current screen reload
        clearSessionId();
        updateButtonsVisibility();
    }, () => {
        updateButtonsVisibility();
    });

}

function openRegister() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_registration" + portletSettings);
    element.classList.remove("hidden");
    markPageActive("Register");
}

function openMainPage() {
    const element = document.getElementById("enginePage");
    const sessionId = getSessionId();

    element.setAttribute("src", engineMainUrl + "woodmall/main_page" + portletSettings)
    markPageActive("MainPage");

    // if(sessionId === null) {
    //     element.setAttribute("src", engineMainUrl + "woodmall/main_page?session_id=")
    // } else {
    //     element.setAttribute("src", engineMainUrl + "woodmall/main_page?session_id="+sessionId);
    // }
    element.classList.remove("hidden");
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
    currentPage = elementId;
    updateButtonsVisibility();
}

function openAuctionsSearch() {

    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/auctions_search" + portletSettings + "?" + sessionIdParam())
    element.classList.remove("hidden");

    markPageActive("AuctionsPage");
}

function openNewAuction() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/sales_offer" + portletSettings + "?" + sessionIdParam())
    element.classList.remove("hidden");

    markPageActive("NewAuction");
}

function openUserContactData() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_contact_data" + portletSettings + "?" + sessionIdParam());
    element.classList.remove("hidden");
    markPageActive("UserContactData");
}

function openUserAddress() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_address" + portletSettings + "?" + sessionIdParam());
    element.classList.remove("hidden");
    markPageActive("UserAddress");
}

function openUserPassword() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_password" + portletSettings + "?" + sessionIdParam());
    element.classList.remove("hidden");
    markPageActive("UserPassword");
}

function openUserAgreements() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_agreements" + portletSettings + "?" + sessionIdParam());
    element.classList.remove("hidden");
    markPageActive("UserAgreements");
}

function openUserAccountManagement() {
    const element = document.getElementById("enginePage");
    element.setAttribute("src", engineMainUrl + "woodmall/user_account_management" + portletSettings + "?" + sessionIdParam());
    element.classList.remove("hidden");
    markPageActive("UserAccountManagement");
}



function updateButtonsVisibility() {
    const sessionId = getSessionId();
    const loggedIn = sessionId !== null;
    showButton("Login", !loggedIn);
    showButton("Logout", loggedIn);
    showButton("Register", !loggedIn);
    showButton("MyAccountPage", loggedIn);
    showButton("NewAuction", loggedIn);
    showButton("userSettingsNavigation", loggedIn && isAnyUserSettingsPage());
}


// function openMyAccountPage() {
//     const element = document.getElementById("enginePage");
//     element.classList.remove("hidden");
//
//     const sessionId = getSessionId();
//
//     const pageName = "woodmall/password_change";
//     if(sessionId === null) {
//         element.setAttribute("src", engineMainUrl + pageName+portletSettings+"?session_id=")
//     } else {
//         element.setAttribute("src", engineMainUrl + pageName+portletSettings+"?session_id="+sessionId);
//     }
//
//     markPageActive("MyAccountPage");
// }

function isAnyUserSettingsPage() {
    return currentPage === "UserContactData" ||
    currentPage === "UserAddress" ||
    currentPage === "UserPassword" ||
    currentPage === "UserAgreements" ||
    currentPage === "UserAccountManagement";
}

function showButton(id, visible) {
    document.getElementById(id).classList.toggle("hidden", !visible);
}


function onScreenPortletAttributeChanged(param) {
    if (param[0] === "session_id") {
        storeSessionId(param[1]);
        console.log("Session: '" + param[1] + "'");
    }
    updateButtonsVisibility();
}