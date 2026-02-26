import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const elProfEmail = document.getElementById("profEmail");
const elMateria = document.getElementById("materia");
const elTitulo = document.getElementById("titulo");
const elTipo = document.getElementById("tipo");
const elSerie = document.getElementById("serie");
const elVideoUrl = document.getElementById("videoUrl");
const elMsg = document.getElementById("msg");
const elTabela = document.getElementById("tabelaAulas");

const btnCriar = document.getElementById("btnCriarAula");
const btnRecarregar = document.getElementById("btnRecarregar");
const btnSair = document.getElementById("btnSair");

function setMsg(texto, tipo = "") {
  if (!elMsg) return;
  elMsg.className = "msg " + (tipo || "");
  elMsg.innerText = texto || "";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Converte links para um formato melhor pro dashboard do aluno:
 * - YouTube: watch / youtu.be -> embed
 * - Drive: /view -> /preview (para tentar rodar embutido)
 */
function normalizarVideoUrl(url) {
  const u = (url || "").trim();
  if (!u) return "";

  // DRIVE: /view -> /preview
  if (u.includes("drive.google.com/file/d/")) {
    const base = u.split("?")[0];
    if (base.includes("/view")) return base.replace("/view", "/preview");
    if (base.includes("/preview")) return base;
    return base;
  }

  // YOUTUBE: watch / youtu.be -> embed
  if (u.includes("youtu.be/")) {
    const id = u.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (u.includes("youtube.com/watch?v=")) {
    const id = u.split("watch?v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${id}`;
  }

  return u;
}

function getEmailLogado() {
  const raw = localStorage.getItem("meta10_user");
  if (!raw) return "";
  try {
    const obj = JSON.parse(raw);
    return (obj.email || "").toString().trim().toLowerCase();
  } catch {
    return "";
  }
}

function prettySerie(serie) {
  const s = String(serie || "");
  const map = {
    "1ano": "1º ano",
    "2ano": "2º ano",
    "3ano": "3º ano",
    "4ano": "4º ano",
    "5ano": "5º ano",
    "6ano": "6º ano",
    "7ano": "7º ano",
    "8ano": "8º ano",
    "9ano": "9º ano",
    "1em": "1º ano EM"
  };
  return map[s] || s;
}

function prettyTipo(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t === "revisao") return "Revisão";
  if (t === "simulado") return "Simulado";
  if (t === "complementar") return "Complementar";
  return "Aula";
}

// Chips bonitos (usando a classe .pill do seu novo HTML)
function pillHtml(text, emoji = "") {
  const label = `${emoji ? emoji + " " : ""}${text}`;
  return `<span class="pill">${escapeHtml(label)}</span>`;
}

// 👉 pega email do professor
const profEmail = getEmailLogado();
if (elProfEmail) elProfEmail.textContent = profEmail || "desconhecido";

if (btnSair) {
  btnSair.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

if (btnRecarregar) {
  btnRecarregar.addEventListener("click", async () => {
    setMsg("");
    await carregarMateriasDoProfessor();
    await carregarAulas();
  });
}

// 1) Carrega matérias do professor
async function carregarMateriasDoProfessor() {
  if (!elMateria) return;
  elMateria.innerHTML = `<option value="">Carregando...</option>`;

  if (!profEmail) {
    elMateria.innerHTML = `<option value="">Sem login</option>`;
    return;
  }

  try {
    const q = query(collection(db, "users"), where("email", "==", profEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      elMateria.innerHTML = `<option value="">Professor não encontrado</option>`;
      return;
    }

    const user = snap.docs[0].data();
    const materias = Array.isArray(user.materias) ? user.materias : [];

    if (!materias.length) {
      elMateria.innerHTML = `<option value="">Sem matérias cadastradas</option>`;
      return;
    }

    elMateria.innerHTML =
      `<option value="">Selecione</option>` +
      materias
        .map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`)
        .join("");
  } catch (e) {
    console.error(e);
    elMateria.innerHTML = `<option value="">Erro ao carregar matérias</option>`;
  }
}

// 2) Publica aula
if (btnCriar) {
  btnCriar.addEventListener("click", async () => {
    setMsg("");

    const titulo = elTitulo?.value?.trim() || "";
    const tipo = elTipo?.value?.trim() || "aula";
    const materia = elMateria?.value?.trim() || "";
    const serie = elSerie?.value?.trim() || "";
    const videoUrlInput = elVideoUrl?.value?.trim() || "";

    if (!profEmail) {
      setMsg("Você não está logado. Volte para o login.", "err");
      return;
    }

    if (!titulo || !materia || !serie || !videoUrlInput) {
      setMsg("Preencha título, matéria, série e o link do vídeo.", "err");
      return;
    }

    if (!videoUrlInput.startsWith("http")) {
      setMsg("Coloque um link válido começando com http/https.", "err");
      return;
    }

    const videoUrlFinal = normalizarVideoUrl(videoUrlInput);

    // UX: trava botão enquanto publica
    const oldText = btnCriar.innerText;
    btnCriar.disabled = true;
    btnCriar.style.opacity = "0.7";
    btnCriar.innerText = "Publicando...";

    try {
      await addDoc(collection(db, "aulas"), {
        titulo,
        tipo,
        materia,
        serie,
        videoUrl: videoUrlFinal,
        profEmail,
        createdAt: serverTimestamp()
      });

      setMsg("Aula publicada ✅", "ok");

      if (elTitulo) elTitulo.value = "";
      if (elVideoUrl) elVideoUrl.value = "";
      if (elTipo) elTipo.value = "aula";

      await carregarAulas();
    } catch (err) {
      console.error("ERRO AO PUBLICAR:", err);

      // Se der erro de índice, o Firestore normalmente pede pra criar index (link no console)
      const detalhes = err?.code ? `${err.code} — ${err.message}` : String(err);
      setMsg("Erro ao publicar: " + detalhes, "err");
    } finally {
      btnCriar.disabled = false;
      btnCriar.style.opacity = "1";
      btnCriar.innerText = oldText;
    }
  });
}

// 3) Lista aulas do professor
async function carregarAulas() {
  if (!elTabela) return;
  elTabela.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  if (!profEmail) {
    elTabela.innerHTML = `<tr><td colspan="6">Sem login.</td></tr>`;
    return;
  }

  try {
    const q = query(
      collection(db, "aulas"),
      where("profEmail", "==", profEmail),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      elTabela.innerHTML = `<tr><td colspan="6">Nenhuma aula publicada ainda.</td></tr>`;
      return;
    }

    const rows = snap.docs.map((d) => {
      const a = d.data();

      const t = prettyTipo(a.tipo);
      const s = prettySerie(a.serie);

      // emojis por tipo pra ficar “infantil/premium”
      const tipoEmoji =
        String(a.tipo || "").toLowerCase() === "revisao"
          ? "🧠"
          : String(a.tipo || "").toLowerCase() === "simulado"
          ? "🏆"
          : String(a.tipo || "").toLowerCase() === "complementar"
          ? "✨"
          : "🎬";

      return `
        <tr>
          <td style="font-weight:900;">${escapeHtml(a.titulo || "")}</td>
          <td>${pillHtml(a.materia || "—", "📘")}</td>
          <td>${pillHtml(s || "—", "🎯")}</td>
          <td>${pillHtml(t, tipoEmoji)}</td>
          <td>
            <a class="link" href="${escapeHtml(a.videoUrl || "#")}" target="_blank" rel="noopener">
              Abrir
            </a>
          </td>
          <td>
            <button class="btnDanger" data-del="${d.id}" type="button">Excluir</button>
          </td>
        </tr>
      `;
    });

    elTabela.innerHTML = rows.join("");

    document.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!id) return;

        if (!confirm("Excluir essa aula?")) return;

        try {
          btn.disabled = true;
          btn.style.opacity = "0.7";
          await deleteDoc(doc(db, "aulas", id));
          setMsg("Aula excluída ✅", "ok");
          await carregarAulas();
        } catch (e) {
          console.error(e);
          setMsg("Erro ao excluir. Verifique Rules/conexão.", "err");
        } finally {
          btn.disabled = false;
          btn.style.opacity = "1";
        }
      });
    });
  } catch (err) {
    console.error(err);

    // se for erro de index (where + orderBy), o Firestore pede pra criar um índice
    // normalmente aparece um link no console do navegador
    const detalhes = err?.code ? `${err.code} — ${err.message}` : String(err);
    elTabela.innerHTML = `<tr><td colspan="6">Erro ao carregar aulas: ${escapeHtml(detalhes)}</td></tr>`;
    setMsg("Erro ao carregar aulas. Veja o console (pode ser index).", "err");
  }
}

// init
carregarMateriasDoProfessor();
carregarAulas();
