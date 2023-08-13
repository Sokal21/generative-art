let total = 1;

document.getElementById("start_mic")?.addEventListener("click", () => {
    total++;
    console.log(total);

    localStorage.setItem('message', JSON.stringify({
        total,
    }));
}, true);