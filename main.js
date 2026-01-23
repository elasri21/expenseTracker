const DateUtils = {
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  toDate(dateStr) {
    return new Date(dateStr + "T00:00:00");
  },

  dayKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  monthKey(dateStr) {
    const d = this.toDate(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  },

  weekKey(dateStr) {
    const d = this.toDate(dateStr);
    const start = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - start) / 86400000);
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
};
const state = {
  expenses: JSON.parse(localStorage.getItem("expenses")) || [],
  selectedDate: DateUtils.today(),
};
const Storage = {
  save(expenses, currentDay) {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("activeDate", currentDay);
  },

  load() {
    return {
      expenses: JSON.parse(localStorage.getItem("expenses")) || [],
      currentDay: localStorage.getItem("activeDate") || DateUtils.dayKey(new Date()),
    };
  },

  clear() {
    localStorage.removeItem("expenses");
    localStorage.removeItem("activeDate");
  }
};
const CATEGORY_COLORS = {
  Food: "#f87171",
  Transport: "#60a5fa",
  Shopping: "#fbbf24",
  Bills: "#34d399",
  Health: "#a78bfa",
  Other: "#9ca3af"
};

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const totalEl = document.getElementById("total");
const categoryInput = document.getElementById("category");
const filterCategory = document.getElementById("filterCategory");
const clearAllBtnContainer = document.querySelector(".clearAllBtn");
const setBudgetBtn = document.getElementById("setBudget");
// Load existing expenses
const loaded = Storage.load();
state.expenses = loaded.expenses || [];
state.expenses = state.expenses.map(e => ({
  id: e.id || generateId(),
  title: e.title || "",
  amount: Number(e.amount),
  category: e.category || "Other",
  date: e.date,
  note: e.note || ""
}));
let dailyHistory = JSON.parse(localStorage.getItem("dailyHistory")) || [];
let dailyBudget = Number(localStorage.getItem("dailyBudget")) || null;
const today = DateUtils.dayKey(new Date());
const modal = document.getElementById("dayModal");
const modalDate = document.getElementById("modalDate");
const modalDateTotal = document.getElementById("modalDateTotal");
const modalList = document.getElementById("modalList");
const activeDateInput = document.getElementById("activeDate");
let activeDate =
  loaded.currentDay ||
  DateUtils.dayKey(new Date());
activeDateInput.value = activeDate;
activeDateInput.addEventListener("change", () => {
  activeDate = activeDateInput.value;
  //localStorage.setItem("activeDate", activeDate);
  Storage.save(state.expenses, activeDate);
});
const monthSelect = document.getElementById("monthSelect");
let selectedMonth = null;
const weekSelect = document.getElementById("weekSelect");
let selectedWeek = null;
// store the id of the expense being edited
let editId = null;

// track over spent
let carryOver = Number(localStorage.getItem("carryOver")) || 0;

// Render on load
render();

setBudgetBtn.addEventListener("click", setDailyBudget);
addBtn.addEventListener("click", addNewExpense);

monthSelect.addEventListener("change", () => {
  selectedMonth = monthSelect.value;
  render();
});

weekSelect.addEventListener("change", () => {
  selectedWeek = weekSelect.value;
  render();
});

// clear all
const clearAllBtn = document.getElementById("clearAllBtn");
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", closeDay)
}
const resetCarryOverBtn = document.getElementById("resetCarryOver");
resetCarryOverBtn.addEventListener("click", resetCarryOver)

filterCategory.addEventListener("change", () => {
  render();
});

// add new expense
function addNewExpense() {
  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const note = '';
  const date = activeDate;
  if (!title || !amount || !category) {
    alert("Please enter a title and amount");
    return;
  }

  // if editing
  if (editId !== null) {
    state.expenses = state.expenses.map((exp) =>
      exp.id === editId ? { ...exp, title, amount, category } : exp
    );

    Storage.save(state.expenses, activeDate);
    render();
    resetForm();
    return;
  }
  // expenses.push(expense);
  state.expenses.push(
    createExpense({title, amount, category, date, note})
  );

  const total = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);

  Storage.save(state.expenses, activeDate);

  titleInput.value = "";
  amountInput.value = "";
  render();
}

//  close a day
function closeDay() {
    if (state.expenses.length === 0) return;

    if (isDayClosed(activeDate)) {
      alert("This day is already closed.");
      return;
    }

    if (!confirm(`Close ${activeDate}? This action is final.`)) return;

    const total = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    if (dailyBudget !== null && total > dailyBudget) {
      carryOver += (total - dailyBudget);
      localStorage.setItem("carryOver", carryOver);
    }

    dailyHistory.push({
      date: activeDate,
      total,
      expenses: [...state.expenses]
    });

    localStorage.setItem("dailyHistory", JSON.stringify(dailyHistory));
    localStorage.setItem("dailyBudget", null);
    //expenses = [];
    state.expenses = [];
    
    activeDate = DateUtils.dayKey(new Date())
    activeDateInput.value = activeDate;
    Storage.save(state.expenses, activeDate);

    render();
}

// check for closed day
function isDayClosed(date) {
  return dailyHistory.some(day => day.date === date);
}

//
function calculateDailyTotals() {
  const daily = {};

  state.expenses.forEach(exp => {
    if (!daily[exp.date]) {
      daily[exp.date] = 0;
    }
    daily[exp.date] += exp.amount;
  });

  return daily;
}

function resetForm() {
  // reset UI
  editId = null;
  addBtn.textContent = "Add";
  addBtn.classList.remove("bg-green-600");
  addBtn.classList.add("bg-blue-600");

  titleInput.value = "";
  amountInput.value = "";
  categoryInput.value = "";
}

// Delete expense
function deleteExpense(id) {
  state.expenses = state.expenses.filter((exp) => exp.id !== id);
  Storage.save(state.expenses, activeDate);
  render();
}

// reset carry over
function resetCarryOver() {
  if (!confirm("Reset overspending tracker?")) return;

  carryOver = 0;
  localStorage.setItem("carryOver", carryOver);
  render();
}

// render carry over
function renderCarryOver() {
  const overSpent = document.getElementById("overSpent");
  if (!overSpent) return;

  overSpent.textContent = `${carryOver > 0 ? "-" : "+" }${carryOver} DH`;
  overSpent.className =
    carryOver > 0
      ? "font-semibold text-red-600"
      : "font-semibold text-green-600";
}

// Rendering the UI
function render() {
  list.innerHTML = "";
  let total = 0;
  renderBudget()
  let filtered = state.expenses;

  if (filterCategory.value !== "All") {
    filtered = filtered.filter(
      exp => exp.category === filterCategory.value.charAt(0).toLowerCase() + filterCategory.value.slice(1)
    );
  }

  filtered.forEach(exp => total += exp.amount);
  totalEl.textContent = total;

  renderCarryOver();
  filtered.forEach(exp => {
    const li = document.createElement("li");
    li.className = "flex justify-between bg-gray-100 p-3 rounded-lg";
    li.innerHTML = `
      <span>
        ${exp.title} - <strong>${exp.amount} DH</strong>
        <span class="text-xs bg-gray-300 px-2 py-1 rounded ml-2">${exp.category}</span>
      </span>

      <div class="flex gap-4 ml-auto">
        <button onclick="editExpense('${exp.id}')" class="text-blue-600 hover:underline">Edit</button>
        <button onclick="deleteExpense('${exp.id}')" class="text-red-600 hover:underline">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Calculate totals per category (using filtered list)
  const totals = calculateCategoryTotals(filtered);

  const currentMonth = monthSelect.value.slice(0, 7)|| activeDate.slice(0, 7);
  const monthlyExpenses = getAllHistoricalExpenses().filter(
    exp => exp.date.slice(0, 7) === currentMonth
  );

  const monthlyTotals = calculateCategoryTotals(monthlyExpenses);
  renderMonthlyLegend(monthlyTotals);
 
  // Display totals
  const totalsContainer = document.getElementById("categoryTotals");

  totalsContainer.innerHTML =
    Object.keys(totals).length === 0
      ? "<p class='text-gray-500'>No expenses found.</p>"
      : Object.entries(totals)
          .map(
            ([cat, amount]) => `
          <p class="flex justify-between">
            <span>${cat}</span>
            <strong>${amount} DH</strong>
          </p>
        `
          )
          .join("");
  
  // Calculate daily totals
  const dailyContainer = document.getElementById("dailySummary");
 
  if (dailyHistory.length === 0) {
    dailyContainer.innerHTML = "<p class='text-gray-500'>No daily history yet.</p>";
  } else {

    dailyContainer.innerHTML = dailyHistory
      .slice()
      .reverse()
      .map((day, index) => `
    <button
      onclick="openDay(${dailyHistory.length - 1 - index})"
      class="w-full text-left flex justify-between hover:bg-gray-200 p-2 rounded">
      <span>${day.date}</span>
      <strong>${day.total} DH</strong>
    </button>
  `)
  .join("");
  }
  updateStartDayButton();
  renderMonthlySummary();
  renderWeeklySummary();
}

function editExpense(id) {
  const exp = state.expenses.find((e) => e.id === id);
  if (!exp) return;

  // prefill input fields
  titleInput.value = exp.title;
  amountInput.value = exp.amount;
  categoryInput.value = exp.category;

  editId = id;

  addBtn.textContent = "Update";
  addBtn.classList.remove("bg-blue-600");
  addBtn.classList.add("bg-green-600");

  // aauto scroll to top when editing
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function calculateCategoryTotals(expenseList) {
  const totals = {};

  expenseList.forEach((exp) => {
    if (!totals[exp.category]) {
      totals[exp.category] = 0;
    }
    totals[exp.category] += exp.amount;
  });
  return totals;
}

// open aad close modal
function openDay(index) {
  const day = dailyHistory[index];
  if (!day) return;

  modalDate.textContent = day.date;
  modalDateTotal.innerHTML = `<span>Total</span><span><span class="text-blue-600">${day.total}</span> DH</span>`;
  modalList.innerHTML = "";

  day.expenses.forEach(exp => {
    const li = document.createElement("li");
    li.className = "flex justify-between bg-gray-100 p-2 rounded";

    li.innerHTML = `
      <span>${exp.title}
        <span class="text-xs bg-gray-300 px-2 py-1 rounded ml-2">${exp.category}</span>
      </span>
      <strong>${exp.amount} DH</strong>
    `;

    modalList.appendChild(li);
  });
  
  let reopenAday = `
    <button onClick="reopenDay('${day.date}')" class="bg-red-600 text-white w-full py-2 rounded-lg mb-4">
      Reopen this day
    </button>
  `;
  modalList.innerHTML += reopenAday;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function updateStartDayButton() {
  if (state.expenses.length === 0) {
    clearAllBtnContainer.innerHTML = "";
  } else {
    clearAllBtnContainer.innerHTML = `
          <button id="clearAllBtn"
          class="bg-red-600 text-white w-full py-2 rounded-lg mb-4">
          Start New Day
        </button>
    `;
  }
}

// monthly totals
function getMonthlyTotals() {
  return dailyHistory.reduce((acc, day) => {
    const monthKey = DateUtils.monthKey(day.date)
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        total: 0,
        days: 0,
        categories: {}
      };
    }

    acc[monthKey].total += day.total;
    acc[monthKey].days += 1;

    
    day.expenses.forEach(exp => {
      if (!acc[monthKey].categories[exp.category]) {
        acc[monthKey].categories[exp.category] = 0;
      }
      acc[monthKey].categories[exp.category] += exp.amount;
    });

    return acc;
  }, {});
}

// render monthly summury
function renderMonthlySummary() {
  const container = document.getElementById("monthlySummary");
  const monthlyData = getMonthlyTotals();

  const months = Object.keys(monthlyData).sort();

  container.innerHTML = "";

  if (months.length === 0) {
    container.innerHTML =
      `<p class="text-gray-500 text-sm">No monthly data yet.</p>`;
    return;
  }

  populateMonthSelect(months);

  const month = selectedMonth;
  const data = monthlyData[month];

  // comparison (only if previous exists)
  const comparison = renderMonthlyComparison();
  container.innerHTML = comparison || "";

  const categoryList = Object.entries(data.categories)
    .map(
      ([cat, amount]) => `
        <div class="flex justify-between text-sm">
          <span>${cat}</span>
          <span class="font-medium">${amount.toFixed(2)}</span>
        </div>
      `
    )
    .join("");

  container.innerHTML += `
    <div class="bg-white rounded-xl shadow p-4 border">
      <h3 class="font-semibold mb-1">${month}</h3>
      <p class="text-sm text-gray-600 mb-2">
        ${data.days} days • Total:
        <span class="font-semibold">${data.total.toFixed(2)}</span>
      </p>

      <div class="border-t pt-2 space-y-1">
        ${categoryList}
      </div>
    </div>
  `;

  container.innerHTML += renderCategoryComparison(month);
  drawPieChart(
    "monthlyCategoryChart",
    data.categories
  );

}

function getMonthlyComparison() {
  const monthlyData = getMonthlyTotals();
  const months = Object.keys(monthlyData).sort();

  if (months.length < 2) return null;

  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  const currentTotal = monthlyData[currentMonth].total;
  const previousTotal = monthlyData[previousMonth].total;

  const diff = currentTotal - previousTotal;
  const percent =
    previousTotal === 0
      ? 0
      : (diff / previousTotal) * 100;

  return {
    currentMonth,
    previousMonth,
    currentTotal,
    previousTotal,
    diff,
    percent
  };
}

function renderMonthlyComparison() {
  const data = getMonthlyComparison();
  if (!data) return "";

  const {
    currentMonth,
    previousMonth,
    diff,
    percent
  } = data;

  const isIncrease = diff > 0;
  const color = isIncrease ? "text-red-600" : "text-green-600";
  const sign = isIncrease ? "+" : "";

  return `
    <div class="mb-4 p-4 rounded-lg border bg-gray-50">
      <p class="text-sm">
        Compared to <strong>${previousMonth}</strong>:
        <span class="${color} font-semibold">
          ${sign}${percent.toFixed(1)}%
        </span>
      </p>
    </div>
  `;
}

function populateMonthSelect(months) {
  monthSelect.innerHTML = "";

  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  if (!selectedMonth && months.length > 0) {
    selectedMonth = months[months.length - 1]; // latest month
  }

  monthSelect.value = selectedMonth;
}

function getCategoryComparison(month) {
  const monthlyData = getMonthlyTotals();
  const months = Object.keys(monthlyData).sort();

  const index = months.indexOf(month);
  if (index <= 0) return null;

  const current = monthlyData[month].categories;
  const previous = monthlyData[months[index - 1]].categories;

  const allCategories = new Set([
    ...Object.keys(current),
    ...Object.keys(previous)
  ]);

  return [...allCategories].map(cat => {
    const curr = current[cat] || 0;
    const prev = previous[cat] || 0;
    return {
      category: cat,
      diff: curr - prev,
      current: curr,
      previous: prev
    };
  });
}

function renderCategoryComparison(month) {
  const data = getCategoryComparison(month);
  if (!data) return "";

  const rows = data
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .map(item => {
      const color =
        item.diff > 0
          ? "text-red-600"
          : item.diff < 0
          ? "text-green-600"
          : "text-gray-500";

      const sign =
        item.diff > 0 ? "+" : "";

      return `
        <div class="flex justify-between text-sm">
          <span>${item.category}</span>
          <span class="${color}">
            ${sign}${item.diff.toFixed(2)}
          </span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="mt-4 p-4 rounded-lg border bg-gray-50">
      <h4 class="font-semibold mb-2 text-sm">
        Category comparison vs last month
      </h4>
      <div class="space-y-1">
        ${rows}
      </div>
    </div>
  `;
}

function getWeeklyTotals() {
  return dailyHistory.reduce((acc, day) => {
    const weekKey = DateUtils.weekKey(day.date);

    if (!acc[weekKey]) {
      acc[weekKey] = {
        total: 0,
        days: 0,
        categories: {}
      };
    }

    acc[weekKey].total += day.total;
    acc[weekKey].days += 1;

    day.expenses.forEach(exp => {
      if (!acc[weekKey].categories[exp.category]) {
        acc[weekKey].categories[exp.category] = 0;
      }
      acc[weekKey].categories[exp.category] += exp.amount;
    });

    return acc;
  }, {});
}

function renderWeeklySummary() {
  const container = document.getElementById("weeklySummary");
  const weeklyData = getWeeklyTotals();
  const weeks = Object.keys(weeklyData).sort();

  container.innerHTML = "";

  if (weeks.length === 0) {
    container.innerHTML =
      `<p class="text-gray-500 text-sm">No weekly data yet.</p>`;
    return;
  }

  populateWeekSelect(weeks);

  const week = selectedWeek;
  const data = weeklyData[week];

  const { start, end } = getWeekRange(week);
  // comparison
  container.innerHTML = renderWeeklyComparison() || "";

  const categoryList = Object.entries(data.categories)
    .map(
      ([cat, amount]) => `
        <div class="flex justify-between text-sm">
          <span>${cat}</span>
          <span class="font-medium">${amount.toFixed(2)}</span>
        </div>
      `
    )
    .join("");

  container.innerHTML += `
    <div class="bg-white rounded-xl shadow p-4 border">
      <h3 class="font-semibold mb-1">
        Week ${week.split("-W")[1]} •
        ${formatShortDate(start)} – ${formatShortDate(end)}
      </h3>
      <p class="text-sm text-gray-600 mb-2">
        ${data.days} days • Total:
        <span class="font-semibold">${data.total.toFixed(2)}</span>
      </p>

      <div class="border-t pt-2 space-y-1">
        ${categoryList}
      </div>
    </div>
  `;

  // draw weekly chart
  const chartData = getWeeklyChartData();
  drawBarChart(
    "weeklyTotalChart",
    chartData.labels,
    chartData.values
  );
}

function getWeeklyComparison() {
  const weeklyData = getWeeklyTotals();
  const weeks = Object.keys(weeklyData).sort();

  if (weeks.length < 2) return null;

  const currentWeek = weeks[weeks.length - 1];
  const previousWeek = weeks[weeks.length - 2];

  const currentTotal = weeklyData[currentWeek].total;
  const previousTotal = weeklyData[previousWeek].total;

  const diff = currentTotal - previousTotal;
  const percent =
    previousTotal === 0
      ? 0
      : (diff / previousTotal) * 100;

  return {
    currentWeek,
    previousWeek,
    diff,
    percent
  };
}

function renderWeeklyComparison() {
  const data = getWeeklyComparison();
  if (!data) return "";

  const { previousWeek, diff, percent } = data;

  const isIncrease = diff > 0;
  const color = isIncrease ? "text-red-600" : "text-green-600";
  const sign = isIncrease ? "+" : "";

  const { start, end } = getWeekRange(previousWeek);

  return `
    <div class="mb-4 p-4 rounded-lg border bg-gray-50">
      <p class="text-sm">
        Compared to week <strong>
          ${previousWeek.split("-W")[1]} •
          ${formatShortDate(start)} – ${formatShortDate(end)}
        </strong>:
        <span class="${color} font-semibold">
          ${sign}${percent.toFixed(1)}%
        </span>
      </p>
    </div>
  `;
}

function populateWeekSelect(weeks) {
  weekSelect.innerHTML = "";

  weeks.forEach(week => {
    const option = document.createElement("option");
    option.value = week;
    option.textContent = week;
    weekSelect.appendChild(option);
  });

  if (!selectedWeek && weeks.length > 0) {
    selectedWeek = weeks[weeks.length - 1]; // latest week
  }

  weekSelect.value = selectedWeek;
}

// get week start ad end dates
function getWeekRange(weekKey) {
  const [year, week] = weekKey.split("-W").map(Number);

  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday,
    end: sunday
  };
}

//formt date nicely
function formatShortDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

// Draw pie chart
function drawPieChart(canvasId, dataObj) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const values = Object.values(dataObj);
  const labels = Object.keys(dataObj);

  if (values.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const total = values.reduce((a, b) => a + b, 0);
  //const colors = generateColors(values.length);

  let startAngle = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let j = 0;
  values.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.arc(
      150,
      150,
      120,
      startAngle,
      startAngle + sliceAngle
    );
    ctx.closePath();
    let key = labels[j].charAt(0).toUpperCase() + labels[j].slice(1)
    
    ctx.fillStyle = CATEGORY_COLORS[key];
    ctx.fill();

    startAngle += sliceAngle;
    j++;
  });
}

// draw bar chart
function drawBarChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 40;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  const maxValue = Math.max(...values, 1);
  //const barWidth = chartWidth / values.length - 50;
  const barWidth = 20;

  values.forEach((value, i) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding + i * (barWidth + 10);
    const y = canvas.height - padding - barHeight;

    ctx.fillStyle = "#4f46e5"; // indigo
    ctx.fillRect(x, y, barWidth, barHeight);

    // value label
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      value.toFixed(0),
      x,
      y - 5
    );

    // x label
    ctx.fillText(
      labels[i],
      x,
      canvas.height - 15
    );
  });
}

// get weekly chart data
function getWeeklyChartData() {
  const weeklyData = getWeeklyTotals();
  const weeks = Object.keys(weeklyData).sort();

  return {
    labels: weeks.map(w => w.split("-W")[1]), // week number
    values: weeks.map(w => weeklyData[w].total)
  };
}

// start new functions
function createExpense({ title, amount, category, date, note = "" }) {
  return {
    id: generateId(),
    title: title.trim(),
    amount: Number(amount),
    category: category.trim(),
    date,
    note: note.trim(),
  };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function renderMonthlyLegend(categoryTotals) {
  const legend = document.getElementById("monthlyLegend");
  legend.innerHTML = `<h2 class="text-lg font-semibold mb-4 pb-2 border-b border-gray-300 shadow-sm">Monthly legend</h2>`;

  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  Object.entries(categoryTotals).forEach(([category, amount]) => {

    const color = CATEGORY_COLORS[category.charAt(0).toUpperCase() + category.slice(1)] || "#9ca3af";
    const percent = ((amount / total) * 100).toFixed(1);

    legend.innerHTML += `
      <div class="flex items-center justify-between bg-gray-100 p-4 rounded-lg text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full" style="background:${color}"></span>
          <span class="capitalize">${category}</span>
        </div>
        <span>${amount.toFixed(2)} (${percent}%)</span>
      </div>
    `;
  });
}

function getAllHistoricalExpenses() {
  return dailyHistory.flatMap(day => day.expenses);
}

// reopen a closed day
function reopenDay(date) {
  if (state.expenses.length > 0) {
    alert("Please close the current day before reopening another one.");
    return;
  }
  let currentDailyHistory = JSON.parse(localStorage.getItem('dailyHistory'));
  if (!currentDailyHistory) return;
  const day = currentDailyHistory.find(d => d.date === date);
  if (!day) return;

  state.expenses = [...day.expenses];
  state.activeDate = day.date;
  currentDailyHistory = currentDailyHistory.filter(
    d => d.date !== date
  );
  Storage.save(state.expenses, state.activeDate);
  localStorage.setItem('dailyHistory', JSON.stringify(currentDailyHistory))
  localStorage.setItem('dailyBudget', null)
  modal.classList.add("hidden");
  render();
}

// calculate remaining budget
function getRemainingBudget() {
  if (dailyBudget === null) return null;

  const spent = state.expenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  return dailyBudget - spent;
}

// set budget for the day
function setDailyBudget() {
  const budgetInput = document.getElementById("budgetInput");
  const val = Number(budgetInput.value);
  if (!Number.isFinite(val) || val <= 0) return;
  dailyBudget = val;
  localStorage.setItem("dailyBudget", val)
  console.log('budget at click', dailyBudget)
  render();
}

// render new budget
function renderBudget() {
  const budgetEl = document.getElementById("budgetInfo");
  if (!budgetEl) return;

  const remaining = getRemainingBudget();

  if (remaining === null) {
    budgetEl.textContent = "No budget set";
    budgetEl.className = "text-gray-500";
  } else {
    budgetEl.textContent = `Remaining: ${remaining} DH`;
    budgetEl.className =
      remaining < 0 ? "text-red-600" : "text-green-600";
  }
}
