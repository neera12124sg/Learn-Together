// Streak System Implementation
class StreakTracker {
  constructor() {
    this.storageKey = 'learnTogetherStreakData';
    this.gracePeriodHours = 3; // Until 3 AM local time
    this.minProblemsPerDay = 3;
    this.milestones = [7, 30, 100]; // Streak milestone days
    
    // Initialize data structure
    this.data = this.loadData() || {
      currentStreak: 0,
      lastActiveDate: null,
      solvedProblems: {},
      problemTimestamps: {}
    };
    
    this.checkStreakStatus();
    this.updateUI();
  }

  // Load data from localStorage
  loadData() {
    const savedData = localStorage.getItem(this.storageKey);
    return savedData ? JSON.parse(savedData) : null;
  }

  // Save data to localStorage
  saveData() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // Check if current date is within grace period of last active date
  isWithinGracePeriod(date) {
    if (!this.data.lastActiveDate) return false;
    
    const lastDate = new Date(this.data.lastActiveDate);
    const graceCutoff = new Date(lastDate);
    graceCutoff.setHours(graceCutoff.getHours() + this.gracePeriodHours);
    
    return date <= graceCutoff;
  }

  // Check if two dates are consecutive calendar days
  isConsecutiveDay(prevDate, currentDate) {
    const prevDay = new Date(prevDate);
    prevDay.setDate(prevDay.getDate() + 1);
    
    return (
      currentDate.getDate() === prevDay.getDate() &&
      currentDate.getMonth() === prevDay.getMonth() &&
      currentDate.getFullYear() === prevDay.getFullYear()
    );
  }

  // Check and update streak status based on current date
  checkStreakStatus() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // If we already processed today, no need to continue
    if (this.data.lastActiveDate === todayStr) return;

    const lastActive = this.data.lastActiveDate 
      ? new Date(this.data.lastActiveDate)
      : null;

    // Check if streak should continue or reset
    if (lastActive) {
      if (this.isWithinGracePeriod(today)) {
        // Still within grace period of last active day
        return;
      } else if (this.isConsecutiveDay(lastActive, today)) {
        // Consecutive day - streak continues
        this.data.currentStreak++;
      } else {
        // Not consecutive - reset streak
        this.data.currentStreak = 0;
      }
    }

    // Update last active date
    this.data.lastActiveDate = todayStr;
    this.saveData();
  }

  // Record a solved problem (with validation)
  recordProblemSolved(problemId) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Initialize today's data if not exists
    if (!this.data.solvedProblems[todayStr]) {
      this.data.solvedProblems[todayStr] = [];
      this.data.problemTimestamps[todayStr] = [];
    }

    // Check for duplicate problem ID
    if (this.data.solvedProblems[todayStr].includes(problemId)) {
      console.warn(`Duplicate problem ID: ${problemId}`);
      return false;
    }

    // Check minimum time between problems (anti-cheat)
    const lastTimestamp = this.data.problemTimestamps[todayStr].slice(-1)[0];
    if (lastTimestamp && (now - new Date(lastTimestamp)) < 120000) {
      console.warn('Problem solved too quickly - possible cheating');
      return false;
    }

    // Record problem
    this.data.solvedProblems[todayStr].push(problemId);
    this.data.problemTimestamps[todayStr].push(now.toISOString());
    
    // Check if we reached minimum problems for today
    if (this.data.solvedProblems[todayStr].length >= this.minProblemsPerDay) {
      this.checkStreakStatus();
      this.updateUI();
      this.checkMilestones();
    }

    this.saveData();
    return true;
  }

  // Check for streak milestones
  checkMilestones() {
    const currentStreak = this.data.currentStreak;
    if (this.milestones.includes(currentStreak)) {
      this.showMotivationalMessage(currentStreak);
    }
  }

  // Show motivational message for milestones
  showMotivationalMessage(streakDays) {
    const messages = {
      7: "Great job on your 7-day streak! Keep up the good work!",
      30: "Amazing! You've maintained a 30-day learning streak!",
      100: "Incredible dedication! 100 days of consistent learning!"
    };
    
    if (messages[streakDays]) {
      alert(messages[streakDays]);
    }
  }

  // Update the UI with current streak data
  updateUI() {
    document.getElementById('currentStreak').textContent = this.data.currentStreak;
    
    // Update question text based on streak status
    const questionText = document.getElementById('questionText');
    if (this.data.solvedProblems[this.data.lastActiveDate]?.length >= this.minProblemsPerDay) {
      questionText.textContent = "You've completed today's goal! Keep it up tomorrow!";
    } else {
      const remaining = this.minProblemsPerDay - 
        (this.data.solvedProblems[this.data.lastActiveDate]?.length || 0);
      questionText.textContent = `Solve ${remaining} more problems today to continue your streak!`;
    }
  }

  // Get current streak data
  getStreakData() {
    return {
      currentStreak: this.data.currentStreak,
      problemsToday: this.data.solvedProblems[this.data.lastActiveDate]?.length || 0,
      needsToday: Math.max(0, this.minProblemsPerDay - 
        (this.data.solvedProblems[this.data.lastActiveDate]?.length || 0))
    };
  }
}

// Initialize streak tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.streakTracker = new StreakTracker();
  
  // Connect the answer submission button
  document.getElementById('submitAnswer')?.addEventListener('click', () => {
    const answer = document.getElementById('answerInput').value;
    if (answer.trim()) {
      // In a real app, this would validate with backend
      const problemId = `daily-q-${new Date().toISOString().split('T')[0]}`;
      const success = window.streakTracker.recordProblemSolved(problemId);
      
      const feedback = document.getElementById('feedbackText');
      if (success) {
        feedback.textContent = "Correct! This counts toward your daily goal.";
        feedback.classList.remove('hidden');
      } else {
        feedback.textContent = "You've already answered today's question.";
        feedback.classList.remove('hidden');
      }
    }
  });
});
