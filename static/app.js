const form = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const filter = document.getElementById("filter");

async function loadTasks() {
  const status = filter ? filter.value : "all";
  const response = await fetch("/api/tasks?status=" + status);
  const tasks = await response.json();

  taskList.innerHTML = "";

  tasks.forEach(task => {
    const card = document.createElement("div");
    card.style.cssText = "background:white;padding:18px;margin:12px 0;border-radius:12px;box-shadow:0 4px 12px #0002";

    const title = document.createElement("h3");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent = task.description || "";

    const deadline = document.createElement("p");
    deadline.textContent = task.deadline ? "Deadline: " + task.deadline : "";

    const statusText = document.createElement("p");
    statusText.textContent = "Status: " + task.status;

    const completeButton = document.createElement("button");
    completeButton.textContent = task.status === "Completed" ? "Mark Pending" : "Mark Completed";
    completeButton.onclick = async () => {
      const newStatus = task.status === "Completed" ? "Pending" : "Completed";
      await fetch("/api/tasks/" + task.id + "/status", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status: newStatus})
      });
      loadTasks();
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.marginLeft = "8px";
    deleteButton.style.background = "#dc2626";
    deleteButton.onclick = async () => {
      await fetch("/api/tasks/" + task.id, {method: "DELETE"});
      loadTasks();
    };

    card.append(title, description, deadline, statusText, completeButton, deleteButton);
    taskList.appendChild(card);
  });
}

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description")?.value || "";
    const deadline = document.getElementById("deadline")?.value || "";

    if (!title) {
      alert("Please enter a task title.");
      return;
    }

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({title, description, deadline})
    });

    if (!response.ok) {
      alert("Could not add task. Please try again.");
      return;
    }

    form.reset();
    loadTasks();
  });
}

if (filter) {
  filter.addEventListener("change", loadTasks);
}

loadTasks();
