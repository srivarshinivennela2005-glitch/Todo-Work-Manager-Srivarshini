document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const deadlineInput = document.getElementById("deadline");
  const priorityInput = document.getElementById("priority");
  const searchInput = document.getElementById("search");
  const filterInput = document.getElementById("filter");

  let list = document.getElementById("task-list");

  if (!list) {
    list = document.createElement("section");
    list.id = "task-list";
    const controls = document.querySelector(".controls");
    if (controls) {
      controls.after(list);
    } else {
      form.after(list);
    }
  }

  async function loadTasks() {
    try {
      const params = new URLSearchParams();
      params.set("search", searchInput?.value || "");
      params.set("status", filterInput?.value || "all");

      const response = await fetch("/api/tasks?" + params);
      if (!response.ok) throw new Error("Could not load tasks");

      const tasks = await response.json();
      list.replaceChildren();

      if (tasks.length === 0) {
        list.textContent = "No tasks yet. Add your first task!";
        return;
      }

      tasks.forEach(task => {
        const card = document.createElement("article");
        card.style.cssText =
          "padding:16px;margin:12px 0;border:1px solid #ddd;border-radius:10px";

        const heading = document.createElement("h3");
        heading.textContent = task.title;
        card.append(heading);

        const description = document.createElement("p");
        description.textContent = task.description || "";
        card.append(description);

        const details = document.createElement("p");
        details.textContent =
          "Status: " + task.status +
          " | Priority: " + task.priority +
          (task.deadline ? " | Deadline: " + task.deadline : "");
        card.append(details);

        async function update(url, method, data) {
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: data ? JSON.stringify(data) : undefined
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Operation failed");
          }

          await loadTasks();
        }

        const completeButton = document.createElement("button");
        completeButton.textContent =
          task.status === "Completed" ? "Mark Pending" : "Mark Completed";

        completeButton.onclick = async () => {
          try {
            await update(
              `/api/tasks/${task.id}/status`,
              "PATCH",
              { status: task.status === "Completed" ? "Pending" : "Completed" }
            );
          } catch (error) {
            alert(error.message);
          }
        };
        card.append(completeButton);

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.style.marginLeft = "8px";

        editButton.onclick = async () => {
          const title = prompt("Edit task title", task.title);
          if (title === null) return;
          if (!title.trim()) {
            alert("Task title cannot be empty.");
            return;
          }

          const description = prompt(
            "Edit description", task.description || ""
          );
          if (description === null) return;

          try {
            await update(`/api/tasks/${task.id}`, "PUT", {
              title: title.trim(),
              description,
              deadline: task.deadline || "",
              priority: task.priority || "Medium"
            });
          } catch (error) {
            alert(error.message);
          }
        };
        card.append(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.style.marginLeft = "8px";

        deleteButton.onclick = async () => {
          if (!confirm("Delete this task?")) return;
          try {
            await update(`/api/tasks/${task.id}`, "DELETE");
          } catch (error) {
            alert(error.message);
          }
        };
        card.append(deleteButton);

        list.append(card);
      });
    } catch (error) {
      list.textContent = "Error: " + error.message;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
      alert("Please enter a task title.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: descriptionInput.value.trim(),
          deadline: deadlineInput.value,
          priority: priorityInput.value
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not add task");
      }

      form.reset();
      await loadTasks();
    } catch (error) {
      alert(error.message);
    }
  });

  searchInput?.addEventListener("input", loadTasks);
  filterInput?.addEventListener("change", loadTasks);

  loadTasks();
});