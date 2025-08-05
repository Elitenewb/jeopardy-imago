document.addEventListener("DOMContentLoaded", function () {
  var dropZone = document.getElementById("dropZone");
  var fileInput = document.getElementById("fileInput");
  var lastQuestionValue = 0;
  var totalQuestions = 0; // Count how many non-final questions
  var usedQuestions = 0; // Track how many have been used
  var finalJeopardyQuestion = null; // Store final jeopardy question
  var finalMode = false; // Track if we are in final mode
  var finalEnabled = false; // Indicates if final Jeopardy is unlocked (all Q used) but not started yet.

  // Store team info
  var teamNames = ["Team 1", "Team 2", "Team 3", "Team 4"];
  var teamScores = [0, 0, 0, 0];
  var teamWagers = [0, 0, 0, 0];
  var finalJudgingOrder = []; // Will store teams in ascending order of scores for final reveal

  document
    .getElementById("fullscreenBtn")
    .addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          alert(
            `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
          );
        });
      } else {
        document.exitFullscreen();
      }
    });

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", function (event) {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (event.dataTransfer.files.length) {
      var file = event.dataTransfer.files[0];
      if (file.type === "text/csv") {
        readAndLoadFile(file);
        dropZone.textContent = `Loaded: ${file.name}`;
        dropZone.style.backgroundColor = ""; // Reset background color
      } else {
        dropZone.textContent = "Please upload a valid CSV file.";
        dropZone.style.backgroundColor = "#f8d7da";
      }
    }
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files.length) {
      readAndLoadFile(fileInput.files[0]);
    }
  });

  function readAndLoadFile(file) {
    Papa.parse(file, {
      header: true,
      complete: function (results) {
        // Separate final jeopardy question from normal questions
        let normalQuestions = [];
        results.data.forEach((row) => {
          if (row.category && row.category.toLowerCase() === "final jeopardy") {
            finalJeopardyQuestion = row;
          } else {
            normalQuestions.push(row);
          }
        });

        buildBoard(normalQuestions);
        document.getElementById("dropZone").style.display = "none";

        // Show team name modal
        document.getElementById("teamNameModal").style.display = "block";

        document.getElementById("submitTeamNames").onclick = function () {
          teamNames[0] = document.getElementById("teamName1").value || "Team 1";
          teamNames[1] = document.getElementById("teamName2").value || "Team 2";
          teamNames[2] = document.getElementById("teamName3").value || "Team 3";
          teamNames[3] = document.getElementById("teamName4").value || "Team 4";

          // Update scoreboard display
          var teamSpans = document.querySelectorAll(".teamNameSpan");
          for (var i = 0; i < teamSpans.length; i++) {
            teamSpans[i].textContent = teamNames[i];
          }

          document.getElementById("teamNameModal").style.display = "none";
          document.getElementById("jeopardyBoard").style.display = "grid";
          document.getElementById("scoreBoard").style.display = "flex";
          document.getElementById("fullscreenBtn").style.display = "block";
        };
      },
      error: function (err) {
        console.error("Error parsing CSV: ", err);
      },
    });
  }

  // Function to build the game board with categories and questions
  function buildBoard(questions) {
    const board = document.getElementById("jeopardyBoard");
    board.innerHTML = "";
    const categories = {};

    // Group questions by category and filter out invalid entries
    questions.forEach((question) => {
      if (question.category && question.value && question.question) {
        categories[question.category] = categories[question.category] || [];
        categories[question.category].push(question);
      }
    });

    // Count total questions
    Object.keys(categories).forEach((category) => {
      totalQuestions += categories[category].length;
    });

    // Create sections for each valid category
    Object.keys(categories).forEach((category) => {
      const categoryQuestions = categories[category];
      if (categoryQuestions.length > 0) {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category";

        const header = document.createElement("h2");
        header.textContent = category;
        header.className = "category-header";
        categoryDiv.appendChild(header);

        const questionsDiv = document.createElement("div");
        questionsDiv.className = "questions-container";

        categoryQuestions.forEach((question) => {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.textContent = question.value;
          cell.onclick = () => {
            if (!cell.classList.contains("used") && !finalMode) {
              lastQuestionValue = parseInt(
                question.value.replace(/[^\d]/g, ""),
                10
              );
              document.getElementById("questionText").textContent =
                question.question;
              const questionImage = document.getElementById("questionImage");
              const questionVideo = document.getElementById("questionVideo");

              if (question.image) {
                questionImage.src = question.image;
                questionImage.style.display = "block";
                questionVideo.style.display = "none";
              } else if (question.video) {
                questionImage.style.display = "none";
                questionVideo.src = `https://www.youtube.com/embed/${question.video}`;
                questionVideo.style.display = "block";
              } else {
                questionImage.style.display = "none";
                questionVideo.style.display = "none";
              }

              document.getElementById("questionModal").style.display = "block";
              document.getElementById("questionSound").play();
              cell.classList.add("used");

              // After the question is revealed and presumably answered,
              // we'll increment "usedQuestions" when the user clicks outside
              // or closes the modal (meaning they've moved on).
              // We'll handle that after we close the modal.

              // We'll move the increment of usedQuestions into the modal close event,
              // so that final Jeopardy doesn't trigger right after showing the question.

              modal.dataset.questionUsed = "true"; // We'll use this to know if we should increment when closing
            }
          };
          questionsDiv.appendChild(cell);
        });

        categoryDiv.appendChild(questionsDiv);
        board.appendChild(categoryDiv);
      }
    });
  }

  // Add a button to start final jeopardy when all questions are used
  var startFinalBtn = document.createElement("button");
  startFinalBtn.textContent = "Start Final Jeopardy";
  startFinalBtn.style.display = "none";
  startFinalBtn.style.position = "fixed";
  startFinalBtn.style.top = "50%";
  startFinalBtn.style.left = "50%";
  startFinalBtn.style.transform = "translate(-50%, -50%)";
  startFinalBtn.style.padding = "20px 40px";
  startFinalBtn.style.fontSize = "32px";
  startFinalBtn.style.backgroundColor = "#007bff";
  startFinalBtn.style.color = "#fff";
  startFinalBtn.style.border = "none";
  startFinalBtn.style.borderRadius = "10px";
  startFinalBtn.style.cursor = "pointer";
  startFinalBtn.style.zIndex = "2000";
  document.body.appendChild(startFinalBtn);

  startFinalBtn.onclick = function () {
    if (!finalMode && finalEnabled) {
      finalMode = true;
      showFinalWagerModal();
      startFinalBtn.style.display = "none";
    }
  };

  function checkAllQuestionsUsed() {
    // Called after a question is completely done and closed.
    if (usedQuestions === totalQuestions && !finalMode && !finalEnabled) {
      // All questions have been used, enable final jeopardy start
      finalEnabled = true;
      // Show the "Start Final Jeopardy" button
      startFinalBtn.style.display = "block";
    }
  }

  function showFinalWagerModal() {
    var wagerContainer = document.getElementById("wagerInputs");
    wagerContainer.innerHTML = "";

    // Set the category text
    var finalWagerCategoryElem = document.getElementById("finalWagerCategory");
    if (finalJeopardyQuestion && finalJeopardyQuestion.value) {
      finalWagerCategoryElem.textContent =
        "The category is: " + finalJeopardyQuestion.value;
    } else {
      finalWagerCategoryElem.textContent = "The category is: [Not Available]";
    }

    for (let i = 0; i < 4; i++) {
      let score = parseInt(
        document.getElementById(`score${i + 1}`).textContent
      );
      wagerContainer.innerHTML += `
      <div>
        <label>${teamNames[i]} (Score: ${score}) Wager:</label>
        <input type="number" id="wager${i}" min="0" max="${score}" value="0">
      </div><br/>
    `;
    }
    document.getElementById("finalWagerModal").style.display = "block";
  }

  document.getElementById("submitWagers").onclick = function () {
    for (let i = 0; i < 4; i++) {
      let score = parseInt(
        document.getElementById(`score${i + 1}`).textContent
      );
      let wagerVal = parseInt(document.getElementById(`wager${i}`).value);
      if (isNaN(wagerVal) || wagerVal < 0 || wagerVal > score) {
        alert(
          `Invalid wager for ${teamNames[i]}. Must be between 0 and ${score}.`
        );
        return;
      }
      teamWagers[i] = wagerVal;
    }
    document.getElementById("finalWagerModal").style.display = "none";
    showFinalQuestion();
  };

  function showFinalQuestion() {
    // Display final jeopardy question
    if (!finalJeopardyQuestion) {
      alert("No final Jeopardy question found!");
      return;
    }
    const finalText = document.getElementById("finalQuestionText");
    const finalImage = document.getElementById("finalQuestionImage");
    const finalVideo = document.getElementById("finalQuestionVideo");

    finalText.textContent = finalJeopardyQuestion.question || "";
    if (finalJeopardyQuestion.image) {
      finalImage.src = finalJeopardyQuestion.image;
      finalImage.style.display = "block";
      finalVideo.style.display = "none";
    } else if (finalJeopardyQuestion.video) {
      finalImage.style.display = "none";
      finalVideo.src = `https://www.youtube.com/embed/${finalJeopardyQuestion.video}`;
      finalVideo.style.display = "block";
    } else {
      finalImage.style.display = "none";
      finalVideo.style.display = "none";
    }

    document.getElementById("finalQuestionModal").style.display = "block";
  }

  document.getElementById("revealAnswersBtn").onclick = function () {
    document.getElementById("finalQuestionModal").style.display = "none";
    // Sort teams by score ascending
    let scoresArray = [];
    for (let i = 0; i < 4; i++) {
      let score = parseInt(
        document.getElementById(`score${i + 1}`).textContent
      );
      scoresArray.push({ index: i, score: score });
    }
    scoresArray.sort((a, b) => a.score - b.score);
    finalJudgingOrder = scoresArray;
    judgeNextTeam();
  };

  function judgeNextTeam() {
    if (finalJudgingOrder.length === 0) {
      // All judged, show winner
      showWinner();
      return;
    }
    let teamObj = finalJudgingOrder.shift();
    let i = teamObj.index;
    document.getElementById(
      "judgeTeamName"
    ).textContent = `Team: ${teamNames[i]}`;
    document.getElementById("judgeWager").textContent = teamWagers[i];

    document.getElementById("finalJudgingModal").style.display = "block";

    // Store current team being judged
    document.getElementById("correctBtn").onclick = function () {
      adjustScore(i, true);
    };
    document.getElementById("incorrectBtn").onclick = function () {
      adjustScore(i, false);
    };
  }

  function adjustScore(teamIndex, correct) {
    let scoreElement = document.getElementById(`score${teamIndex + 1}`);
    let currentScore = parseInt(scoreElement.textContent);
    let wager = teamWagers[teamIndex];
    if (correct) {
      currentScore += wager;
    } else {
      currentScore -= wager;
    }
    scoreElement.textContent = currentScore;
    document.getElementById("finalJudgingModal").style.display = "none";
    judgeNextTeam();
  }

  function showWinner() {
    // Determine winner or tie
    let scores = [];
    for (let i = 0; i < 4; i++) {
      let s = parseInt(document.getElementById(`score${i + 1}`).textContent);
      scores.push({ name: teamNames[i], score: s });
    }

    scores.sort((a, b) => b.score - a.score); // sort descending by score
    let highestScore = scores[0].score;
    let winners = scores.filter((t) => t.score === highestScore);

    let winnerText = "";
    if (winners.length > 1) {
      // It's a tie
      // List all tied teams
      winnerText =
        "It's a tie between: " + winners.map((w) => w.name).join(", ") + "!";
    } else {
      // Single winner
      winnerText = `Winner: ${winners[0].name} with ${highestScore} points!`;
    }

    document.getElementById("winnerName").textContent = winnerText;
    document.getElementById("winnerModal").style.display = "block";

    // Play winner sound
    document.getElementById("winnerSound").play();
  }

  // Close modal functionality for question
  var modal = document.getElementById("questionModal");
  var closeElements = modal.getElementsByClassName("close");
  for (let c of closeElements) {
    c.onclick = function (e) {
      closeQuestionModal();
    };
  }
  modal.onclick = function (e) {
    if (e.target.classList.contains("modal")) {
      closeQuestionModal();
    }
  };

  function closeQuestionModal() {
    // If we had a question open and ready
    // If the dataset says the question was used, increment usedQuestions
    if (modal.dataset.questionUsed === "true") {
      usedQuestions++;
      modal.dataset.questionUsed = "";
      checkAllQuestionsUsed();
    }
    modal.style.display = "none";
  }

  // Increment Score Function
  window.incrementScore = function (team) {
    const scoreId = `score${team}`;
    const scoreElement = document.getElementById(scoreId);
    let currentScore = parseInt(scoreElement.textContent, 10);
    currentScore += lastQuestionValue;
    scoreElement.textContent = currentScore.toString();
    document.getElementById("scoreSound").play();
  };
});
