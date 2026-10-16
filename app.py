import os
import sqlite3
from datetime import date
from flask import Flask, jsonify, request, render_template, g

app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE = os.path.join(BASE_DIR, "tasks.db")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row

        g.db.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                deadline TEXT DEFAULT '',
                status TEXT DEFAULT 'Pending',
                priority TEXT DEFAULT 'Medium'
            )
        """)
        g.db.commit()

    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def format_task(row):
    task = dict(row)
    task["overdue"] = (
        bool(task["deadline"])
        and task["deadline"] < date.today().isoformat()
        and task["status"] != "Completed"
    )
    return task


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    status = request.args.get("status", "all")
    search = request.args.get("search", "").strip()

    sql = "SELECT * FROM tasks WHERE 1=1"
    values = []

    if status in ("Pending", "Completed"):
        sql += " AND status = ?"
        values.append(status)

    if search:
        sql += " AND (title LIKE ? OR description LIKE ?)"
        values.extend([f"%{search}%", f"%{search}%"])

    sql += " ORDER BY id DESC"

    rows = get_db().execute(sql, values).fetchall()
    return jsonify([format_task(row) for row in rows])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()

    if not title:
        return jsonify({
            "error": "Task title cannot be empty."
        }), 400

    description = str(data.get("description", "")).strip()
    deadline = str(data.get("deadline", "")).strip()
    priority = data.get("priority", "Medium")

    if priority not in ("Low", "Medium", "High"):
        priority = "Medium"

    db = get_db()
    cursor = db.execute(
        """INSERT INTO tasks
           (title, description, deadline, priority)
           VALUES (?, ?, ?, ?)""",
        (title, description, deadline, priority)
    )
    db.commit()

    task = db.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (cursor.lastrowid,)
    ).fetchone()

    return jsonify(format_task(task)), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def edit_task(task_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()

    if not title:
        return jsonify({
            "error": "Task title cannot be empty."
        }), 400

    description = str(data.get("description", "")).strip()
    deadline = str(data.get("deadline", "")).strip()
    priority = data.get("priority", "Medium")

    if priority not in ("Low", "Medium", "High"):
        priority = "Medium"

    db = get_db()
    cursor = db.execute(
        """UPDATE tasks
           SET title = ?, description = ?, deadline = ?, priority = ?
           WHERE id = ?""",
        (title, description, deadline, priority, task_id)
    )
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({"error": "Task not found."}), 404

    task = db.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (task_id,)
    ).fetchone()

    return jsonify(format_task(task))


@app.route("/api/tasks/<int:task_id>/status", methods=["PATCH"])
def change_status(task_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status not in ("Pending", "Completed"):
        return jsonify({
            "error": "Status must be Pending or Completed."
        }), 400

    db = get_db()
    cursor = db.execute(
        "UPDATE tasks SET status = ? WHERE id = ?",
        (status, task_id)
    )
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({"error": "Task not found."}), 404

    task = db.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (task_id,)
    ).fetchone()

    return jsonify(format_task(task))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    db = get_db()
    cursor = db.execute(
        "DELETE FROM tasks WHERE id = ?",
        (task_id,)
    )
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({"error": "Task not found."}), 404

    return jsonify({
        "message": "Task deleted successfully."
    })


if __name__ == "__main__":
    app.run(debug=True)