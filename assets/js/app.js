
"use strict";

const KEY = "transcontrol-v2";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const pad = (value) => String(value).padStart(2, "0");

function iso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateLocal(date) {
    return `${iso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDate(value) {
    return new Date(value);
}

function now() {
    return new Date();
}

function formatDate(value) {
    if (!value) return "—";

    return toDate(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function clock(value) {
    if (!value) return "—";

    return toDate(value).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function fmt(value) {
    return Number(value).toLocaleString("ru-RU", {
        maximumFractionDigits: 1
    });
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

function offset(days, hours) {
    const date = now();

    date.setDate(date.getDate() - days);
    date.setHours(hours, 0, 0, 0);

    return date.toISOString();
}

function seed() {
    return {
        employees: [
            { id: 1, name: "Иванов Сергей", role: "Водитель", number: "001" },
            { id: 2, name: "Петров Алексей", role: "Водитель", number: "002" },
            { id: 3, name: "Сидоров Дмитрий", role: "Диспетчер", number: "003" },
            { id: 4, name: "Кузнецов Андрей", role: "Водитель", number: "004" },
            { id: 5, name: "Волков Максим", role: "Механик", number: "005" }
        ],
        shifts: [
            { id: 101, emp: 1, start: offset(0, 8), end: null },
            { id: 102, emp: 2, start: offset(0, 7), end: null },
            { id: 103, emp: 3, start: offset(1, 9), end: offset(1, 17) },
            { id: 104, emp: 4, start: offset(2, 8), end: offset(2, 18) },
            { id: 105, emp: 5, start: offset(3, 9), end: offset(3, 17) },
            { id: 106, emp: 1, start: offset(4, 8), end: offset(4, 16) },
            { id: 107, emp: 2, start: offset(5, 8), end: offset(5, 17) }
        ]
    };
}

let data;

try {
    data = JSON.parse(localStorage.getItem(KEY)) || seed();

    if (!Array.isArray(data.employees) || !Array.isArray(data.shifts)) {
        throw new Error("Invalid data");
    }
} catch {
    data = seed();
}

let page = "home";
let monthOffset = 0;
let selected = iso(now());
let modalSubmit = null;
let toastTimer;

function persist() {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
        toast("Не удалось сохранить данные в браузере");
    }
}

function emp(id) {
    return data.employees.find((employee) => employee.id === Number(id));
}

function duration(shift) {
    const start = toDate(shift.start);
    const end = shift.end && toDate(shift.end) < now()
        ? toDate(shift.end)
        : now();

    return Math.max(0, (end - start) / 3600000);
}

function state(shift) {
    if (toDate(shift.start) > now()) {
        return "planned";
    }

    if (shift.end && toDate(shift.end) <= now()) {
        return "done";
    }

    return "active";
}

function stateLabel(shift) {
    const labels = {
        done: "Завершена",
        planned: "Запланирована",
        active: "На смене"
    };

    return labels[state(shift)];
}

function toast(message) {
    const element = $("#toast");

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 2600);
}

function go(name) {
    page = name;

    $$(".page").forEach((element) => {
        element.classList.toggle("active", element.id === name);
    });

    $$(".navitem").forEach((element) => {
        element.classList.toggle("active", element.dataset.page === name);
    });

    const headings = {
        home: "Главная панель",
        employees: "Сотрудники",
        time: "Учёт времени",
        schedule: "График смен",
        reports: "Отчёты"
    };

    const crumbs = {
        home: "ОБЗОР",
        employees: "СОТРУДНИКИ",
        time: "УЧЁТ ВРЕМЕНИ",
        schedule: "ГРАФИК",
        reports: "ОТЧЁТЫ"
    };

    $("#heading").textContent = headings[name];
    $("#crumb").textContent = crumbs[name];

    render();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function emptyRow(columns) {
    return `<tr><td colspan="${columns}" class="emptymsg">Пока нет данных</td></tr>`;
}

function personCell(id) {
    const employee = emp(id);
    const name = employee?.name || "Удалён";

    const initials = name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("");

    return `
        <div class="namecell">
            <span class="initials">${esc(initials)}</span>
            ${esc(name)}
        </div>
    `;
}

function rowShift(shift, actions = true) {
    const status = state(shift);

    let buttons = "";

    if (actions) {
        buttons = `
            <td>
                <button class="tiny" data-edit-shift="${shift.id}">
                    Изменить
                </button>
                ${status === "active" ? `
                    <button class="tiny" data-finish="${shift.id}">
                        Завершить
                    </button>
                ` : ""}
                <button class="tiny danger" data-delete-shift="${shift.id}">
                    ×
                </button>
            </td>
        `;
    }

    const hours = status === "planned"
        ? "—"
        : `${fmt(duration(shift))} ч`;

    return `
        <tr>
            <td>${personCell(shift.emp)}</td>
            <td>${formatDate(shift.start)}</td>
            <td>${formatDate(shift.end)}</td>
            <td>${hours}</td>
            <td>
                <span class="status ${status}">
                    ${stateLabel(shift)}
                </span>
            </td>
            ${buttons}
        </tr>
    `;
}

function render() {
    const done = data.shifts.filter((shift) => state(shift) === "done");
    const active = data.shifts.filter((shift) => state(shift) === "active");

    const month = iso(now()).slice(0, 7);

    const monthlyHours = done
        .filter((shift) => iso(toDate(shift.start)).startsWith(month))
        .reduce((total, shift) => total + duration(shift), 0);

    $("#statEmployees").textContent = data.employees.length;
    $("#statActive").textContent = active.length;
    $("#statHours").textContent = fmt(monthlyHours);
    $("#statDone").textContent = done.length;

    const recent = [...data.shifts]
        .sort((a, b) => toDate(b.start) - toDate(a.start))
        .slice(0, 5);

    $("#recentRows").innerHTML = recent
        .map((shift) => rowShift(shift, false))
        .join("") || emptyRow(5);

    renderChart();
    renderEmployees();
    renderTime();
    renderCalendar();
    renderReports();
}

function renderChart() {
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = now();
        date.setDate(date.getDate() - i);

        const key = iso(date);

        const hours = data.shifts
            .filter((shift) => {
                return state(shift) === "done" &&
                    iso(toDate(shift.start)) === key;
            })
            .reduce((total, shift) => total + duration(shift), 0);

        values.push({ key, value: hours });
    }

    const max = Math.max(8, ...values.map((item) => item.value));

    $("#chart").innerHTML = values.map((item, index) => {
        const height = Math.max(3, item.value / max * 92);

        return `
            <div class="chartcol">
                <div
                    class="bar"
                    data-hours="${fmt(item.value)} ч"
                    title="${item.key}: ${fmt(item.value)} ч"
                    style="height:${height}%;animation-delay:${index * 60}ms"
                ></div>
                <small>
                    ${item.key.slice(-2)}.${item.key.slice(5, 7)}
                </small>
            </div>
        `;
    }).join("");
}

function renderEmployees() {
    const search = $("#employeeSearch").value.trim().toLowerCase();

    const employees = data.employees.filter((employee) => {
        const info = `${employee.name} ${employee.role} ${employee.number}`;
        return info.toLowerCase().includes(search);
    });

    $("#employeeCount").textContent = `${employees.length} сотрудников`;

    $("#employeeRows").innerHTML = employees.map((employee) => {
        const working = data.shifts.some((shift) => {
            return shift.emp === employee.id && state(shift) === "active";
        });

        return `
            <tr>
                <td>${personCell(employee.id)}</td>
                <td>${esc(employee.role)}</td>
                <td>${esc(employee.number)}</td>
                <td>
                    <span class="status ${working ? "active" : ""}">
                        ${working ? "На смене" : "Свободен"}
                    </span>
                </td>
                <td>
                    <button class="tiny" data-edit-employee="${employee.id}">
                        Изменить
                    </button>
                    <button class="tiny danger" data-delete-employee="${employee.id}">
                        Удалить
                    </button>
                </td>
            </tr>
        `;
    }).join("") || emptyRow(5);
}

function renderTime() {
    const filter = $("#timeFilter").value;

    const shifts = [...data.shifts]
        .sort((a, b) => toDate(b.start) - toDate(a.start))
        .filter((shift) => filter === "all" || state(shift) === filter);

    $("#timeRows").innerHTML = shifts
        .map((shift) => rowShift(shift))
        .join("") || emptyRow(6);

    const current = $("#quickEmployee").value;

    $("#quickEmployee").innerHTML = data.employees.map((employee) => {
        return `
            <option value="${employee.id}">
                ${esc(employee.name)} — ${esc(employee.role)}
            </option>
        `;
    }).join("");

    if (data.employees.some((employee) => String(employee.id) === current)) {
        $("#quickEmployee").value = current;
    }

    $("#startNow").disabled = data.employees.length === 0;
}

function renderCalendar() {
    const today = now();

    const date = new Date(
        today.getFullYear(),
        today.getMonth() + monthOffset,
        1
    );

    $("#monthLabel").textContent = date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric"
    });

    const firstDay = (date.getDay() + 6) % 7;
    const daysCount = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
    ).getDate();

    let html = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        .map((day) => `<div class="weekday">${day}</div>`)
        .join("");

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="day empty"></div>';
    }

    for (let day = 1; day <= daysCount; day++) {
        const key = iso(new Date(date.getFullYear(), date.getMonth(), day));

        const shifts = data.shifts
            .filter((shift) => iso(toDate(shift.start)) === key)
            .sort((a, b) => toDate(a.start) - toDate(b.start));

        const preview = shifts.slice(0, 2).map((shift) => {
            const name = emp(shift.emp)?.name || "Сотрудник";

            return `
                <span class="calendar-person">
                    <i class="calendar-dot ${state(shift)}"></i>
                    <b>${esc(name.split(" ")[0])}</b>
                    <em>${clock(shift.start)}</em>
                </span>
            `;
        }).join("");

        const countText = shifts.length === 1
            ? "смена"
            : shifts.length < 5 ? "смены" : "смен";

        const content = shifts.length
            ? `
                <span class="daycount">${shifts.length} ${countText}</span>
                ${preview}
                ${shifts.length > 2
                    ? `<small class="calendar-more">Ещё ${shifts.length - 2}</small>`
                    : ""}
            `
            : '<span class="daycount quiet">Нет смен</span>';

        const monthName = date.toLocaleDateString("ru-RU", {
            month: "long"
        });

        html += `
            <button
                class="day ${key === iso(now()) ? "today" : ""} ${key === selected ? "selected" : ""}"
                data-day="${key}"
                aria-label="${day} ${monthName}, смен: ${shifts.length}"
            >
                <span class="daynum">${day}</span>
                ${content}
            </button>
        `;
    }

    $("#calendar").innerHTML = html;
    renderDay();
}

function renderDay() {
    const shifts = data.shifts
        .filter((shift) => iso(toDate(shift.start)) === selected)
        .sort((a, b) => toDate(a.start) - toDate(b.start));

    $("#selectedTitle").textContent = new Date(
        selected + "T12:00"
    ).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    const active = shifts.filter((shift) => state(shift) === "active").length;
    const planned = shifts.filter((shift) => state(shift) === "planned").length;

    $("#daySummary").innerHTML = `
        <span>Всего смен: <b>${shifts.length}</b></span>
        <span>На смене: <b>${active}</b></span>
        <span>Запланировано: <b>${planned}</b></span>
    `;

    $("#dayShifts").innerHTML = shifts.map((shift) => {
        const employee = emp(shift.emp);
        const status = state(shift);

        let end = "До завершения";

        if (shift.end) {
            end = clock(shift.end);

            if (iso(toDate(shift.end)) !== selected) {
                end += " (след. день)";
            }
        }

        return `
            <article class="shiftcard">
                <div class="shiftcardtop">
                    <div>
                        <span class="shift-time">
                            ${clock(shift.start)} — ${end}
                        </span>
                        <span class="status ${status}">
                            ${stateLabel(shift)}
                        </span>
                    </div>
                    <button class="tiny" data-edit-shift="${shift.id}">
                        Изменить
                    </button>
                </div>

                <div class="shiftcardperson">
                    ${personCell(shift.emp)}
                    <span class="role-pill">${esc(employee?.role || "—")}</span>
                </div>

                ${status === "active" ? `
                    <button class="tiny finish-card" data-finish="${shift.id}">
                        ✓ Завершить смену сейчас
                    </button>
                ` : ""}
            </article>
        `;
    }).join("") || `
        <div class="emptymsg">
            На выбранную дату смен нет.
            Нажмите «Смена на этот день», чтобы назначить сотрудника.
        </div>
    `;
}

function reportData() {
    const month = $("#reportMonth").value;

    return data.employees.map((employee) => {
        const shifts = data.shifts.filter((shift) => {
            return shift.emp === employee.id &&
                state(shift) === "done" &&
                iso(toDate(shift.start)).startsWith(month);
        });

        return {
            ...employee,
            count: shifts.length,
            hours: shifts.reduce((total, shift) => total + duration(shift), 0)
        };
    });
}

function renderReports() {
    $("#reportRows").innerHTML = reportData().map((employee) => {
        return `
            <tr>
                <td>${personCell(employee.id)}</td>
                <td>${esc(employee.role)}</td>
                <td>${employee.count}</td>
                <td>${fmt(employee.hours)} ч</td>
            </tr>
        `;
    }).join("") || emptyRow(4);
}

function modal(title, html, handler) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = html;

    modalSubmit = handler;

    $("#modal").classList.add("open");
    $("#modal").setAttribute("aria-hidden", "false");

    $("#modalBody").querySelector("input,select,button")?.focus();
}

function closeModal() {
    $("#modal").classList.remove("open");
    $("#modal").setAttribute("aria-hidden", "true");

    modalSubmit = null;
}

function openEmployee(id) {
    const employee = emp(id) || {
        name: "",
        role: "Водитель",
        number: ""
    };

    const roles = [
        "Водитель",
        "Диспетчер",
        "Механик",
        "Логист",
        "Администратор"
    ];

    const options = roles.map((role) => {
        return `<option ${role === employee.role ? "selected" : ""}>${role}</option>`;
    }).join("");

    const html = `
        <div class="formgrid">
            <label class="field full">
                ФИО
                <input id="fName" required maxlength="80"
                    placeholder="Иванов Иван" value="${esc(employee.name)}">
            </label>

            <label class="field">
                Должность
                <select id="fRole">${options}</select>
            </label>

            <label class="field">
                Табельный номер
                <input id="fNumber" required maxlength="20"
                    value="${esc(employee.number)}" placeholder="006">
            </label>
        </div>
    `;

    modal(
        id ? "Редактировать сотрудника" : "Новый сотрудник",
        html,
        () => {
            const name = $("#fName").value.trim();
            const number = $("#fNumber").value.trim();
            const role = $("#fRole").value;

            if (!name || !number) {
                return toast("Заполните ФИО и номер");
            }

            const duplicate = data.employees.some((item) => {
                return item.id !== id && item.number === number;
            });

            if (duplicate) {
                return toast("Такой табельный номер уже существует");
            }

            if (id) {
                Object.assign(employee, { name, number, role });
            } else {
                data.employees.push({
                    id: Date.now(),
                    name,
                    number,
                    role
                });
            }

            persist();
            closeModal();
            render();
            toast("Сотрудник сохранён");
        }
    );
}

function openShift(day = null, id = null) {
    if (!data.employees.length) {
        return toast("Сначала добавьте сотрудника");
    }

    const shift = data.shifts.find((item) => item.id === id);

    const start = shift
        ? dateLocal(toDate(shift.start))
        : day ? `${day}T08:00` : dateLocal(now());

    const end = shift?.end ? dateLocal(toDate(shift.end)) : "";

    let mode = "active";

    if (shift) {
        mode = state(shift) === "done"
            ? "finished"
            : state(shift);
    } else if (day) {
        mode = "planned";
    }

    const options = data.employees.map((employee) => {
        const selectedOption = shift?.emp === employee.id ? "selected" : "";

        return `
            <option value="${employee.id}" ${selectedOption}>
                ${esc(employee.name)} — ${esc(employee.role)}
            </option>
        `;
    }).join("");

    const html = `
        <div class="formgrid">
            <label class="field full">
                Кто работает
                <select id="fEmp">${options}</select>
            </label>

            <div class="modepick" role="group" aria-label="Режим учёта">
                <button type="button" data-mode="planned"
                    class="${mode === "planned" ? "active" : ""}">
                    📅 По графику
                </button>
                <button type="button" data-mode="active"
                    class="${mode === "active" ? "active" : ""}">
                    ▶ Идёт сейчас
                </button>
                <button type="button" data-mode="finished"
                    class="${mode === "finished" ? "active" : ""}">
                    ✓ Уже отработана
                </button>
            </div>

            <label class="field">
                Начало смены
                <input type="datetime-local" required id="fStart" value="${start}">
            </label>

            <label class="field" id="endField">
                Конец смены
                <input type="datetime-local" id="fEnd" value="${end}">
            </label>

            <p class="hint" id="shiftHint"></p>
        </div>
    `;

    modal(shift ? "Изменить смену" : "Назначить смену", html, () => {
        const startValue = $("#fStart").value;
        const endValue = $("#fEnd").value;
        const chosen = $(".modepick button.active")?.dataset.mode;
        const employeeId = Number($("#fEmp").value);

        if (!startValue) {
            return toast("Укажите начало смены");
        }

        if (chosen !== "active" && !endValue) {
            return toast("Укажите окончание смены");
        }

        if (chosen !== "active" && toDate(endValue) <= toDate(startValue)) {
            return toast("Конец смены должен быть позже начала");
        }

        if (chosen === "finished" && toDate(endValue) > now()) {
            return toast("Нельзя завершить смену будущим временем");
        }

        if (chosen === "active" && toDate(startValue) > now()) {
            return toast("Смена ещё не началась — выберите «По графику»");
        }

        const hasActive = data.shifts.some((item) => {
            return item.id !== id &&
                item.emp === employeeId &&
                state(item) === "active";
        });

        if (chosen === "active" && hasActive) {
            return toast("У сотрудника уже есть активная смена");
        }

        const record = {
            id: id || Date.now(),
            emp: employeeId,
            start: toDate(startValue).toISOString(),
            end: chosen === "active" ? null : toDate(endValue).toISOString()
        };

        if (id) {
            Object.assign(shift, record);
        } else {
            data.shifts.push(record);
        }

        persist();
        closeModal();
        render();
        toast("Смена сохранена");
    });

    function syncMode() {
        const currentMode = $(".modepick button.active")?.dataset.mode;
        const isActive = currentMode === "active";

        $("#endField").style.display = isActive ? "none" : "grid";
        $("#fEnd").required = !isActive;

        const hints = {
            planned: "Укажите начало и конец. Статус смены автоматически изменится по времени: запланирована → на смене → завершена.",
            finished: "Для уже прошедшей смены укажите фактическое время начала и окончания.",
            active: "Для смены, которая уже началась. Завершите её позже отдельной кнопкой."
        };

        $("#shiftHint").textContent = hints[currentMode];
    }

    $$(".modepick button").forEach((button) => {
        button.addEventListener("click", () => {
            $$(".modepick button").forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            if (button.dataset.mode !== "active" && !$("#fEnd").value) {
                const date = toDate($("#fStart").value);
                date.setHours(date.getHours() + 12);
                $("#fEnd").value = dateLocal(date);
            }

            syncMode();
        });
    });

    syncMode();
}

function finish(id) {
    const shift = data.shifts.find((item) => item.id === id);

    if (!shift || state(shift) !== "active") return;
    if (!confirm("Завершить смену сейчас?")) return;

    shift.end = now().toISOString();

    persist();
    render();
    toast("Смена завершена");
}

function deleteShift(id) {
    if (!confirm("Удалить смену?")) return;

    data.shifts = data.shifts.filter((shift) => shift.id !== id);

    persist();
    render();
    toast("Смена удалена");
}

function deleteEmployee(id) {
    if (!confirm("Удалить сотрудника и все его смены?")) return;

    data.employees = data.employees.filter((employee) => employee.id !== id);
    data.shifts = data.shifts.filter((shift) => shift.emp !== id);

    persist();
    render();
    toast("Сотрудник удалён");
}

function startNow() {
    const id = Number($("#quickEmployee").value);

    if (!emp(id)) {
        return toast("Выберите сотрудника");
    }

    const working = data.shifts.some((shift) => {
        return shift.emp === id && state(shift) === "active";
    });

    if (working) {
        return toast("Этот сотрудник уже на смене");
    }

    data.shifts.push({
        id: Date.now(),
        emp: id,
        start: now().toISOString(),
        end: null
    });

    persist();
    render();
    toast("Смена началась");
}

function exportCSV() {
    const rows = [
        ["Сотрудник", "Должность", "Смен", "Часов"],
        ...reportData().map((employee) => [
            employee.name,
            employee.role,
            employee.count,
            fmt(employee.hours)
        ])
    ];

    const csv = "\ufeff" + rows.map((row) => {
        return row.map((value) => {
            return '"' + String(value).replace(/"/g, '""') + '"';
        }).join(";");
    }).join("\r\n");

    const file = new Blob([csv], {
        type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tabel-${$("#reportMonth").value}.csv`;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast("Табель скачан");
}

document.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.dataset.page) {
        go(button.dataset.page);
    }

    if (button.dataset.action) {
        const action = button.dataset.action;

        if (action === "add-shift") openShift();
        if (action === "add-employee") openEmployee();
        if (action === "go-schedule") go("schedule");
        if (action === "go-time") go("time");
    }

    if (button.dataset.day) {
        selected = button.dataset.day;

        $$(".day").forEach((item) => {
            item.classList.toggle("selected", item === button);
        });

        renderDay();
    }

    if (button.dataset.editEmployee) {
        openEmployee(Number(button.dataset.editEmployee));
    }

    if (button.dataset.deleteEmployee) {
        deleteEmployee(Number(button.dataset.deleteEmployee));
    }

    if (button.dataset.editShift) {
        openShift(null, Number(button.dataset.editShift));
    }

    if (button.dataset.deleteShift) {
        deleteShift(Number(button.dataset.deleteShift));
    }

    if (button.dataset.finish) {
        finish(Number(button.dataset.finish));
    }
});

$("#employeeSearch").addEventListener("input", renderEmployees);
$("#timeFilter").addEventListener("change", renderTime);
$("#reportMonth").addEventListener("change", renderReports);

$("#startNow").addEventListener("click", startNow);
$("#downloadCsv").addEventListener("click", exportCSV);

$("#addSelected").addEventListener("click", () => {
    openShift(selected);
});

$("#prevMonth").addEventListener("click", () => {
    monthOffset--;

    const today = now();
    selected = iso(new Date(
        today.getFullYear(),
        today.getMonth() + monthOffset,
        1
    ));

    renderCalendar();
});

$("#nextMonth").addEventListener("click", () => {
    monthOffset++;

    const today = now();
    selected = iso(new Date(
        today.getFullYear(),
        today.getMonth() + monthOffset,
        1
    ));

    renderCalendar();
});

$("#currentMonth").addEventListener("click", () => {
    monthOffset = 0;
    selected = iso(now());
    renderCalendar();
});

$("#modalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    modalSubmit?.();
});

$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

$("#modal").addEventListener("click", (event) => {
    if (event.target === $("#modal")) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});

$("#today").textContent = now().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

$("#reportMonth").value = iso(now()).slice(0, 7);

render();

setInterval(() => {
    if (!document.hidden) {
        render();
    }
}, 60000);
