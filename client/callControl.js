document.querySelector(".history").onclick = function () {
  if (document.querySelector(".historyPanel").style.display === "none") {
    document.querySelector(".historyPanel").style.display = "block"
  }

  else {
    document.querySelector(".historyPanel").style.display = "none"
  }
};