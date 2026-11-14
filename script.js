
const categoriesByType = {
  entrada: [
    "Água via oral",
    "Dieta líquida",
    "Infusão intravenosa"
  ],
  saida: [
    "Diurese",
    "Êmese",
    "Drenagem por dispositivo",
    "Outras perdas mensuradas"
  ]
};

const sectors = [
  "Enfermaria",
  "Clínica médica",
  "Clínica cirúrgica",
  "Sala amarela",
  "Sala vermelha",
  "Pediatria",
  "CTI",
  "UTI",
  "UTI neonatal (UTI Neo)",
  "Pronto atendimento",
  "Outro"
];

let patients = [];
let records = [];
let selectedSummaryPatient = "";

const $ = (id) => document.getElementById(id);

function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatVolume(value) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 1
  })} mL`;
}

function getPatientTotals(patientId) {
  const patientRecords = records.filter(
    record => record.patientId === patientId
  );

  const input = patientRecords
    .filter(record => record.type === "entrada")
    .reduce((sum, record) => sum + record.volume, 0);

  const output = patientRecords
    .filter(record => record.type === "saida")
    .reduce((sum, record) => sum + record.volume, 0);

  return {
    input,
    output,
    balance: input - output
  };
}

function getStatus(balance) {
  if (balance > 0) {
    return {
      label: "Positivo",
      className: "positive"
    };
  }

  if (balance < 0) {
    return {
      label: "Negativo",
      className: "negative"
    };
  }

  return {
    label: "Neutro",
    className: "neutral"
  };
}

function getLocalDateTime() {
  const now = new Date();

  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

// NAVEGAÇÃO

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );
  });

  const titles = {
    dashboard: "Dashboard",
    patients: "Pacientes",
    records: "Registros"
  };

  $("page-title").textContent =
    titles[pageId] || "HidroCare";
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

// CATEGORIAS DE ENTRADAS E SAÍDAS

function updateCategories() {
  const type = $("record-type").value;
  const categorySelect = $("record-category");

  categorySelect.innerHTML = "";

  if (!type || !categoriesByType[type]) {
    categorySelect.add(
      new Option("Selecione primeiro o tipo", "")
    );

    categorySelect.disabled = true;
    return;
  }

  categorySelect.add(
    new Option("Selecione a descrição", "")
  );

  categoriesByType[type].forEach(category => {
    categorySelect.add(
      new Option(category, category)
    );
  });

  categorySelect.disabled = false;
}

$("record-type").addEventListener(
  "change",
  updateCategories
);

// ATUALIZAÇÃO DOS CAMPOS DE PACIENTES

function updatePatientSelects() {
  const recordSelect = $("record-patient");
  const summarySelect = $("summary-patient");

  const previousRecord = recordSelect.value;

  const previousSummary =
    selectedSummaryPatient || summarySelect.value;

  recordSelect.innerHTML = "";
  summarySelect.innerHTML = "";

  recordSelect.add(
    new Option(
      patients.length
        ? "Selecione um paciente"
        : "Cadastre um paciente primeiro",
      ""
    )
  );

  summarySelect.add(
    new Option("Selecione um paciente", "")
  );

  patients.forEach(patient => {
    const label =
      `${patient.code} — Leito ${patient.bed}`;

    recordSelect.add(
      new Option(label, patient.id)
    );

    summarySelect.add(
      new Option(label, patient.id)
    );
  });

  if (
    patients.some(patient => patient.id === previousRecord)
  ) {
    recordSelect.value = previousRecord;
  }

  if (
    patients.some(patient => patient.id === previousSummary)
  ) {
    summarySelect.value = previousSummary;
    selectedSummaryPatient = previousSummary;
  }
}

// LISTA DE PACIENTES

function renderPatientList() {
  const container = $("patient-list");

  if (!patients.length) {
    container.className = "patient-list empty-state";

    container.textContent =
      "Nenhum paciente cadastrado ainda.";

    return;
  }

  container.className = "patient-list";

  container.innerHTML = patients.map(patient => `
    <div class="patient-row">
      <div>
        <strong>
          ${safeText(patient.code)}
          — Leito ${safeText(patient.bed)}
        </strong>

        <p>${safeText(patient.sector)}</p>
      </div>

      <span class="balance-pill neutral">
        Cadastrado
      </span>
    </div>
  `).join("");
}

// DASHBOARD

function renderDashboard() {
  $("total-patients").textContent = patients.length;

  const input = records
    .filter(record => record.type === "entrada")
    .reduce((sum, record) => sum + record.volume, 0);

  const output = records
    .filter(record => record.type === "saida")
    .reduce((sum, record) => sum + record.volume, 0);

  const balance = input - output;
  const status = getStatus(balance);

  $("total-input").textContent = formatVolume(input);
  $("total-output").textContent = formatVolume(output);

  $("total-balance").textContent =
    `${balance > 0 ? "+" : ""}${formatVolume(balance)}`;

  $("total-balance").className = status.className;

  $("total-balance-status").textContent =
    `Balanço ${status.label.toLowerCase()}`;

  const container = $("dashboard-patients");

  if (!patients.length) {
    container.className = "patient-cards empty-state";

    container.textContent =
      "Nenhum paciente cadastrado ainda.";

    return;
  }

  container.className = "patient-cards";

  container.innerHTML = patients.map(patient => {
    const totals = getPatientTotals(patient.id);

    const patientStatus = getStatus(totals.balance);

    return `
      <article class="patient-card">

        <div class="patient-card-top">

          <div>
            <strong>
              ${safeText(patient.code)}
              — Leito ${safeText(patient.bed)}
            </strong>

            <p>${safeText(patient.sector)}</p>
          </div>

          <span class="balance-pill ${patientStatus.className}">
            ${patientStatus.label}
          </span>

        </div>

        <p>
          Entradas: ${formatVolume(totals.input)}
          ·
          Saídas: ${formatVolume(totals.output)}
        </p>

        <p>
          <strong>
            Balanço:
            ${totals.balance > 0 ? "+" : ""}
            ${formatVolume(totals.balance)}
          </strong>
        </p>

      </article>
    `;
  }).join("");
}

// RESUMO INDIVIDUAL DO PACIENTE

function renderPatientSummary() {
  const patientId = $("summary-patient").value;

  selectedSummaryPatient = patientId;

  const summary = $("patient-summary");
  const history = $("record-list");

  if (!patientId) {
    summary.className = "summary-placeholder";

    summary.textContent =
      "Cadastre um paciente e selecione-o para visualizar o balanço.";

    history.className = "record-list empty-state";

    history.textContent =
      "Selecione um paciente para visualizar o histórico.";

    return;
  }

  const patient = patients.find(
    item => item.id === patientId
  );

  if (!patient) return;

  const totals = getPatientTotals(patientId);
  const status = getStatus(totals.balance);

  summary.className = "";

  summary.innerHTML = `

    <div class="summary-grid">

      <div class="summary-metric">
        <span>TOTAL DE ENTRADAS</span>
        <strong>${formatVolume(totals.input)}</strong>
      </div>

      <div class="summary-metric">
        <span>TOTAL DE SAÍDAS</span>
        <strong>${formatVolume(totals.output)}</strong>
      </div>

      <div class="summary-metric">
        <span>REGISTROS</span>
        <strong>
          ${records.filter(
            record => record.patientId === patientId
          ).length}
        </strong>
      </div>

    </div>

    <div class="balance-result ${status.className}">

      <div>
        <span>
          BALANÇO HÍDRICO — ${safeText(patient.code)}
        </span>

        <div>
          <strong>
            ${totals.balance > 0 ? "+" : ""}
            ${formatVolume(totals.balance)}
          </strong>
        </div>
      </div>

      <span class="balance-pill ${status.className}">
        Resultado ${status.label.toLowerCase()}
      </span>

    </div>

    <p class="footer-note">
      Cálculo demonstrativo: total de entradas menos total de saídas.
      O período considerado é o conjunto de registros cadastrados
      para este paciente.
    </p>

  `;

  // HISTÓRICO

  const patientRecords = records
    .filter(record => record.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!patientRecords.length) {
    history.className = "record-list empty-state";

    history.textContent =
      "Ainda não há registros para este paciente.";

    return;
  }

  history.className = "record-list";

  history.innerHTML = patientRecords.map(record => {

    const date = new Date(record.date);

    const dateText = Number.isNaN(date.getTime())
      ? record.date
      : date.toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short"
        });

    const isInput = record.type === "entrada";

    return `

      <div class="record-row">

        <div class="record-main">

          <strong>
            ${isInput ? "Entrada" : "Saída"}
            — ${safeText(record.category)}
          </strong>

          <p>${safeText(dateText)}</p>

        </div>

        <div class="record-volume ${
          isInput ? "positive" : "negative"
        }">

          ${isInput ? "+" : "−"}
          ${formatVolume(record.volume)}

        </div>

      </div>

    `;

  }).join("");
}

// CADASTRO DE PACIENTES

$("patient-form").addEventListener("submit", event => {
  event.preventDefault();

  const code = $("patient-code").value.trim();
  const bed = $("patient-bed").value.trim();
  const sector = $("patient-sector").value;

  if (!code || !bed || !sectors.includes(sector)) {
    alert("Preencha os campos e selecione um setor válido.");
    return;
  }

  const codeExists = patients.some(patient =>
    patient.code.toLowerCase() === code.toLowerCase()
  );

  if (codeExists) {
    alert(
      "Já existe um paciente com esse código. Informe outro código."
    );
    return;
  }

  patients.push({
    id: (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random()}`,

    code,
    bed,
    sector
  });

  $("patient-form").reset();

  updatePatientSelects();
  renderAll();

  alert("Paciente cadastrado no protótipo.");
});

// CADASTRO DE ENTRADAS E SAÍDAS

$("record-form").addEventListener("submit", event => {
  event.preventDefault();

  const patientId = $("record-patient").value;
  const type = $("record-type").value;
  const category = $("record-category").value;
  const volume = Number($("record-volume").value);
  const date = $("record-date").value;

  if (
    !patients.some(patient => patient.id === patientId)
  ) {
    alert("Selecione um paciente cadastrado.");
    return;
  }

  if (
    !categoriesByType[type] ||
    !categoriesByType[type].includes(category)
  ) {
    alert(
      "Selecione uma descrição compatível com o tipo de registro."
    );
    return;
  }

  if (!Number.isFinite(volume) || volume <= 0) {
    alert("Informe um volume maior que zero.");
    return;
  }

  if (!date || Number.isNaN(new Date(date).getTime())) {
    alert("Informe uma data e hora válidas.");
    return;
  }

  records.push({
    id: `r-${Date.now()}-${Math.random()}`,
    patientId,
    type,
    category,
    volume,
    date
  });

  $("record-form").reset();

  $("record-date").value = getLocalDateTime();

  updateCategories();

  $("summary-patient").value = patientId;
  selectedSummaryPatient = patientId;

  renderAll();

  alert("Registro adicionado ao protótipo.");
});

// ATUALIZAÇÃO DO RESUMO AO TROCAR PACIENTE

$("summary-patient").addEventListener(
  "change",
  renderPatientSummary
);

// ATUALIZA TODAS AS ÁREAS

function renderAll() {
  renderPatientList();
  renderDashboard();
  renderPatientSummary();
}

// INICIALIZAÇÃO

$("record-date").value = getLocalDateTime();

updateCategories();
updatePatientSelects();
renderAll();
