const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const totalEl = document.getElementById("total");
const categoryInput = document.getElementById("category");
const filterCategory = document.getElementById("filterCategory");
const clearAllBtnContainer = document.querySelector(".clearAllBtn");
// Load existing expenses
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let dailyHistory = JSON.parse(localStorage.getItem("dailyHistory")) || [];
const today = new Date().toISOString().split("T")[0];

const modal = document.getElementById("dayModal");
const modalDate = document.getElementById("modalDate");
const modalDateTotal = document.getElementById("modalDateTotal");
const modalList = document.getElementById("modalList");

const activeDateInput = document.getElementById("activeDate");
let activeDate =
  localStorage.getItem("activeDate") ||
  new Date().toISOString().split("T")[0];
activeDateInput.value = activeDate;
activeDateInput.addEventListener("change", () => {
  activeDate = activeDateInput.value;
  localStorage.setItem("activeDate", activeDate);
});
const monthSelect = document.getElementById("monthSelect");
let selectedMonth = null;

// Render on load
render();

addBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;

  if (!title || !amount || !category) {
    alert("Please enter a title and amount");
    return;
  }

  // if editing
  if (editId !== null) {
    expenses = expenses.map((exp) =>
      exp.id === editId ? { ...exp, title, amount, category } : exp
    );
    save();
    render();
    resetForm();
    return;
  }

  const expense = {
    id: Date.now(),
    title,
    amount,
    category,
    date: activeDate
  };

  expenses.push(expense);
  save();
  render();

  titleInput.value = "";
  amountInput.value = "";
});

monthSelect.addEventListener("change", () => {
  selectedMonth = monthSelect.value;
  render();
});

// clear all
const clearAllBtn = document.getElementById("clearAllBtn");
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    if (expenses.length === 0) return;

    if (isDayClosed(activeDate)) {
      alert("This day is already closed.");
      return;
    }

    if (!confirm(`Close ${activeDate}? This action is final.`)) return;

    // const today = new Date().toISOString().split("T")[0];

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    dailyHistory.push({
      date: activeDate,
      total,
      expenses: [...expenses]
    });

    localStorage.setItem("dailyHistory", JSON.stringify(dailyHistory));

    expenses = [];
    save();

    // move to next day automatically
    const nextDay = new Date(activeDate);
    nextDay.setDate(nextDay.getDate() + 1);

    activeDate = nextDay.toISOString().split("T")[0];
    activeDateInput.value = activeDate;
    localStorage.setItem("activeDate", activeDate);

    render();
  });
}

filterCategory.addEventListener("change", () => {
  render();
});

// check for closed day
function isDayClosed(date) {
  return dailyHistory.some(day => day.date === date);
}

//
function calculateDailyTotals() {
  const daily = {};

  expenses.forEach(exp => {
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

// Save to localStorage
function save() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

// Delete expense
function deleteExpense(id) {
  expenses = expenses.filter((exp) => exp.id !== id);
  save();
  render();
}

// Rendering the UI
function render() {
  list.innerHTML = "";

  let total = 0;
  
  const dayExpenses = expenses.filter(
    exp => exp.date === activeDate
  );
  let filtered = dayExpenses;

  if (filterCategory.value !== "All") {
    filtered = expenses.filter((exp) => exp.category === filterCategory.value);
  }
  
  filtered.forEach(exp => total += exp.amount);
  totalEl.textContent = total;
    
  filtered.forEach((exp) => {
    const li = document.createElement("li");
    li.className = "flex justify-between bg-gray-100 p-3 rounded-lg";
    li.innerHTML = `
      <span>
        ${exp.title} - <strong>${exp.amount} DH</strong>
        <span class="text-xs bg-gray-300 px-2 py-1 rounded ml-2">${exp.category}</span>
      </span>

      <div class="flex gap-4 ml-auto">
        <button onclick="editExpense(${exp.id})" class="text-blue-600 hover:underline">Edit</button>
        <button onclick="deleteExpense(${exp.id})" class="text-red-600 hover:underline">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Calculate totals per category (using filtered list)
  const totals = calculateCategoryTotals(filtered);
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
  // const dailyTotals = calculateDailyTotals();

  // Sort by most recent date
  // const sortedDays = Object.keys(dailyTotals).sort((a, b) => new Date(b) - new Date(a));

  // Render section
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
}

// store the id of the expense being edited
let editId = null;

function editExpense(id) {
  const exp = expenses.find((e) => e.id === id);
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

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function updateStartDayButton() {
  if (expenses.length === 0) {
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

// monthly totaals
function getMonthlyTotals() {
  return dailyHistory.reduce((acc, day) => {
    const monthKey = day.date.slice(0, 7); // "YYYY-MM"

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
  // console.log(`data returned by getMonthlyComparison ${Object.keys(data)}`)
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

