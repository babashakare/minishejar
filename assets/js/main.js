  (function(){
    const maxCharge = 10000;
    const chargeIncrementPerSecond = 0.5; // 1 charge every 2 seconds

    const pointsDisplay = document.getElementById('pointsDisplay');
    const chargeDisplay = document.getElementById('chargeDisplay');
    const chargeBar = document.getElementById('chargeBar');
    const chargeText = document.getElementById('chargeText');
    const tapImage = document.getElementById('tapImage');
    const withdrawButton = document.getElementById('withdrawButton');

    // Load saved data
    let savedPoints = localStorage.getItem('spousePoints');
    let savedCharge = localStorage.getItem('spouseCharge');
    let lastTimestamp = localStorage.getItem('lastChargeTimestamp');
    let username = localStorage.getItem('username');
    let bagNumber = localStorage.getItem('bagNumber');

    let points = savedPoints !== null ? Number(savedPoints) : 0;
    let charge = savedCharge !== null ? Number(savedCharge) : maxCharge;
    let lastTime = lastTimestamp !== null ? Number(lastTimestamp) : Date.now();

    // Prompt for username and bag number if not set
    if (!username || !bagNumber) {
      username = prompt("لطفا یوزر نیم خود را وارد کنید:");
      bagNumber = prompt("لطفا بج نامبر خود را وارد کنید:");
      localStorage.setItem('username', username);
      localStorage.setItem('bagNumber', bagNumber);
    }

    function updateUI() {
      pointsDisplay.textContent = points.toLocaleString('fa-IR');
      chargeDisplay.textContent = charge.toLocaleString('fa-IR');
      let chargePercent = Math.floor((charge / maxCharge) * 100);
      chargeBar.style.width = chargePercent + '%';
      chargeText.textContent = chargePercent + '%';
    }

    function saveState() {
      localStorage.setItem('spousePoints', points);
      localStorage.setItem('spouseCharge', charge);
      localStorage.setItem('lastChargeTimestamp', Date.now());
    }

    // Calculate elapsed time to auto recharge
    function autoRecharge() {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTime) / 1000);
      if (elapsedSeconds > 0) {
        charge = Math.min(maxCharge, charge + elapsedSeconds * chargeIncrementPerSecond);
        lastTime += elapsedSeconds * 1000; // move lastTime forward
        saveState();
        updateUI();
      }
    }

    // Handle tap image clicked
    tapImage.addEventListener('click', () => {
      if (charge > 0) {
        points += 1;
        charge -= 1;
        saveState();
        updateUI();
      }
    });

    // Handle withdraw button clicked
    withdrawButton.addEventListener('click', () => {
      if (points >= 100) {
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScSl360FctxiHqMRNgdDKMmdXAPpGwWhA5X8Nex48voaFQd6g/formResponse";
        const formData = new FormData();
        formData.append("entry.80941820", username);
        formData.append("entry.429278502", bagNumber);
        formData.append("entry.1807600735", points);

        fetch(formUrl, {
          method: 'POST',
          body: formData,
          mode: 'no-cors' // Add this line to allow cross-origin requests
        }).then(response => {
          points = 0; // Reset points after successful submission
          saveState(); // Save the updated state to localStorage
          updateUI();
          alert("برداشت با موفقیت انجام شد!");
        }).catch(error => {
          alert("خطا در ارسال اطلاعات. لطفا دوباره تلاش کنید.");
          console.error("Error:", error);
        });
      } else {
        alert("شما به اندازه کافی امتیاز برای برداشت ندارید.");
      }
    });

    // Periodic recharge interval every 2 seconds
    setInterval(() => {
      autoRecharge();
    }, 2000);

    // On load, do initial auto recharge calculation and update UI
    autoRecharge();
    updateUI();

  })();