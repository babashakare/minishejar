(function () {
    function loadUserData() {
        const username = localStorage.getItem("username");
        const bagNumber = localStorage.getItem("bagNumber");
        return { username, bagNumber };
    }

    function displayTotalPoints() {
        const { username, bagNumber } = loadUserData();
        const container = document.getElementById("totalPointsContainer");
        if (!username || !bagNumber) {
            container.textContent = "اطلاعات برداشت یافت نشد";
            return;
        }

        fetch("https://raw.githubusercontent.com/babashakare/minishejar/refs/heads/main/data/profile")
            .then(response => response.text())
            .then(data => {
                const lines = data.split('\n');
                let totalPoints = null;

                for (const line of lines) {
                    if (line.includes(`name="${username}"`) && line.includes(`bag="${bagNumber}"`)) {
                        const match = line.match(/point="(\d+)"/);
                        if (match) {
                            totalPoints = match[1];
                            break;
                        }
                    }
                }

                if (totalPoints !== null) {
                    container.textContent = `${Number(totalPoints).toLocaleString("fa-IR")}`;
                } else {
                    container.textContent = "بدون برداشت";
                }
            })
            .catch(() => {
                container.textContent = "خطای سرور لطفا با پشتیبانی تماس بگیرید";
            });
    }

    // بروزرسانی هر 10 ثانیه
    displayTotalPoints();
    setInterval(displayTotalPoints, 10000);
})();