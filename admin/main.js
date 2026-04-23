const fileInput = document.getElementById("csv-file");
const fileNameDisplay = document.getElementById("file-name");
const content = document.querySelector(".tabela-body");
const container = document.querySelector(".bloco-container");
const btnSave = document.querySelector(".btn-save");
const btnUpdate = document.querySelector(".btn-update");
const btnEditarVistas = document.getElementById("btn-editar-vistas");
const btnLimpar = document.getElementById("btn-limpar-tabela");

fileInput.addEventListener("change", async function (e) {
  const arquivos = Array.from(this.files);
  if (arquivos.length === 0) return;

  fileNameDisplay.textContent =
    arquivos.length > 1 ? `${arquivos.length} arquivos` : arquivos[0].name;
  let todasAsLinhasHtml = "";

  for (const arquivo of arquivos) {
    const texto = await lerArquivo(arquivo);
    const dadosJson = csvToJson(texto);

    // FILTRO: Usando chaves minúsculas conforme a normalização nova
    const apenasChromebooks = dadosJson.filter(
      (item) => item.pedido && item.pedido.toLowerCase().includes("chromebook"),
    );

    console.log(
      `Arquivo: ${arquivo.name} | Encontrados: ${apenasChromebooks.length}`,
    );

    apenasChromebooks.forEach((item) => {
      // Ajuste aqui para usar as chaves minúsculas
      let localOriginal = (item.local || "").trim();
      let numeroBloco = "";

      const blocos = {
        10: [
          "Laboratório de Informática 15",
          "Laboratório de Informática 16",
          "Laboratório de Informática 17",
          "Laboratório de Informática 18",
          "Laboratório de Informática 19",
          "Laboratório de Informática 20",
          "Laboratório de Informática 21",
          "Laboratório de Informática 22",
          "Laboratório de Desenho V",
          "Laboratório de Desenho IV",
          "Laboratório de Desenho I e II",
          "Auditório Carlos Alexandre",
          "(Bloco 10)",
        ],
        8: [
          "Laboratório de Informática 23",
          "Laboratório de Informática 24",
          "Laboratório de Informática 25",
          "(Bloco 8)",
        ],
        7: [
          "Cozinha Fria",
          "Sala Invertida",
          "Sala Apollo 11",
          "Sala Chuva de Meteoros",
          "Sala Nicolau Copérnico",
          "Sala Via Láctea",
          "Laboratório de Informática 7",
          "Laboratório de Informática 8",
          "Laboratório de Informática 9",
          "Laboratório de Informática 10",
          "Laboratório de Informática 11",
          "Laboratório de Informática 12",
          "Laboratório de Informática 13",
          "Laboratório de Informática 14",
          "Auditório Dorival Moreschi",
          "Auditório Dona Etelvina",
          "Sala Stephen Hawking",
          "(Bloco 7)",
        ],
        6: [
          "Tutoria",
          "Auditório Professor Joaquim Lauer",
          "Auditório de Medicina",
          "Auditório de Odontologia",
          "(Bloco 6)",
        ],
      };
      for (const [numero, salas] of Object.entries(blocos)) {
        if (salas.some((sala) => localOriginal.includes(sala))) {
          numeroBloco = numero;
          break;
        }
      }

      // Lógica de horários (use item.horario)
      let horarioBruto = (item.horario || "").replace(/h/g, ":");
      let partesHorario = horarioBruto.split("-").map((p) => p.trim());
      const horarioAbertura = partesHorario[0] || "";
      const inicioProvaComDelay = adicionarTrintaMinutos(horarioAbertura);
      const fimOriginal = partesHorario[1] || "";
      const horarioProvaFormatado = fimOriginal
        ? `${inicioProvaComDelay} - ${fimOriginal}`
        : inicioProvaComDelay;

      todasAsLinhasHtml += `
        <tr>
          <td><input type="checkbox" class="row-checkbox"></td>
          <td>${formatarDataBR(item.datadareserva)}</td>
          <td>${item.usuario || item.responsavel || ""}</td>
          <td style="text-align: center; font-weight: bold;">${numeroBloco}</td> 
          <td>${localOriginal.replace(/\s*\(.*?\)\s*/g, " ").trim()}</td> 
          <td>${horarioAbertura}</td>
          <td>${horarioProvaFormatado}</td>
          <td>${gerarHtmlCarrinhos()}</td>
          <td style="text-align: center;">${item.quantidade || "0"}</td>
          <td><input type="text" class="searchInput" placeholder="Obs"></td>
          <td><button class="btn-delete">Excluir</button></td>
        </tr>
      `;
    });
  }

  // Insere tudo no final da tabela sem apagar o que já existe
  content.insertAdjacentHTML("beforeend", todasAsLinhasHtml);
});
function csvToJson(csv) {
  const todasAsLinhas = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  // BUSCA RIGOROSA: Só aceita como cabeçalho se a linha tiver Usuario E Local E Pedido
  const indexCabecalho = todasAsLinhas.findIndex((linha) => {
    const l = linha
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return l.includes("usuario") && l.includes("local") && l.includes("pedido");
  });

  if (indexCabecalho === -1) return [];

  const cabecalhos = todasAsLinhas[indexCabecalho]
    .split(";")
    .map((c) => c.trim());
  const dados = todasAsLinhas.slice(indexCabecalho + 1);

  // Normaliza as chaves para minúsculas e sem acento (ex: "pedido", "local", "datadareserva")
  const cabecalhosLimpos = cabecalhos.map((header) => {
    return header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  });

  return dados.map((linha) => {
    const valores = linha.split(";");
    const objeto = {};
    cabecalhosLimpos.forEach((chave, i) => {
      objeto[chave] = valores[i] ? valores[i].trim() : "";
    });
    return objeto;
  });
}

function lerArquivo(file) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = (e) => resolve(e.target.result);
    leitor.onerror = (e) => reject(e);
    // Usamos ISO-8859-1 para garantir que "Usuário" não vire "Usurio"
    leitor.readAsText(file, "ISO-8859-1");
  });
}

container.addEventListener("click", function (event) {
  const btnDelete = event.target.closest(".btn-delete");

  if (btnDelete) {
    const linha = btnDelete.closest("tr");
    if (confirm("Deseja excluir?")) {
      linha.remove();
    }
  }
});

btnSave.addEventListener("click", function () {
  const dadosParaSalvar = capturarDadosDaTabela(); // Usa a função corrigida acima

  if (dadosParaSalvar.length === 0) {
    alert("⚠️ Nenhuma reserva encontrada para salvar.");
    return;
  }

  if (typeof window.salvarNoFirebase === "function") {
    window.salvarNoFirebase(dadosParaSalvar).then(() => {
      content.innerHTML = "";
      fileInput.value = "";
      fileNameDisplay.textContent = "Nenhum arquivo selecionado";
      alert("✅ Dados salvos com sucesso!");
    });
  }
});

function capturarDadosDaTabela() {
  const dadosParaSalvar = [];
  const linhas = document.querySelectorAll(".tabela-body tr");

  // Função auxiliar para pegar o valor independente de ser input ou texto
  const pegarValor = (celula) => {
    if (!celula) return "";

    // 1. Prioridade: Multi-select de carrinhos
    const multiSelect = celula.querySelector(".multiselect");
    if (multiSelect) {
      const selecionados = multiSelect.querySelectorAll(
        'input[type="checkbox"]:checked',
      );
      return Array.from(selecionados)
        .map((cb) => cb.value)
        .join(", ");
    }

    // 2. Segunda prioridade: Inputs ou Selects (para linhas adicionadas manualmente ou em edição)
    const input = celula.querySelector("input:not(.row-checkbox), select");
    if (input) return input.value.trim();

    // 3. Terceira prioridade: Texto puro (para dados que vieram do CSV e apenas foram renderizados)
    return celula.innerText.trim();
  };

  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll("td");
    if (colunas.length < 5) return;

    // Identificamos se é o "Modo Edição" pela ausência do checkbox na primeira coluna
    // ou pela presença do cabeçalho fixo de edição
    const temCheckboxSelecao = colunas[0].querySelector(".row-checkbox");
    let reserva = {};

    if (temCheckboxSelecao) {
      // ESTRUTURA: CSV OU ADICIONAR NOVO (10 colunas)
      // 0: Check | 1: Data | 2: Bloco | 3: Local | 4: Abertura | 5: Prova | 6: Carrinhos | 7: Qtd | 8: Obs
      reserva = {
        data: pegarValor(colunas[1]),
        responsavel: pegarValor(colunas[2]),
        bloco: pegarValor(colunas[3]),
        local: pegarValor(colunas[4]),
        horarioAbertura: pegarValor(colunas[5]),
        horario: pegarValor(colunas[6]),
        carrinhos: pegarValor(colunas[7]),
        quantidade: pegarValor(colunas[8]),
        observacao: pegarValor(colunas[9]),
      };
    } else {
      // ESTRUTURA: MODO EDIÇÃO (9 colunas)
      // 0: Data | 1: Bloco | 2: Abertura | 3: Prova | 4: Local | 5: Carrinhos | 6: Qtd | 7: Obs
      reserva = {
        data: pegarValor(colunas[0]),
        responsavel: pegarValor(colunas[1]),
        bloco: pegarValor(colunas[2]),
        horarioAbertura: pegarValor(colunas[3]),
        horario: pegarValor(colunas[4]),
        local: pegarValor(colunas[5]),
        carrinhos: pegarValor(colunas[6]),
        quantidade: pegarValor(colunas[7]),
        observacao: pegarValor(colunas[8]),
      };
    }

    // Só adiciona se houver pelo menos uma data ou local preenchido
    if (reserva.data || reserva.local) {
      dadosParaSalvar.push(reserva);
    }
  });

  return dadosParaSalvar;
}

btnUpdate.addEventListener("click", function () {
  const dados = capturarDadosDaTabela();

  if (dados.length === 0) {
    alert("⚠️ Nenhuma reserva para adicionar.");
    return;
  }

  if (typeof window.atualizarNoFirebase === "function") {
    window.atualizarNoFirebase(dados).then(() => {
      // Limpa após atualizar
      content.innerHTML = "";
      fileInput.value = "";
      fileNameDisplay.textContent = "Nenhum arquivo selecionado";
    });
  } else {
    alert("❌ Erro: Função de atualização não encontrada.");
  }
});

btnLimpar.addEventListener("click", function () {
  // 1. Pedir confirmação ao usuário
  const confirmar = confirm(
    "Tem certeza que deseja limpar toda a tabela? Os dados não salvos serão perdidos.",
  );

  if (confirmar) {
    // 2. Limpar o corpo da tabela
    const content = document.querySelector(".tabela-body");
    if (content) {
      content.innerHTML = "";
    }

    // 3. Resetar o campo de arquivo (upload)
    const fileInput = document.getElementById("csv-file");
    const fileNameDisplay = document.getElementById("file-name");

    if (fileInput) fileInput.value = "";
    if (fileNameDisplay)
      fileNameDisplay.textContent = "Nenhum arquivo selecionado";

    console.log("Tabela esvaziada pelo usuário.");
  }
});

function filtrarTabela(criterio) {
  const linhas = document.querySelectorAll(".tabela-body tr");

  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll("td");
    if (colunas.length < 3) return; // Pula linhas vazias

    // O Bloco geralmente está na Coluna 2 (índice 1 ou 2 dependendo da origem)
    // Vamos buscar o elemento que contém o número do bloco
    const celulaBloco = colunas[2];
    const inputBloco = celulaBloco.querySelector("input");

    // Pega o valor do input ou o texto da célula
    const valorBloco = inputBloco
      ? inputBloco.value.trim()
      : celulaBloco.innerText.trim();

    // Lógica do Filtro
    if (criterio === "todos") {
      linha.style.display = "";
    } else if (criterio === "auditorio") {
      // Filtro especial para auditórios (procurando na coluna do Local - índice 3)
      const celulaLocal = colunas[3];
      const inputLocal = celulaLocal.querySelector("input");
      const textoLocal = (
        inputLocal ? inputLocal.value : celulaLocal.innerText
      ).toLowerCase();

      if (
        textoLocal.includes("auditorio") ||
        textoLocal.includes("auditório")
      ) {
        linha.style.display = "";
      } else {
        linha.style.display = "none";
      }
    } else {
      // Filtro por número do bloco (6, 7, 8, 10)
      // Normalizamos para comparar (ex: "07" vira "7")
      if (parseInt(valorBloco) === parseInt(criterio)) {
        linha.style.display = "";
      } else {
        linha.style.display = "none";
      }
    }
  });
}

const btnAdicionar = document.getElementById("btn-adicionar");

btnAdicionar.addEventListener("click", () => {
  const novaLinha = document.createElement("tr");

  novaLinha.innerHTML = `
    <td><input type="checkbox" class="row-checkbox"></td>
    <td><input type="date" class="searchInput"></td>
    <td><input type="text" placeholder="Responsável" class="searchInput"></td>
    <td><input type="text" placeholder="Bloco" class="searchInput" style="width:50px"></td> 
    <td><input type="text" placeholder="Local" class="searchInput"></td>
    <td><input type="text" placeholder="Abertura" class="searchInput"></td>
    <td><input type="text" placeholder="Horário Prova" class="searchInput"></td>
    <td>${gerarHtmlCarrinhos()}</td> <!-- O Multi-select que fizemos antes -->
    <td><input type="text" placeholder="Qtd" class="searchInput" style="width:40px"></td>
    <td><input type="text" placeholder="Observação" class="searchInput"></td>
    <td><button class="btn-delete" title="Excluir">Excluir</button></td>
  `;

  content.prepend(novaLinha);
});

btnEditarVistas.addEventListener("click", async () => {
  const dados = await window.buscarReservasFirebase();
  if (dados && dados.length > 0) {
    renderizarModoEdicao(dados);
  }
});

function renderizarModoEdicao(dados) {
  // 1. Lista de todos os elementos que devem sumir no modo edição
  const elementosParaEsconder = [
    ".upload-container", // Área do CSV
    ".button-group", // Grupo de botões (Salvar, Atualizar, etc)
    ".filtros-container", // Se você tiver uma div de filtros
    "#btn-adicionar", // Botão flutuante de adicionar
    "#btn-excluir-selecionados", // Botão de excluir vários
    "h1", // Título principal
  ];

  // Esconde cada um deles
  elementosParaEsconder.forEach((seletor) => {
    const el = document.querySelector(seletor);
    if (el) el.style.display = "none";
  });

  // 2. Preparar o container principal
  const containerBlocos = document.querySelector(".bloco-container");

  let htmlContent = `
    <div class="header-edicao-fixo">
        <h2>Modo de Edição</h2>
        <div class="acoes-edicao">
            <button type="button" class="btn-save-edit" id="btn-salvar-geral">Salvar Alterações</button>
            <button type="button" class="btn-back" onclick="window.location.reload()">Sair</button>
        </div>
    </div>`;

  const blocosUnicos = [
    ...new Set(dados.map((item) => String(item.bloco || ""))),
  ].sort();

  blocosUnicos.forEach((bloco) => {
    const dadosFiltrados = dados.filter((item) => String(item.bloco) === bloco);
    // Dentro de renderizarModoEdicao, altere o mapeamento das linhas:
    const linhas = dadosFiltrados
      .map(
        (item) => `
    <tr>
        <td><input type="text" class="searchInput" value="${formatarDataBR(item.data)}"></td>
        <td><input type="text" class="searchInput" value="${item.Usuario || item.responsavel || ""}"></td>
        <td><input type="text" class="searchInput" style="width:50px" value="${item.bloco || ""}"></td>
        <td><input type="text" class="searchInput" style="width:70px" value="${item.horarioAbertura || ""}"></td>
        <td><input type="text" class="searchInput" value="${item.horario || ""}"></td>
        <td><input type="text" class="searchInput" value="${item.local || ""}"></td>
        <td>${gerarHtmlCarrinhos(item.carrinhos || "")}</td>
        <td><input type="text" class="searchInput" value="${item.quantidade || ""}"></td>
        <td><input type="text" class="searchInput" value="${item.observacao || ""}"></td>
        <td><button class="btn-delete">Excluir</button></td>
    </tr>`,
      )
      .join("");

    htmlContent += `
        <div class="bloco-container-edit">
            <div class="bloco-header">Bloco ${bloco}</div>
            <div class="content" style="max-height: 0px; overflow: hidden;">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Responsável</th><th>Bloco</th><th>Abertura</th><th>Prova</th><th>Local</th><th>Carrinhos</th><th>Quantidade</><th>Observação</th><th>Ações</th>
                        </tr>
                    </thead>
                    <tbody class="tabela-body">${linhas}</tbody>
                </table>
            </div>
        </div>`;
  });

  containerBlocos.innerHTML = htmlContent;
  setupAccordionEdicao();

  // Reatribui o clique de salvar
  document.getElementById("btn-salvar-geral").addEventListener("click", () => {
    const novosDados = capturarDadosDaTabela();
    if (window.salvarNoFirebase) {
      window
        .salvarNoFirebase(novosDados)
        .then(() => alert("✅ Tudo atualizado!"));
    }
  });
}

function setupAccordionEdicao() {
  const headers = document.querySelectorAll(".bloco-header");
  headers.forEach((header) => {
    header.addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      if (content.style.maxHeight !== "0px") {
        content.style.maxHeight = "0px";
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}

// 1. Selecionar/Deselecionar todos (apenas os visíveis)
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "select-all") {
    const checkboxes = document.querySelectorAll(".row-checkbox");
    checkboxes.forEach((cb) => {
      // Só marca se a linha não estiver escondida pelo filtro
      if (cb.closest("tr").style.display !== "none") {
        cb.checked = e.target.checked;
      }
    });
  }
});

// 2. Excluir selecionados
const btnExcluirSelecionados = document.getElementById(
  "btn-excluir-selecionados",
);

btnExcluirSelecionados.addEventListener("click", function () {
  const checkboxes = document.querySelectorAll(".row-checkbox:checked");

  if (checkboxes.length === 0) {
    alert("Nenhum item selecionado para excluir.");
    return;
  }

  if (confirm(`Deseja excluir os ${checkboxes.length} itens selecionados?`)) {
    checkboxes.forEach((checkbox) => {
      const linha = checkbox.closest("tr");
      linha.remove();
    });

    // Desmarca o "Selecionar Todos" após a exclusão
    const selectAll = document.getElementById("select-all");
    if (selectAll) selectAll.checked = false;
  }
});

function adicionarTrintaMinutos(horario) {
  if (!horario || !horario.includes(":")) return horario;

  let [horas, minutos] = horario.split(":").map(Number);
  let totalMinutos = horas * 60 + minutos + 30;

  if (totalMinutos >= 1440) totalMinutos -= 1440;

  const h = Math.floor(totalMinutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutos % 60).toString().padStart(2, "0");

  return `${h}:${m}`;
}
// Função para gerar o HTML do Multi-select de Carrinhos
function gerarHtmlCarrinhos(valoresSelecionados = "") {
  // Converte a string salva em um Array para facilitar a comparação
  const listaSelecionados = valoresSelecionados
    .split(", ")
    .map((item) => item.trim());

  let optionsHtml = "";
  for (let i = 1; i <= 17; i++) {
    const numeroFormatado = i.toString().padStart(2, "0");
    const nomeCarrinho = `${numeroFormatado}`;
    // Verifica se este carrinho específico está na lista de selecionados
    const checked = listaSelecionados.includes(nomeCarrinho) ? "checked" : "";

    optionsHtml += `
      <label>
        <input type="checkbox" value="${nomeCarrinho}" ${checked} onchange="atualizarLabelSelect(this)"> 
        ${nomeCarrinho}
      </label>`;
  }

  // O texto inicial do "select" deve mostrar o que já está selecionado
  const labelInicial = valoresSelecionados || "Selecionar Carrinhos";

  return `
    <div class="multiselect">
      <div class="selectBox" onclick="toggleCheckboxes(this)">
        <select class="searchInput">
          <option>${labelInicial}</option>
        </select>
        <div class="overSelect"></div>
      </div>
      <div class="checkboxes">
        ${optionsHtml}
      </div>
    </div>
  `;
}

// Abre/Fecha o dropdown
function toggleCheckboxes(element) {
  const checkboxes = element.nextElementSibling;
  const display = checkboxes.style.display;

  // Fecha todos os outros abertos primeiro
  document
    .querySelectorAll(".checkboxes")
    .forEach((el) => (el.style.display = "none"));

  checkboxes.style.display = display === "block" ? "none" : "block";
}

// Atualiza o texto do select conforme marca as opções
function atualizarLabelSelect(input) {
  const container = input.closest(".multiselect");
  const checkboxes = container.querySelectorAll(
    'input[type="checkbox"]:checked',
  );
  const select = container.querySelector("select option");

  const valores = Array.from(checkboxes).map((cb) => cb.value);
  select.textContent =
    valores.length > 0 ? valores.join(", ") : "Selecionar Carrinhos";
}

// Fecha o dropdown se clicar fora dele
window.onclick = function (event) {
  if (!event.target.closest(".multiselect")) {
    document
      .querySelectorAll(".checkboxes")
      .forEach((el) => (el.style.display = "none"));
  }
};

function formatarDataBR(dataStr) {
  if (!dataStr) return "";

  // Se a data vier com hífen (ex: 2026-04-15), transforma em 15/04/2026
  if (dataStr.includes("-")) {
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // Se a data vier com barra (ex: 04/15/2026), inverte mês e dia
  if (dataStr.includes("/")) {
    const partes = dataStr.split("/");
    // Se a primeira parte tiver 4 dígitos, é AAAA/MM/DD
    if (partes[0].length === 4) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    // Caso contrário, assume que é MM/DD/AAAA e inverte para DD/MM/AAAA
    // Só inverte se o primeiro termo for um mês provável (<= 12) e o segundo um dia (> 12)
    // Ou simplesmente inverte se você sabe que o CSV vem sempre trocado:
    return `${partes[1]}/${partes[0]}/${partes[2]}`;
  }

  return dataStr;
}
