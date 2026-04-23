const container = document.querySelector(".container");

// 1. Mantenha os Event Listeners fora da função de busca para evitar duplicidade
function setupListeners() {
  const searchInput = document.getElementById("inputBusca");

  if (searchInput) {
    searchInput.addEventListener("keyup", function () {
      const filter = searchInput.value.toLowerCase();
      const containers = document.querySelectorAll(".bloco-container");

      containers.forEach((blockContainer) => {
        let hasVisibleRows = false;
        const rows = blockContainer.querySelectorAll("tbody tr");
        const header = blockContainer.querySelector(".bloco-header");
        const content = blockContainer.querySelector(".content");

        rows.forEach((row) => {
          const text = row.textContent.toLowerCase();
          if (text.includes(filter)) {
            row.style.display = "";
            hasVisibleRows = true;
          } else {
            row.style.display = "none";
          }
        });

        // Lógica de exibição do bloco
        if (filter !== "") {
          if (hasVisibleRows) {
            blockContainer.style.display = "";
            header.classList.add("active");
            content.classList.add("show");
            content.style.maxHeight = "none"; // Abre para mostrar os resultados
          } else {
            blockContainer.style.display = "none";
          }
        } else {
          // Reset quando a busca está vazia
          blockContainer.style.display = "";
          header.classList.remove("active");
          content.classList.remove("show");
          content.style.maxHeight = "0px";
        }
      });
    });
  }

  // Listener de Clique (Accordion)
  container.addEventListener("click", function (e) {
    const header = e.target.closest(".bloco-header");
    if (!header) return;

    const content = header.nextElementSibling;
    header.classList.toggle("active");

    if (content.classList.contains("show")) {
      content.style.maxHeight = content.scrollHeight + "px";
      content.offsetHeight; // force repaint
      content.classList.remove("show");
      content.style.maxHeight = "0px";
    } else {
      content.classList.add("show");
      content.style.maxHeight = content.scrollHeight + "px";
      setTimeout(() => {
        if (content.classList.contains("show"))
          content.style.maxHeight = "none";
      }, 400);
    }
  });
}

async function searchData() {
  const FIREBASE_URL =
    "https://sistema-chromebook-default-rtdb.firebaseio.com/.json";

  try {
    const busca = await fetch(FIREBASE_URL);
    let dadosRaw = await busca.json();
    console.log(dadosRaw);

    if (!dadosRaw) return;

    // 1. Normalização e Atribuição de Período
    const dados = (
      Array.isArray(dadosRaw) ? dadosRaw.flat() : Object.values(dadosRaw).flat()
    ).map((item) => {
      const horario = item.horario || item.HorárioInicial || "00:00";

      // Extrair apenas a hora (ex: "08:30" vira 8)
      const horaSempre = parseInt(horario.split(":")[0]);
      let periodo = "";

      if (horaSempre >= 6 && horaSempre < 12) {
        periodo = "Manhã";
      } else if (horaSempre >= 12 && horaSempre < 18) {
        periodo = "Tarde";
      } else {
        periodo = "Noite";
      }

      return {
        bloco: String(item.bloco || item.Bloco || ""),
        horarioProva: horario,
        horarioAbertura: item.horarioAbertura || "",
        local: item.local || item.Local || item.Espaço || "",
        data: item.data || item.Data || "",
        carrinhos: item.carrinhos || "",
        quantidade: item.quantidade || "",
        observacao: item.observacao || "",
        periodo: periodo,
        responsavel: item.responsavel || "",
      };
    });

    const dataExibicaoRaw = dados[0]?.data || "";

    let dataExibicao = dataExibicaoRaw;
    if (dataExibicaoRaw.includes("-")) {
      const partes = dataExibicaoRaw.split("-"); // Divide 2026-04-20 em ["2026", "04", "20"]
      if (partes[0].length === 4) {
        // Verifica se o primeiro item é o ano
        dataExibicao = `${partes[2]}/${partes[1]}/${partes[0]}`; // Remonta como 20/04/2026
      } else {
        dataExibicao = dataExibicaoRaw.replace(/-/g, "/"); // Caso já esteja na ordem, apenas troca o traço
      }
    }

    // 2. Ordenação (Horário e Local)
    dados.sort(
      (a, b) =>
        a.horarioProva.localeCompare(b.horarioProva) ||
        a.local.localeCompare(b.local),
    );

    // 3. Definição dos Períodos para exibição
    const periodos = ["Manhã", "Tarde", "Noite"];
    let htmlContent = `
    <div class="tituloContainer">
    <h1>Chromebooks</h1>
    <h2 class="tituloDia">DIA ${dataExibicao}</h2>
    </div>`;

    periodos.forEach((periodo) => {
      // Filtra os dados que pertencem a este período
      const dadosFiltrados = dados.filter((item) => item.periodo === periodo);

      // Só cria a seção se houver dados para aquele período
      if (dadosFiltrados.length > 0) {
        const linhas = dadosFiltrados
          .map(
            (item) => `
  <tr>       
    <td data-label="Bloco">${item.bloco}</td>
    <td data-label="Local">${item.local}</td> 
    <td data-label="Abertura">${item.horarioAbertura}</td>
    <td data-label="Horário Prova">${item.horarioProva}</td>
    <td data-label="Carrinhos">${item.carrinhos}</td>
    <td data-label="Quantidade">${item.quantidade}</td>
    <td data-label="Observção">${item.observacao}</td>
    <td data-label="Responsável">${item.responsavel}</td>  
  </tr>
`,
          )
          .join("");
        htmlContent += `
          <div class="bloco-container">
            <div class="bloco-header">Período: ${periodo}</div>
            <div class="content">
              <div class="table-scroll-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Bloco</th>
                      <th>Local</th>
                      <th>Horário Abertura</th>
                      <th>Horário Prova</th>
                      <th>Carrinhos</th>
                      <th>Quantidade</th>
                      <th>Observação</th>
                      <th>Responsável</th>
                    </tr>
                  </thead>
                  <tbody class="tabela-body">${linhas}</tbody>
                </table>
              </div>
            </div>
          </div>`;
      }
    });

    container.innerHTML = htmlContent;
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    container.innerHTML = "<h2>Erro ao carregar as reservas.</h2>";
  }
}

// Inicialização
setupListeners();
searchData();
