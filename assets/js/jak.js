(function () {
    const maxCharge = 10000;
    const chargeIncrementPerSecond = 0.5; // 1 charge every 2 seconds
    const autoClickThresholdMs = 100; // حد سرعت کلیک کمتر از 100 میلی‌ثانیه برای هشدار اتوکلیکر

    const pointsDisplay = document.getElementById("pointsDisplay");
    const chargeDisplay = document.getElementById("chargeDisplay");
    const tapImage = document.getElementById("tapImage");
    const boostWithdrawButton = document.getElementById("boostWithdrawButton");
    const loginForm = document.getElementById("loginForm");
    const loginContainer = document.getElementById("loginContainer");
    const coinContainer = document.getElementById("coinContainer");
    const notificationMessage = document.getElementById("notificationMessage");
    const rankElement = document.getElementById("rank");
    const inputContainer = document.querySelector(".input-container");
    const specialCodeInput = document.getElementById("specialCode");

    // Load saved data for user
    let username = localStorage.getItem("username");
    let bagNumber = localStorage.getItem("bagNumber");

    // Keys for per-user storage
    function getPointsKey(name) { return `spousePoints_${name}`; }
    function getChargeKey(name) { return `spouseCharge_${name}`; }
    function getLastTimeKey(name) { return `lastChargeTimestamp_${name}`; }
    function getPenaltyStartKey(name) { return `penaltyStart_${name}`; }
    function getPatternActivatedKey(name) { return `patternActivated_${name}`; }
    function getUsedSpecialCodesKey(name) { return `usedSpecialCodes_${name}`; }

    // Default values
    let points = 0;
    let charge = maxCharge;
    let lastTime = Date.now();
    let lastClickTime = 0;

    // State flags
    let specialActive = false;
    let specialTimer = null;
    let inputCloseTimer = null;

    const originalImageSrc = "assets/images/shtn.png";
    const alternateImageSrc = "assets/images/shtn2.png";

    // Allowed special codes, can add more here
    const allowedSpecialCodes = ["SHOK"];

    function loadUserData() {
        if (username) {
            let savedPoints = localStorage.getItem(getPointsKey(username));
            let savedCharge = localStorage.getItem(getChargeKey(username));
            let savedLastTimestamp = localStorage.getItem(getLastTimeKey(username));
            let patternActivated = localStorage.getItem(getPatternActivatedKey(username)) === 'true';
            let usedCodesStr = localStorage.getItem(getUsedSpecialCodesKey(username));
            window.usedSpecialCodes = usedCodesStr ? JSON.parse(usedCodesStr) : [];

            points = savedPoints !== null ? Number(savedPoints) : 0;
            charge = savedCharge !== null ? Number(savedCharge) : maxCharge;
            lastTime = savedLastTimestamp !== null ? Number(savedLastTimestamp) : Date.now();

            if (patternActivated) {
                activateSpecialModeUI();
                specialActive = true;
            }
        } else {
            points = 0;
            charge = maxCharge;
            lastTime = Date.now();
            window.usedSpecialCodes = [];
        }
        updateUI();
    }

    function saveUserData() {
        if (username) {
            localStorage.setItem(getPointsKey(username), points);
            localStorage.setItem(getChargeKey(username), charge);
            localStorage.setItem(getLastTimeKey(username), lastTime);
            localStorage.setItem(getPatternActivatedKey(username), specialActive ? 'true' : 'false');
            localStorage.setItem(getUsedSpecialCodesKey(username), JSON.stringify(window.usedSpecialCodes || []));
            localStorage.setItem("username", username);
            localStorage.setItem("bagNumber", bagNumber);
        }
    }

    function updateUI() {
        pointsDisplay.textContent = points.toLocaleString("fa-IR");
        chargeDisplay.textContent = Math.floor(charge).toLocaleString("fa-IR");
        document.querySelector(".name").textContent = username || "UNKNOWN";

        let penaltyStart = username ? Number(localStorage.getItem(getPenaltyStartKey(username))) : 0;
        let now = Date.now();
        if (penaltyStart && now - penaltyStart < 60000) {
            pointsDisplay.classList.add("red-alert");
        } else {
            pointsDisplay.classList.remove("red-alert");
        }
    }

    function autoRecharge() {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - lastTime) / 1000);
        if (elapsedSeconds > 0) {
            charge = Math.min(maxCharge, charge + elapsedSeconds * chargeIncrementPerSecond);
            lastTime += elapsedSeconds * 1000;
            saveUserData();
            updateUI();
        }
    }

    function addPointsOnClick(amountPoints) {
        if (charge > 0) {
            charge -= 1;
            points += amountPoints;
            saveUserData();
            updateUI();

            tapImage.classList.add("shake");
            setTimeout(() => {
                tapImage.classList.remove("shake");
            }, 500);
        }
    }

    // On tap image click
    tapImage.addEventListener("click", (event) => {
        if (!username || !bagNumber) {
            showNotification("لطفا ابتدا وارد شوید");
            return;
        }

        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;
        let penaltyStart = Number(localStorage.getItem(getPenaltyStartKey(username))) || 0;

        if (!specialActive) {
            if (timeSinceLastClick < autoClickThresholdMs) {
                if (!penaltyStart || now - penaltyStart > 60000) {
                    showNotification("سیستم تشخیص اتوکلیکر داد! در صورت استفاده مجدد امتیاز شما صفر میشود");
                    localStorage.setItem(getPenaltyStartKey(username), now);
                } else {
                    points = 0;
                    charge = maxCharge;
                    saveUserData();
                    showNotification("مجازات شدید! امتیاز شما صفر شد.");
                    localStorage.removeItem(getPenaltyStartKey(username));
                    updateUI();
                    lastClickTime = now;
                    return;
                }
            }
            lastClickTime = now;
            addPointsOnClick(1);

            createFloatingPoints("+1", event);

        } else {
            addPointsOnClick(3);
            createFloatingPoints("+3", event);
        }
    });

    // Create floating + points animation
    function createFloatingPoints(text, event) {
        const plus = document.createElement("span");
        plus.textContent = text;
        plus.className = "points-plus";

        const rect = coinContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        plus.style.left = `${x}px`;
        plus.style.top = `${y}px`;

        coinContainer.appendChild(plus);

        setTimeout(() => {
            if (plus.parentNode) {
                plus.parentNode.removeChild(plus);
            }
        }, 1000);
    }

    boostWithdrawButton.addEventListener("click", () => {
        if (!username || !bagNumber) {
            showNotification("لطفا ابتدا وارد شوید");
            return;
        }
        if (points >= 100000) {
            const formUrl =
                "https://docs.google.com/forms/d/e/1FAIpQLScSl360FctxiHqMRNgdDKMmdXAPpGwWhA5X8Nex48voaFQd6g/formResponse";
            const formData = new FormData();
            formData.append("entry.80941820", username);
            formData.append("entry.429278502", bagNumber);
            formData.append("entry.1807600735", points);

            fetch(formUrl, {
                method: "POST",
                body: formData,
                mode: "no-cors",
            })
            .then(() => {
                points = 0;
                saveUserData();
                updateUI();
                showNotification("برداشت با موفقیت انجام شد!");
            })
            .catch((error) => {
                showNotification("خطا در ارسال اطلاعات. لطفا دوباره تلاش کنید.");
                console.error("Error:", error);
            });
        } else {
            showNotification("شما به اندازه کافی امتیاز برای برداشت ندارید.");
        }
    });

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        username = document.getElementById("username").value.trim();
        bagNumber = document.getElementById("bagNumber").value.trim();
        if (!username || !bagNumber) {
            showNotification("لطفاً نام کاربری و شماره کیف پول را وارد کنید.");
            return;
        }
        loadUserData();
        saveUserData();
        loginContainer.style.display = "none";
        coinContainer.style.display = "flex";
        updateUI();
    });

    // Notification show/hide with animation
    let notificationTimeout = null;
    function showNotification(message) {
        notificationMessage.textContent = message;
        notificationMessage.classList.add("show");
        clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            notificationMessage.classList.remove("show");
        }, 8000);
    }

    // Activate special code mode
    function activateSpecialModeUI() {
        tapImage.src = alternateImageSrc;
        specialActive = true;
    }

    // Verify special code input instantly on 4 characters
    specialCodeInput.addEventListener("input", () => {
        const code = specialCodeInput.value.trim().toUpperCase();
        
        if (code.length === 4) {
            if (!allowedSpecialCodes.includes(code)) {
                showNotification("کد وارد شده صحیح نیست.");
                specialCodeInput.value = "";
                return;
            }

            if (!username) {
                showNotification("ابتدا وارد شوید.");
                specialCodeInput.value = "";
                return;
            }

            let usedCodes = window.usedSpecialCodes || [];
            if (usedCodes.includes(code)) {
                showNotification("شما قبلاً از این کد استفاده کرده‌اید.");
                specialCodeInput.value = "";
                return;
            }

            // Activate special mode
            usedCodes.push(code);
            window.usedSpecialCodes = usedCodes;
            localStorage.setItem(getUsedSpecialCodesKey(username), JSON.stringify(usedCodes));

            activateSpecialModeUI();
            saveUserData();
            specialCodeInput.value = "";
            showNotification("کد ویژه با موفقیت فعال شد.");

            // Start timer for 15 seconds to disable special mode
            if (specialTimer) clearTimeout(specialTimer);
            specialTimer = setTimeout(() => {
                specialActive = false;
                tapImage.src = originalImageSrc;
                showNotification("زمان ویژه به پایان رسید.");
                saveUserData();
            }, 15000);
        }
        resetInputCloseTimer();
    });
	tapImage.addEventListener("contextmenu", (event) => {
    event.preventDefault(); // جلوگیری از نمایش منوی زمینه
});


    // Timer for auto-close input container after 10s inactivity
    function resetInputCloseTimer() {
        if (inputCloseTimer) clearTimeout(inputCloseTimer);
        inputCloseTimer = setTimeout(() => {
            inputContainer.style.display = "none";
        }, 10000);
    }

    // Toggle input-container display when clicking on rank
    rankElement.addEventListener("click", () => {
        if (inputContainer.style.display === "none" || inputContainer.style.display === "") {
            inputContainer.style.display = "block";
            specialCodeInput.focus();
            resetInputCloseTimer();
        } else {
            inputContainer.style.display = "none";
            if(inputCloseTimer) {
                clearTimeout(inputCloseTimer);
                inputCloseTimer = null;
            }
        }
    });

    if (username && bagNumber) {
        loadUserData();
        loginContainer.style.display = "none";
        coinContainer.style.display = "flex";
        updateUI();
    } else {
        points = 0;
        charge = maxCharge;
        lastTime = Date.now();
        loginContainer.style.display = "block";
        coinContainer.style.display = "none";
        updateUI();
    }

    setInterval(autoRecharge, 2000);

    // Prevent right-click and text selection globally
    document.addEventListener("contextmenu", e => e.preventDefault());
    document.addEventListener("selectstart", e => e.preventDefault());
    document.addEventListener("dragstart", e => e.preventDefault());
    document.addEventListener("touchstart", e => {
        if(e.target.tagName.toLowerCase() === 'a') {
            e.preventDefault();
        }
    });
})();

