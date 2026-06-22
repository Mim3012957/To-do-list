/* ── State ───────────────────────────────────────────── */
let tasks = [];          // FIX: declared FIRST before any listeners
let filter = "all";
let editingId = null;
let confettiFired = false;

/* ── Persistence ─────────────────────────────────────── */
const saveTasks = () => {
  localStorage.setItem("tasks_v2", JSON.stringify(tasks));
};

const loadTasks = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("tasks_v2"));
    if (Array.isArray(stored)) tasks = stored;
  } catch (e) {
    tasks = [];
  }
};

/* ── Helpers ─────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const escHtml = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const motivations = [
  "Let's get started!",
  "Keep it up!",
  "You're on a roll 🔥",
  "Almost there!",
  "All done! 🎉",
];

/* ── Stats ───────────────────────────────────────────── */
const updateStats = () => {
  const total = tasks.length;
  const done  = tasks.filter((t) => t.completed).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("progress").style.width = pct + "%";
  document.getElementById("numbers").textContent  = `${done}/${total}`;

  const idx =
    total === 0     ? 0 :
    done === total  ? 4 :
    Math.min(Math.floor((done / total) * 3) + 1, 3);

  document.getElementById("motivate").textContent = motivations[idx];

  if (total > 0 && done === total && !confettiFired) {
    confettiFired = true;
    blastConfetti();
  }
  if (done < total) confettiFired = false;
};

/* ── Render ──────────────────────────────────────────── */
const updateTaskList = () => {
  const list = document.getElementById("task-list");

  const visible =
    filter === "done"   ? tasks.filter((t) => t.completed) :
    filter === "active" ? tasks.filter((t) => !t.completed) :
    tasks;

  if (visible.length === 0) {
    list.innerHTML = `<li class="empty-msg">${
      filter === "done"   ? "No completed tasks yet." :
      filter === "active" ? "Nothing active — great job!" :
      "Add your first task above!"
    }</li>`;
    updateStats();
    return;
  }

  list.innerHTML = "";

  visible.forEach((task) => {
    const li = document.createElement("li");
    const dotCls =
      task.priority === "high" ? "p-high" :
      task.priority === "med"  ? "p-med"  : "p-low";

    if (editingId === task.id) {
      /* ── Edit mode ── */
      li.innerHTML = `
        <div class="taskItem">
          <div class="task">
            <div class="priority-dot ${dotCls}"></div>
            <input class="edit-input" id="editInp_${task.id}" value="${escHtml(task.text)}" />
          </div>
          <div class="icons">
            <i class="fa-solid fa-check"  data-action="save"   data-id="${task.id}" title="Save"></i>
            <i class="fa-solid fa-xmark"  data-action="cancel"                      title="Cancel"></i>
          </div>
        </div>`;

      setTimeout(() => {
        const inp = document.getElementById("editInp_" + task.id);
        if (inp) { inp.focus(); inp.select(); }
      }, 10);

    } else {
      /* ── Normal mode ── */
      li.innerHTML = `
        <div class="taskItem">
          <div class="task ${task.completed ? "completed" : ""}">
            <input type="checkbox" class="checkbox" ${task.completed ? "checked" : ""} data-id="${task.id}" />
            <div class="priority-dot ${dotCls}"></div>
            <p>${escHtml(task.text)}</p>
          </div>
          <div class="icons">
            <i class="fa-solid fa-pen-to-square" data-action="edit"   data-id="${task.id}" title="Edit"></i>
            <i class="fa-solid fa-trash"          data-action="delete" data-id="${task.id}" title="Delete"></i>
          </div>
        </div>`;
    }

    list.appendChild(li);
  });

  updateStats();
};

/* ── Add Task ────────────────────────────────────────── */
const addTask = () => {
  const input    = document.getElementById("taskInput");
  const selEl    = document.getElementById("prioritySel");
  const text     = input.value.trim();
  const priority = selEl ? selEl.value : "med";

  if (!text) { input.focus(); return; }

  tasks.unshift({ id: uid(), text, completed: false, priority });
  input.value = "";
  input.focus();
  saveTasks();
  updateTaskList();
};

/* ── Toggle Complete ─────────────────────────────────── */
const toggleTaskComplete = (id) => {
  const task = tasks.find((t) => t.id === id);
  if (task) { task.completed = !task.completed; saveTasks(); updateTaskList(); }
};

/* ── Delete Task ─────────────────────────────────────── */
const deleteTask = (id) => {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  updateTaskList();
};

/* ── Edit Task ───────────────────────────────────────── */
const startEdit = (id) => { editingId = id; updateTaskList(); };

const saveEdit = (id) => {
  const inp = document.getElementById("editInp_" + id);
  const val = inp ? inp.value.trim() : "";
  if (val) {
    const task = tasks.find((t) => t.id === id);
    if (task) task.text = val;
    saveTasks();
  }
  editingId = null;
  updateTaskList();
};

const cancelEdit = () => { editingId = null; updateTaskList(); };

/* ── Event Delegation ────────────────────────────────── */
document.getElementById("task-list").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === "edit")   startEdit(id);
  if (action === "save")   saveEdit(id);
  if (action === "cancel") cancelEdit();
  if (action === "delete") deleteTask(id);
});

document.getElementById("task-list").addEventListener("change", (e) => {
  if (e.target.classList.contains("checkbox")) {
    toggleTaskComplete(e.target.dataset.id);
  }
});

/* Save edit on Enter key inside edit input */
document.getElementById("task-list").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("edit-input")) {
    const item = e.target.closest(".taskItem");
    const saveBtn = item && item.querySelector("[data-action='save']");
    if (saveBtn) saveBtn.click();
  }
});

/* ── Form Submit ─────────────────────────────────────── */
document.getElementById("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addTask();
});

/* ── Filter Buttons ──────────────────────────────────── */
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.f;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    editingId = null;
    updateTaskList();
  });
});

/* ── Confetti ────────────────────────────────────────── */
const blastConfetti = () => {
  if (typeof confetti === "undefined") return;
  const count    = 200;
  const defaults = { origin: { y: 0.7 } };
  const fire = (ratio, opts) =>
    confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * ratio) }));
  fire(0.25, { spread: 26,  startVelocity: 55 });
  fire(0.20, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.10, { spread: 120, startVelocity: 45 });
};

/* ── Init ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();       // safe: tasks[] already declared at the top
  updateTaskList();
});