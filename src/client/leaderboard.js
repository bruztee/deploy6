import escape from 'lodash/escape';

const leaderboard = document.getElementById('leaderboard');
const rows = document.querySelectorAll('#leaderboard table tr');

export function updateLeaderboard(data) {
  const leaderboardData = data.leaderboard;
  const myScore = Math.round(data.myScore); // Округляем твой счет до целого

  // Обновляем топ-5 лидеров
  for (let i = 0; i < 5; i++) {
    if (i < leaderboardData.length) {
      rows[i + 1].innerHTML = `<td>${escape(leaderboardData[i].username.slice(0, 15)) || 'Anonymous'}</td><td>${leaderboardData[i].score}</td>`;
    } else {
      rows[i + 1].innerHTML = '<td>-</td><td>-</td>';
    }
  }

  // Обновляем "My Score"
  let myScoreElement = document.getElementById('my-score');
  if (!myScoreElement) {
    myScoreElement = document.createElement('div');
    myScoreElement.id = 'my-score';
    myScoreElement.style.color = 'white';
    myScoreElement.style.textAlign = 'center';
    myScoreElement.style.marginTop = '10px';
    leaderboard.appendChild(myScoreElement);
  }
  myScoreElement.textContent = `My Score: ${myScore}`;
}

export function setLeaderboardHidden(hidden) {
  if (hidden) {
    leaderboard.classList.add('hidden');
  } else {
    leaderboard.classList.remove('hidden');
  }
}