    (function () {
        const maxCharge = 10000;
        const chargeIncrementPerSecond = 0.5; // 1 charge every 2 seconds
        const autoClickThresholdMs = 100; // حد سرعت کلیک کمتر از 50 میلی‌ثانیه برای هشدار اتوکلیکر
        const rankTimerEndKey = (username) => `rankTimerEnd_${username}`; // localStorage key for timer end timestamp

        const pointsDisplay = document.getElementById("pointsDisplay");
        const chargeDisplay = document.getElementById("chargeDisplay");
        const tapImage = document.getElementById("tapImage");
        const boostWithdrawButton = document.getElementById("boostWithdrawButton");
        const loginForm = document.getElementById("loginForm");
        const loginContainer = document.getElementById("loginContainer");
        const coinContainer = document.getElementById("coinContainer");
        const rankTimer = document.getElementById("rank-timer");

        // Load saved data for user
        let username = localStorage.getItem("username");
        let bagNumber = localStorage.getItem("bagNumber");

        // Keys for per-user storage
        function getPointsKey(name) { return `spousePoints_${name}`; }
        function getChargeKey(name) { return `spouseCharge_${name}`; }
        function getLastTimeKey(name) { return `lastChargeTimestamp_${name}`; }
        function getPenaltyStartKey(name) { return `penaltyStart_${name}`; }
        function getPatternActivatedKey(name) { return `patternActivated_${name}`; }

        // Default values
        let points = 0;
        let charge = maxCharge;
        let lastTime = Date.now();
        let lastClickTime = 0;

        let tapState = {
            tapsCount: 0,
            patternIndex: 0,
            lastTapTime: 0,
            pauseTimeout: null,
            patternCompleted: false,
            timerInterval: null,
            rankTimerSeconds: 60,
            inAlternateState: false,
            patternUsed: false,
            rankTimerEndTimestamp: null, // timestamp when timer ends
        };

        const originalImageSrc = "assets/images/shtn.png";
        const alternateImageSrc = "assets/images/shtn2.png";

        function loadUserData() {
            if (username) {
                let savedPoints = localStorage.getItem(getPointsKey(username));
                let savedCharge = localStorage.getItem(getChargeKey(username));
                let savedLastTimestamp = localStorage.getItem(getLastTimeKey(username));
                let patternActivated = localStorage.getItem(getPatternActivatedKey(username)) === 'true';

                points = savedPoints !== null ? Number(savedPoints) : 0;
                charge = savedCharge !== null ? Number(savedCharge) : maxCharge;
                lastTime = savedLastTimestamp !== null ? Number(savedLastTimestamp) : Date.now();
                tapState.patternUsed = patternActivated;

                if (tapState.patternUsed) {
                    tapState.inAlternateState = true;
                    tapImage.src = alternateImageSrc;

                    // Load timer end from storage
                    const savedTimerEnd = localStorage.getItem(rankTimerEndKey(username));
                    if (savedTimerEnd) {
                        const now = Date.now();
                        const timeLeftMs = Number(savedTimerEnd) - now;
                        if (timeLeftMs > 0) {
                            const secondsLeft = Math.ceil(timeLeftMs / 1000);
                            startRankTimer(secondsLeft);
                        } else {
                            // Timer expired
                            stopRankTimerResetImage();
                        }
                    } else {
                        // No saved timer, start fresh 60s timer
                        startRankTimer(60);
                    }
                }
            } else {
                points = 0;
                charge = maxCharge;
                lastTime = Date.now();
            }
        }

        function saveUserData() {
            if (username) {
                localStorage.setItem(getPointsKey(username), points);
                localStorage.setItem(getChargeKey(username), charge);
                localStorage.setItem(getLastTimeKey(username), lastTime);
                localStorage.setItem("username", username);
                localStorage.setItem("bagNumber", bagNumber);
                localStorage.setItem(getPatternActivatedKey(username), tapState.patternUsed ? 'true' : 'false');
            }
        }

        function updateUI() {
            pointsDisplay.textContent = points.toLocaleString("fa-IR");
            chargeDisplay.textContent = charge.toLocaleString("fa-IR");
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

        // Start rank timer with optional initial seconds (default 60)
        function startRankTimer(initialSeconds = 60) {
            tapState.rankTimerSeconds = initialSeconds;
            rankTimer.textContent = formatTime(tapState.rankTimerSeconds);
            rankTimer.style.display = "block";

            if (tapState.timerInterval) {
                clearInterval(tapState.timerInterval);
            }

            const endTimestamp = Date.now() + tapState.rankTimerSeconds * 1000;
            tapState.rankTimerEndTimestamp = endTimestamp;
            localStorage.setItem(rankTimerEndKey(username), endTimestamp.toString());

            tapState.timerInterval = setInterval(() => {
                const now = Date.now();
                const timeLeftMs = tapState.rankTimerEndTimestamp - now;
                if (timeLeftMs <= 0) {
                    stopRankTimerResetImage();
                } else {
                    const secondsLeft = Math.ceil(timeLeftMs / 1000);
                    tapState.rankTimerSeconds = secondsLeft;
                    rankTimer.textContent = formatTime(secondsLeft);
                }
            }, 500);
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `00:${s < 10 ? "0" + s : s}`;
        }

        function stopRankTimerResetImage() {
            if (tapState.timerInterval) {
                clearInterval(tapState.timerInterval);
                tapState.timerInterval = null;
            }
            rankTimer.style.display = "none";
            tapState.inAlternateState = false;
            tapImage.src = originalImageSrc;
            tapState.patternCompleted = false;
            tapState.rankTimerEndTimestamp = null;
            localStorage.removeItem(rankTimerEndKey(username));
            resetTapPattern();
            updateUI();
        }

        function resetTapPattern() {
            tapState.tapsCount = 0;
            tapState.patternIndex = 0;
            if (tapState.pauseTimeout) {
                clearTimeout(tapState.pauseTimeout);
                tapState.pauseTimeout = null;
            }
        }

        function handleTapPattern(clickTime) {
            // If pattern already used, do nothing
            if (tapState.patternUsed) return;

            if (tapState.patternCompleted) {
                tapState.inAlternateState = true;
                return;
            }

            const maxIntervalBetweenTaps = 600;
            const requiredPauseDuration = 900;

            switch (tapState.patternIndex) {
                case 0:
                    if (tapState.tapsCount === 0 || (clickTime - tapState.lastTapTime) <= maxIntervalBetweenTaps) {
                        tapState.tapsCount++;
                        if (tapState.tapsCount === 3) {
                            tapState.patternIndex = 1;
                            tapState.pauseTimeout = setTimeout(() => {
                                tapState.patternIndex = 2;
                                tapState.tapsCount = 0;
                            }, requiredPauseDuration);
                        }
                    } else {
                        resetTapPattern();
                        tapState.tapsCount = 1;
                    }
                    break;
                case 1:
                    resetTapPattern();
                    tapState.tapsCount = 1;
                    tapState.patternIndex = 0;
                    break;
                case 2:
                    if (tapState.tapsCount === 0 || (clickTime - tapState.lastTapTime) <= maxIntervalBetweenTaps) {
                        tapState.tapsCount++;
                        if (tapState.tapsCount === 4) {
                            tapState.patternIndex = 3;
                            tapState.pauseTimeout = setTimeout(() => {
                                tapState.patternCompleted = true;
                                tapState.inAlternateState = true;
                                tapState.pauseTimeout = null;
                                tapState.patternUsed = true;
                                localStorage.setItem(getPatternActivatedKey(username), 'true');
                                tapImage.src = alternateImageSrc;
                                startRankTimer();
                                updateUI();
                            }, requiredPauseDuration);
                        }
                    } else {
                        resetTapPattern();
                        tapState.tapsCount = 1;
                        tapState.patternIndex = 0;
                    }
                    break;
                case 3:
                    resetTapPattern();
                    tapState.tapsCount = 1;
                    tapState.patternIndex = 0;
                    break;
            }

            tapState.lastTapTime = clickTime;
        }

        // Adjusted addPoints: always reduces charge by 1 per click
        // In alternate state adds 5 points, else adds 1 point
        function addPointsOnClick(amountPoints) {
            if (charge > 0) {
                charge -= 1; // always subtract 1 charge per click
                points += amountPoints;
                saveUserData();
                updateUI();

                tapImage.classList.add("shake");
                setTimeout(() => {
                    tapImage.classList.remove("shake");
                }, 500);
            }
        }

        tapImage.addEventListener("click", (event) => {
            if (!username || !bagNumber) {
                alert("لطفا ابتدا وارد شوید");
                return;
            }

            const now = Date.now();
            const timeSinceLastClick = now - lastClickTime;

            let penaltyStart = Number(localStorage.getItem(getPenaltyStartKey(username))) || 0;

            if (!tapState.inAlternateState) {
                if (timeSinceLastClick < autoClickThresholdMs) {
                    if (!penaltyStart || now - penaltyStart > 60000) {
                        alert("سیستم تشخصی اتوکلیکر داد! در صورت استفاده مجدد امتیاز شما صفر میشود");
                        localStorage.setItem(getPenaltyStartKey(username), now);
                    } else {
                        points = 0;
                        charge = maxCharge;
                        saveUserData();
                        alert("مجازات شدید! امتیاز شما صفر شد.");
                        localStorage.removeItem(getPenaltyStartKey(username));
                        updateUI();
                        lastClickTime = now;
                        return;
                    }
                }

                lastClickTime = now;

                addPointsOnClick(1);

                // نمایش +1 انیمیشنی در محل کلیک
                const plusOne = document.createElement("span");
                plusOne.textContent = "+1";
                plusOne.className = "points-plus";

                const rect = coinContainer.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                plusOne.style.left = `${x}px`;
                plusOne.style.top = `${y}px`;

                coinContainer.appendChild(plusOne);

                setTimeout(() => {
                    if (plusOne.parentNode) {
                        plusOne.parentNode.removeChild(plusOne);
                    }
                }, 1000);

                // Handle tap pattern detection for unlocking alternate image
                handleTapPattern(now);

            } else {
                // Alternate state (pattern used)
                addPointsOnClick(3);

                // نمایش +5 انیمیشنی در محل کلیک
                const plusFive = document.createElement("span");
                plusFive.textContent = "+3";
                plusFive.className = "points-plus";

                const rect = coinContainer.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                plusFive.style.left = `${x}px`;
                plusFive.style.top = `${y}px`;

                coinContainer.appendChild(plusFive);

                setTimeout(() => {
                    if (plusFive.parentNode) {
                        plusFive.parentNode.removeChild(plusFive);
                    }
                }, 1000);
            }
        });

        boostWithdrawButton.addEventListener("click", () => {
            if (!username || !bagNumber) {
                alert("لطفا ابتدا وارد شوید");
                return;
            }
            if (points >= 100) {
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
                    alert("برداشت با موفقیت انجام شد!");
                })
                .catch((error) => {
                    alert("خطا در ارسال اطلاعات. لطفا دوباره تلاش کنید.");
                    console.error("Error:", error);
                });
            } else {
                alert("شما به اندازه کافی امتیاز برای برداشت ندارید.");
            }
        });

        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            username = document.getElementById("username").value.trim();
            bagNumber = document.getElementById("bagNumber").value.trim();
            if (!username || !bagNumber) {
                alert("لطفاً نام کاربری و شماره کیف پول را وارد کنید.");
                return;
            }
            loadUserData();
            saveUserData();
            loginContainer.style.display = "none";
            coinContainer.style.display = "flex";
            updateUI();
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
    })();