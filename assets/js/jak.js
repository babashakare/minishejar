(function () {
  const maxCharge = 10000;
  const chargeIncrementPerSecond = 0.5;
  const autoClickThresholdMs = 80;
  const maxAutoMinePoints = 15000;

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
  const productMenu = document.getElementById("productMenu");
  const earnButton = document.getElementById("earnButton");
  const overlay = document.getElementById("overlay");

  // Keys for localStorage
  function getPointsKey(name) { return `spousePoints_${name}`; }
  function getChargeKey(name) { return `spouseCharge_${name}`; }
  function getLastTimeKey(name) { return `lastChargeTimestamp_${name}`; }
  function getPenaltyStartKey(name) { return `penaltyStart_${name}`; }
  function getPatternActivatedKey(name) { return `patternActivated_${name}`; }
  function getUsedSpecialCodesKey(name) { return `usedSpecialCodes_${name}`; }
  function getAutoMineStartKey(name) { return `autoMineStart_${name}`; }
  function getAutoMineUsedPointsKey(name) { return `autoMineUsedPoints_${name}`; }
  function getChancePurchaseKey(name) { return `chanceProductPurchase_${name}`; }

  // State variables
  let username = localStorage.getItem("username");
  let bagNumber = localStorage.getItem("bagNumber");
  let points = 0;
  let charge = maxCharge;
  let lastTime = Date.now();
  let lastClickTime = 0;
  let specialActive = false;
  let specialTimer = null;
  let inputCloseTimer = null;

  const originalImageSrc = "https://shekarcity.ir/shtn.png";
  const alternateImageSrc = "https://shekarcity.ir/shtn2.png";

  const allowedSpecialCodes = ["SHOK","MODA","Godd"];
  const autoMineRatePerSecond = 0.5;

  // Chance Box elements
  const chanceBox = document.getElementById("chanceBox");
  const cardsContainer = chanceBox.querySelector(".cards-container");
  const closeChanceBoxButton = document.getElementById("closeChanceBox");

  // Cards data with weights for probabilities
  // 3 zero cards with higher weight, 2 medium cards, 1 rare high-value card
  const cardsWithWeights = [
    { reward: 0, weight: 4 },
    { reward: 0, weight: 4 },
    { reward: 0, weight: 4 },
    { reward: 15000, weight: 3 },
    { reward: 30000, weight: 3 },
    { reward: 100000, weight: 1 }
  ];

  // Shuffle array utility
  function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }

  // Select one reward by weighted random and get index
  function weightedRandomWithIndex(cards) {
    const totalWeight = cards.reduce((sum, card) => sum + card.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (let i = 0; i < cards.length; i++) {
      if (randomNum < cards[i].weight) {
        return {reward: cards[i].reward, index: i};
      }
      randomNum -= cards[i].weight;
    }
    return {reward: 0, index: 0}; 
  }

  function loadUserData() {
    if (!username) return;
    let savedPoints = localStorage.getItem(getPointsKey(username));
    let savedCharge = localStorage.getItem(getChargeKey(username));
    let savedLastTimestamp = localStorage.getItem(getLastTimeKey(username));
    let patternActivated = localStorage.getItem(getPatternActivatedKey(username)) === 'true';
    let usedCodesStr = localStorage.getItem(getUsedSpecialCodesKey(username));
    window.usedSpecialCodes = usedCodesStr ? JSON.parse(usedCodesStr) : [];

    points = savedPoints !== null ? Number(savedPoints) : 0;
    charge = savedCharge !== null ? Number(savedCharge) : maxCharge;
    lastTime = savedLastTimestamp !== null ? Number(savedLastTimestamp) : Date.now();

    // بررسی انقضای حالت ویژه و بارگذاری آن فقط اگر فعال باشد و هنوز منقضی نشده باشد
    const specialModeExpiration = localStorage.getItem(`specialModeExpiration_${username}`);
    if (patternActivated && specialModeExpiration && Date.now() < Number(specialModeExpiration)) {
      activateSpecialModeUI(false);
      specialActive = true;
    } else {
      specialActive = false;
      tapImage.src = originalImageSrc;
      localStorage.removeItem(`specialModeExpiration_${username}`);
    }

    // بررسی شروع ماین اتوماتیک بعد از ۳ ساعت
    if (localStorage.getItem(getAutoMineStartKey(username))) {
      const autoMineStartTime = Number(localStorage.getItem(getAutoMineStartKey(username)));
      const now = Date.now();
      const offlineSeconds = Math.floor((now - autoMineStartTime) / 1000);
      if (offlineSeconds >= 10800) { // 3 ساعت = 10800 ثانیه
        let usedPoints = Number(localStorage.getItem(getAutoMineUsedPointsKey(username))) || 0;
        let pointsToAdd = offlineSeconds * autoMineRatePerSecond;
        let newUsedPoints = usedPoints + pointsToAdd;

        if (newUsedPoints > maxAutoMinePoints) {
          pointsToAdd = maxAutoMinePoints - usedPoints;
          newUsedPoints = maxAutoMinePoints;
          if(pointsToAdd < 0) pointsToAdd = 0;
        }

        if(pointsToAdd > 0){
          addPoints(pointsToAdd);
          showNotification(`ربات ماین اتوماتیک: ${pointsToAdd.toFixed(1)} امتیاز به شما اضافه شد.`);
        }

        localStorage.setItem(getAutoMineUsedPointsKey(username), newUsedPoints);
        localStorage.setItem(getAutoMineStartKey(username), now);
      }
    } else {
      localStorage.setItem(getAutoMineUsedPointsKey(username), 0);
    }

    updateUI();
    updateProductMenuState();
    updateChanceProductState();
  }

  function updateProductMenuState() {
    if (!username) return;
    const autoMineBotKey = getAutoMineStartKey(username);
    const autoMineActive = localStorage.getItem(autoMineBotKey) !== null;
    const productItems = productMenu.querySelectorAll(".product-item");
    productItems.forEach(item => {
      if(item.dataset.productId === "autoMineBot") {
        if(autoMineActive) {
          item.classList.add("disabled");
          item.setAttribute("aria-disabled", "true");
          item.setAttribute("aria-pressed", "true");
          item.style.cursor = "not-allowed";
        } else {
          item.classList.remove("disabled");
          item.removeAttribute("aria-disabled");
          item.setAttribute("aria-pressed", "false");
          item.style.cursor = "pointer";
        }
      }
    });
  }

  // Update product2 disabled state and tooltip based on 24h purchase limit for chance product
  function updateChanceProductState() {
    if (!username) return;
    const lastPurchase = localStorage.getItem(getChancePurchaseKey(username));
    const product2 = productMenu.querySelector('[data-product-id="product2"]');
    const now = Date.now();
    if (lastPurchase && now - parseInt(lastPurchase) < 24 * 60 * 60 * 1000) {
      product2.classList.add("disabled");
      product2.setAttribute("aria-disabled", "true");
      product2.setAttribute("aria-pressed", "true");
      product2.style.cursor = "not-allowed";
      product2.title = "شما تا ۲۴ ساعت آینده قادر به خرید این محصول نیستید.";
    } else {
      product2.classList.remove("disabled");
      product2.removeAttribute("aria-disabled");
      product2.setAttribute("aria-pressed", "false");
      product2.style.cursor = "pointer";
      product2.title = "خرید بخت آزمایی";
    }
  }

  function saveUserData() {
    if (!username) return;
    localStorage.setItem(getPointsKey(username), points);
    localStorage.setItem(getChargeKey(username), charge);
    localStorage.setItem(getLastTimeKey(username), lastTime);
    localStorage.setItem(getPatternActivatedKey(username), specialActive ? 'true' : 'false');
    localStorage.setItem(getUsedSpecialCodesKey(username), JSON.stringify(window.usedSpecialCodes || []));
    localStorage.setItem("username", username);
    localStorage.setItem("bagNumber", bagNumber);
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

  function addPoints(amountPoints) {
    points += amountPoints;
    saveUserData();
    updateUI();
  }

  function deductPoints(amountPoints) {
    if (points >= amountPoints) {
      points -= amountPoints;
      saveUserData();
      updateUI();
      return true;
    }
    return false;
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
      showNotification("حداقل برداشت 100.000 پوینت است");
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
    updateProductMenuState();
    updateChanceProductState();
  });

  let notificationTimeout = null;
  function showNotification(message) {
    notificationMessage.textContent = message;
    notificationMessage.classList.add("show");
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
      notificationMessage.classList.remove("show");
    }, 8000);
  }

  // تغییر تابع activateSpecialModeUI برای ذخیره زمان انقضا در localStorage
  function activateSpecialModeUI(setTimer = true) {
    tapImage.src = alternateImageSrc;
    specialActive = true;
    const expirationTime = Date.now() + 15000; // 15 ثانیه

    localStorage.setItem(`specialModeExpiration_${username}`, expirationTime);

    if (setTimer) {
      if (specialTimer) clearTimeout(specialTimer);
      specialTimer = setTimeout(() => {
        specialActive = false;
        tapImage.src = originalImageSrc;
        showNotification("زمان ویژه به پایان رسید.");
        localStorage.removeItem(`specialModeExpiration_${username}`);
        saveUserData();
      }, 15000);
    }
  }

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
      usedCodes.push(code);
      window.usedSpecialCodes = usedCodes;
      localStorage.setItem(getUsedSpecialCodesKey(username), JSON.stringify(usedCodes));
      activateSpecialModeUI();
      saveUserData();
      specialCodeInput.value = "";
      showNotification("کد ویژه با موفقیت فعال شد.");
    }
    resetInputCloseTimer();
  });

  tapImage.addEventListener("contextmenu", (event) => event.preventDefault());

  function resetInputCloseTimer() {
    if (inputCloseTimer) clearTimeout(inputCloseTimer);
    inputCloseTimer = setTimeout(() => {
      inputContainer.style.display = "none";
    }, 10000);
  }

  rankElement.addEventListener("click", () => {
    if (inputContainer.style.display === "none" || inputContainer.style.display === "") {
      inputContainer.style.display = "block";
      specialCodeInput.focus();
      resetInputCloseTimer();
    } else {
      inputContainer.style.display = "none";
      if (inputCloseTimer) {
        clearTimeout(inputCloseTimer);
        inputCloseTimer = null;
      }
    }
  });

  let chanceOpened = false; // to allow one card reveal per purchase

productMenu.addEventListener("click", (event) => {
    const productItem = event.target.closest(".product-item");
    if (!productItem) return;
    if (!username || !bagNumber) {
      showNotification("لطفا ابتدا وارد شوید");
      return;
    }
    if (productItem.classList.contains("disabled")) {
      // تغییر پیام فقط برای ربات ماینر
      if (productItem.dataset.productId === "autoMineBot") {
        showNotification("شما قبلا این محصول را خریداری کرده‌اید.");
      } else {
        showNotification("شما در ۲۴ ساعت آینده قادر به خرید این محصول نیستید.");
      }
      return;
    }
    const price = Number(productItem.dataset.price);
    const productId = productItem.dataset.productId;

    if (points < price) {
      showNotification("شما به اندازه کافی امتیاز برای خرید این محصول ندارید.");
      return;
    }

    if (productId === "product2") {
      localStorage.setItem(getChancePurchaseKey(username), Date.now().toString());
      if (!deductPoints(price)) {
        showNotification("امتیاز کافی برای خرید بخت آزمایی وجود ندارد.");
        return;
      }
      toggleProductMenu();
      showChanceBox(); // نمایش کارت‌ها فقط پس از خرید
      showNotification("محصول بخت آزمایی با موفقیت خریداری شد.");
      updateChanceProductState();
    } else if (productId === "autoMineBot") {
      if (localStorage.getItem(getAutoMineStartKey(username))) {
        showNotification("شما قبلا ربات ماین اتوماتیک را فعال کرده‌اید.");
        return;
      }
      if (deductPoints(price)) {
        localStorage.setItem(getAutoMineStartKey(username), Date.now());
        localStorage.setItem(getAutoMineUsedPointsKey(username), 0);
        showNotification("ربات ماین خریداری شد.");
        updateProductMenuState();
      }
    } else {
      if (deductPoints(price)) {
        showNotification(`محصول ${productId} با موفقیت خریداری شد.`);
      }
    }
});


  // --- تغییرات بخش کارت شانسی ---

  // نمایش پنجره بخت آزمایی با صندوق‌های درخشان
  function showChanceBox() {
    cardsContainer.innerHTML = '';
    chanceBox.classList.add("glow-box"); // تابش کل پنجره
    chanceBox.style.display = 'block';

    const cardElements = [];
    let indexes = [0,1,2,3,4,5];
    indexes = shuffle(indexes);

    for (let i = 0; i < 6; i++) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card glowing-box'; 
      cardEl.tabIndex = 0;
      cardEl.setAttribute('aria-label', 'صندوق بخت آزمایی. کلیک کنید برای باز کردن');
      cardEl.textContent = '?';
      cardEl.dataset.cardIndex = indexes[i];
      cardEl.dataset.reward = cardsWithWeights[indexes[i]].reward;
      cardsContainer.appendChild(cardEl);
      cardElements.push(cardEl);
    }

    cardElements.forEach(cardEl => {
      cardEl.addEventListener('click', () => revealCard(cardEl, cardElements));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          revealCard(cardEl, cardElements);
        }
      });
    });

    chanceOpened = false;
  }

  // انیمیشن نمایش امتیاز بالارونده از داخل صندوق
  function animateRewardPoints(cardEl, reward) {
    const pointsDisplay = document.createElement('span');
    pointsDisplay.className = 'reward-points';
    pointsDisplay.textContent = `+${reward.toLocaleString('fa-IR')}`;

    pointsDisplay.style.position = 'absolute';
    pointsDisplay.style.left = '50%';
    pointsDisplay.style.top = '50%';
    pointsDisplay.style.transform = 'translate(-50%, -50%)';
    pointsDisplay.style.color = '#FFD700';
    pointsDisplay.style.fontWeight = 'bold';
    pointsDisplay.style.fontSize = '1.5rem';
    pointsDisplay.style.textShadow = '0 0 10px #ffd700';
    pointsDisplay.style.pointerEvents = 'none';

    cardEl.style.position = 'relative';
    cardEl.appendChild(pointsDisplay);

    pointsDisplay.animate([
      { transform: 'translate(-50%, -50%)', opacity: 1 },
      { transform: 'translate(-50%, -120%)', opacity: 0 }
    ], {
      duration: 1500,
      easing: 'ease-out',
      fill: 'forwards'
    });

    setTimeout(() => {
      pointsDisplay.remove();
    }, 1500);
  }

  // بازکردن کارت انتخاب‌شده و سپس بازکردن خودکار بقیه کارت‌ها
  function revealCard(cardEl, allCards) {
    if (chanceOpened) return;
    chanceOpened = true;

    const idx = parseInt(cardEl.dataset.cardIndex);
    const reward = cardsWithWeights[idx].reward;

    cardEl.classList.add('revealed');
    cardEl.textContent = reward > 0 ? reward.toLocaleString('fa-IR') : '۰';

    if(reward > 0) {
      animateRewardPoints(cardEl, reward);
      addPoints(reward);
      showNotification(`شما ${reward.toLocaleString('fa-IR')} امتیاز دریافت کردید!`);
    }

    allCards.forEach(card => {
      if(card !== cardEl) {
        const r = Number(card.dataset.reward);
        card.classList.add('revealed');
        card.textContent = r > 0 ? r.toLocaleString('fa-IR') : '۰';
      }
      card.style.pointerEvents = 'none';
    });

    setTimeout(() => {
      closeChanceBox();
    }, 3000);
  }

  function closeChanceBox() {
    chanceBox.style.display = 'none';
    chanceBox.classList.remove("glow-box");
    chanceOpened = false;
  }

  // --- پایان تغییرات بخش کارت شانسی ---

  function toggleProductMenu() {
    const isVisible = productMenu.classList.contains('show');
    if (isVisible) {
      productMenu.classList.remove('show');
      overlay.classList.remove('show');
      earnButton.setAttribute('aria-expanded', 'false');
      productMenu.setAttribute('aria-hidden', 'true');
      productMenu.blur();
    } else {
      productMenu.classList.add('show');
      overlay.classList.add('show');
      earnButton.setAttribute('aria-expanded', 'true');
      productMenu.setAttribute('aria-hidden', 'false');
      productMenu.focus();
    }
  }

  earnButton.addEventListener('click', (e) => {
    e.preventDefault();
    toggleProductMenu();
  });

  overlay.addEventListener('click', () => {
    toggleProductMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && productMenu.classList.contains('show')) {
      toggleProductMenu();
    }
  });

  // Initialization
  if (username && bagNumber) {
    loadUserData();
    loginContainer.style.display = "none";
    coinContainer.style.display = "flex";
    updateUI();
    updateProductMenuState();
    updateChanceProductState();
  }
  else {
    points = 0;
    charge = maxCharge;
    lastTime = Date.now();
    loginContainer.style.display = "block";
    coinContainer.style.display = "none";
    updateUI();
  }

  setInterval(autoRecharge, 2000);

  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("selectstart", e => e.preventDefault());
  document.addEventListener("dragstart", e => e.preventDefault());
  document.addEventListener("touchstart", e => {
    if (e.target.tagName.toLowerCase() === 'a') {
      e.preventDefault();
    }
  });

  closeChanceBoxButton.addEventListener('click', () => {
    closeChanceBox();
  });

})();

