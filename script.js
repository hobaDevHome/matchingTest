
// $2a$10$XXPeQanoTgpiP6IrPAdKvueszgV16yjlbS.YrDac9rfSzr7bCy492
// script.js (updated with entrance & restart animations)
const termsContainer = document.getElementById("terms");
const defsContainer = document.getElementById("definitions");
const svg = document.getElementById("lines");
const restartBtn = document.getElementById("restart");
const resultBox = document.getElementById("result");

// === DATA ===
let pairs = [];


let selectedTerm = null;
let matches = 0;
let lines = [];


// === INIT ===
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    pairs = data.pairs;
     if (data.background) {
      document.body.style.backgroundImage = `url(${data.background})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.transition = "background 0.6s ease-in-out";
    }
    initGame();
    animateEntrance();
  })
  .catch(err => console.error("Error loading data:", err));




restartBtn.addEventListener("click", handleRestart);

function initGame() {
  termsContainer.innerHTML = "";
  defsContainer.innerHTML = "";
  svg.innerHTML = "";
  resultBox.textContent = "";
  matches = 0;
  lines = [];
  selectedTerm = null;

  const shuffledDefs = shuffle([...pairs]);

  pairs.forEach((p, i) => {
    const termDiv = document.createElement("div");
    termDiv.className = "item";
    termDiv.textContent = p.term;
    termDiv.dataset.index = i;
    termsContainer.appendChild(termDiv);

    const defDiv = document.createElement("div");
    defDiv.className = "item";
    defDiv.textContent = shuffledDefs[i].def;
    defDiv.dataset.match = pairs.findIndex(x => x.def === shuffledDefs[i].def);
    defsContainer.appendChild(defDiv);
  });

  // attach listeners
  document.querySelectorAll("#terms .item").forEach(el =>
    el.addEventListener("click", () => selectTerm(el))
  );

  document.querySelectorAll("#definitions .item").forEach(el =>
    el.addEventListener("click", () => selectDefinition(el))
  );
}

// ----------------- Selection & Matching -----------------
function selectTerm(el) {
  if (el.classList.contains("matched")) return;
  document.querySelectorAll("#terms .item").forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");
  selectedTerm = el;
}

function selectDefinition(defEl) {
  if (!selectedTerm || defEl.classList.contains("matched")) return;

  const termIndex = selectedTerm.dataset.index;
  const defMatch = defEl.dataset.match;

  const correct = termIndex === defMatch;

  drawLine(selectedTerm, defEl, correct);

  if (correct) {
    selectedTerm.classList.add("matched");
    defEl.classList.add("matched");

    // animate matched color & small pop
    gsap.to([selectedTerm, defEl], {
      backgroundColor: "#00ff99",
      duration: 0.25
    });
    gsap.fromTo([selectedTerm, defEl],
      { scale: 1.05 },
      { scale: 1, duration: 0.35, ease: "elastic.out(1, 0.5)" }
    );

    matches++;
    if (matches === pairs.length) showWin();

  } else {
    // wrong: flash red then revert
    const termToUnselect = selectedTerm; // keep reference
    gsap.to([termToUnselect, defEl], {
      backgroundColor: "#ff3333",
      duration: 0.25,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // revert selected state safely
        if (termToUnselect) termToUnselect.classList.remove("selected");
      }
    });
  }

  // clear selection state
  selectedTerm = null;
}


// ----------------- Line Drawing -----------------
function drawLine(termEl, defEl, correct) {
  const termRect = termEl.getBoundingClientRect();
  const defRect = defEl.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();

  const x1 = termRect.right - svgRect.left;
  const y1 = termRect.top + termRect.height / 2 - svgRect.top;
  const x2 = defRect.left - svgRect.left;
  const y2 = defRect.top + defRect.height / 2 - svgRect.top;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x1);
  line.setAttribute("y2", y1);
  line.setAttribute("stroke", correct ? "#00ff99" : "#ff3333");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("stroke-linecap", "round");
  line.style.opacity = "1";
  svg.appendChild(line);

  gsap.to(line, {
    attr: { x2, y2 },
    duration: 0.45,
    ease: "power2.inOut",
    onComplete: () => {
      if (!correct) {
        // fade out wrong line after short delay
        gsap.to(line, { opacity: 0, duration: 0.45, delay: 0.45, onComplete: () => line.remove() });
      }
    }
  });

  lines.push(line);
}

// ----------------- Win -----------------
function showWin() {
  resultBox.textContent = "🎉 Great job! You matched all correctly!";
  gsap.fromTo(resultBox, { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(1.7)" });
  // gentle celebration on items
  gsap.to(".item.matched", {
    y: -6,
    repeat: 3,
    yoyo: true,
    stagger: 0.08,
    duration: 0.18,
    ease: "power1.inOut"
  });
}

// ----------------- Entrance Animation -----------------
function animateEntrance() {
  // ensure svg sizing recalculated (in case of viewport changes)
  requestAnimationFrame(() => {
    // initial state
    gsap.set(".item", { opacity: 0, y: 20, scale: 0.98 });
    gsap.set(svg, { opacity: 1 });

    // animate left column then right column with stagger
    const leftItems = Array.from(document.querySelectorAll("#terms .item"));
    const rightItems = Array.from(document.querySelectorAll("#definitions .item"));

    const tl = gsap.timeline();
    tl.to(leftItems, { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.45, ease: "back.out(1.4)" }, 0);
    tl.to(rightItems, { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.45, ease: "back.out(1.4)" }, 0.12);

    // subtle pop of container
    tl.fromTo(".game-container", { scale: 0.995 }, { scale: 1, duration: 0.5, ease: "power2.out" }, 0);
  });
}

// ----------------- Restart Animation & Handler -----------------
function handleRestart() {
  // disable button during animation
  restartBtn.disabled = true;

  // animate existing lines and items out
  const outTl = gsap.timeline({
    onComplete: () => {
      // clear DOM & re-init game
      initGame();
      // slight delay then play entrance
      requestAnimationFrame(() => {
        animateEntrance();
        // re-enable restart when entrance done (give small timeout)
        setTimeout(() => restartBtn.disabled = false, 700);
      });
    }
  });

  // animate lines: fade & contract
  if (lines.length) {
    lines.forEach(line => {
      outTl.to(line, { opacity: 0, duration: 0.25 }, 0);
    });
  }

  // animate items out (shrink & fade)
  outTl.to(".item", {
    opacity: 0,
    y: -12,
    scale: 0.98,
    duration: 0.28,
    stagger: 0.03,
    ease: "power1.in"
  }, 0);

  // small shake of restart button to indicate action
  outTl.fromTo(restartBtn, { scale: 0.98 }, { scale: 1, duration: 0.18, ease: "elastic.out(1,0.6)" }, 0.12);
}

// ----------------- Utility -----------------
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
