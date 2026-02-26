import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ====== ELEMENTOS ====== */
const elNome = document.getElementById("nome");
const elEmail = document.getElementById("email");
const elSenha = document.getElementById("senha");
const elPerfil = document.getElementById("perfil");
const elMsg = document.getElementById("msg");
const elTabela = document.getElementById("tabelaUsers");

const turmaBox = document.getElementById("turmaBox");
const materiasBox = document.getElementById("materiasBox");
const materiasAlunoBox = document.getElementById("materiasAlunoBox");

const elAno = document.getElementById("ano");
const elTurma = document.getElementById("turma");
const elStatusFinalAno = document.getElementById("statusFinalAno");

const elBusca = document.getElementById("busca");
const tabs = Array.from(document.querySelectorAll(".tab"));

const btnCriar = document.getElementById("btnCriar");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const editActions = document.getElementById("editActions");

const btnRecarregar = document.getElementById("btnRecarregar");
const btnSair = document.getElementById("btnSair");
const btnSenhaAuto = document.getElementById("btnSenhaAuto");

/* ====== ESTADO ====== */
let USERS_CACHE = [];
let filtroPerfil = "todos";
let editId = null;

/* ====== HELPERS ====== */
function setMsg(texto, tipo = "") {
  if (!elMsg) return;
  elMsg.className = "msg " + (tipo || "");
  elMsg.innerText = texto || "";
}

function gerarSenha() {
  return Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
}

function clearChecks(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((c) => (c.checked = false));
}

function setChecks(name, values) {
  const set = new Set((values || []).map(String));
  document.querySelectorAll(`input[name="${name}"]`).forEach((c) => {
    c.checked = set.has(c.value);
  });
}

function prettyAno(ano) {
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
    "1em": "1º ano EM",
  };
  return map[String(ano || "")] || String(ano || "");
}

function pill(text, cls = "blue", emoji = "") {
  const label = `${emoji ? emoji + " " : ""}${text}`;
  return `<span class="pill ${cls}">${escapeHtml(label)}</span>`;
}

function badgePerfil(perfilRaw) {
  const p = String(perfilRaw || "").toLowerCase();
  if (p === "professor") return pill("Professor", "purple", "👨‍🏫");
  if (p === "secretaria") return pill("Secretaria", "yellow", "🗂️");
  return pill("Aluno", "pink", "🎒");
}

function atualizarVisibilidadeCampos() {
  const perfil = (elPerfil.value || "").trim().toLowerCase();

  if (perfil === "aluno") {
    turmaBox.style.display = "block";
    materiasAlunoBox.style.display = "block";
  } else {
    turmaBox.style.display = "none";
    materiasAlunoBox.style.display = "none";
    clearChecks("materiasAluno");
  }

  if (perfil === "professor") {
    materiasBox.style.display = "block";
  } else {
    materiasBox.style.display = "none";
    clearChecks("materiasProf");
  }
}

function entrarModoEdicao() {
  btnCriar.style.display = "none";
  editActions.style.display = "flex";
}

function sairModoEdicao() {
  editId = null;
  btnCriar.style.display = "block";
  editActions.style.display = "none";
  setMsg("");

  elNome.value = "";
  elEmail.value = "";
  elSenha.value = "";
  elPerfil.value = "aluno";
  if (elAno) elAno.value = "1ano";
  if (elTurma) elTurma.value = "A";
  if (elStatusFinalAno) elStatusFinalAno.value = "em_andamento";
  clearChecks("materiasProf");
  clearChecks("materiasAluno");

  atualizarVisibilidadeCampos();
}

/* ====== RENDER ====== */
function renderTabela() {
  const termo = (elBusca?.value || "").trim().toLowerCase();
  let lista = USERS_CACHE.slice();

  if (filtroPerfil !== "todos") {
    lista = lista.filter((u) => (u.perfil || "").toLowerCase() === filtroPerfil);
  }

  if (termo) {
    lista = lista.filter((u) => {
      const nome = (u.nome || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return nome.includes(termo) || email.includes(termo);
    });
  }

  if (!lista.length) {
    elTabela.innerHTML = `<tr><td colspan="6" style="padding:16px; opacity:.8;">Nenhum resultado.</td></tr>`;
    return;
  }

  elTabela.innerHTML = lista
    .map((u) => {
      const perfil = (u.perfil || "").toLowerCase();

      const turmaLabel =
        perfil === "aluno" && u.ano && u.turma
          ? pill(`${prettyAno(u.ano)} • Turma ${u.turma}`, "green", "🏫")
          : `<span style="opacity:.65;">—</span>`;

      let materiasHtml = `<span style="opacity:.65;">—</span>`;

      if (perfil === "professor" && Array.isArray(u.materias) && u.materias.length) {
        materiasHtml = u.materias
          .map((m) => pill(m, "blue", "📘"))
          .join(" ");
      }

      if (perfil === "aluno" && Array.isArray(u.materiasAluno) && u.materiasAluno.length) {
        materiasHtml = u.materiasAluno
          .map((m) => pill(m, "blue", "📘"))
          .join(" ");
      }

      return `
        <tr>
          <td style="font-weight:900;">${escapeHtml(u.nome)}</td>
          <td style="opacity:.95;">${escapeHtml(u.email)}</td>
          <td>${badgePerfil(u.perfil)}</td>
          <td>${turmaLabel}</td>
          <td>${materiasHtml}</td>
          <td class="actions-cell">
            <div class="row-actions">
              <button class="btn small" data-edit="${escapeHtml(u.id)}" type="button">Editar</button>
              <button class="btn small danger" data-del="${escapeHtml(u.id)}" type="button">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // excluir
  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Excluir este usuário?")) return;

      try {
        btn.disabled = true;
        await deleteDoc(doc(db, "users", id));
        setMsg("Usuário excluído ✅", "ok");
        await carregarLista();
        if (editId === id) sairModoEdicao();
      } catch (e) {
        console.error(e);
        setMsg("Erro ao excluir (verifique Rules / conexão).", "err");
      } finally {
        btn.disabled = false;
      }
    });
  });

  // editar
  document.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const u = USERS_CACHE.find((x) => x.id === id);
      if (!u) return;

      editId = id;

      elNome.value = u.nome || "";
      elEmail.value = u.email || "";
      elSenha.value = u.senha || "";
      elPerfil.value = (u.perfil || "aluno").toLowerCase();

      if (elAno) elAno.value = u.ano || "1ano";
      if (elTurma) elTurma.value = u.turma || "A";
      if (elStatusFinalAno) elStatusFinalAno.value = u.statusFinalAno || "em_andamento";

      setChecks("materiasProf", u.materias || []);
      setChecks("materiasAluno", u.materiasAluno || []);

      atualizarVisibilidadeCampos();
      entrarModoEdicao();
      setMsg("Editando usuário. Faça as mudanças e clique em “Salvar alterações”.", "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ====== CARREGAR ====== */
async function carregarLista() {
  setMsg("");
  elTabela.innerHTML = `<tr><td colspan="6" style="padding:16px; opacity:.8;">Carregando...</td></tr>`;

  const snap = await getDocs(collection(db, "users"));
  USERS_CACHE = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      nome: data.nome ?? "",
      email: data.email ?? "",
      senha: data.senha ?? "",
      perfil: (data.perfil ?? data.role ?? "").toString(),
      materias: Array.isArray(data.materias) ? data.materias : [],
      materiasAluno: Array.isArray(data.materiasAluno) ? data.materiasAluno : [],
      ano: data.ano ?? "",
      turma: data.turma ?? "",
      statusFinalAno: data.statusFinalAno ?? "em_andamento",
    };
  });

  renderTabela();
}

/* ====== EVENTOS ====== */
elPerfil.addEventListener("change", atualizarVisibilidadeCampos);

btnSenhaAuto.addEventListener("click", () => {
  elSenha.value = gerarSenha();
  setMsg("Senha gerada ✅", "ok");
});

btnSair.addEventListener("click", () => {
  window.location.href = "../index.html";
});

btnRecarregar.addEventListener("click", carregarLista);

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    filtroPerfil = t.getAttribute("data-filter") || "todos";
    renderTabela();
  });
});

elBusca.addEventListener("input", renderTabela);

btnCancelar.addEventListener("click", () => {
  sairModoEdicao();
});

/* ====== CRIAR ====== */
btnCriar.addEventListener("click", async () => {
  const nome = elNome.value.trim();
  const email = elEmail.value.trim().toLowerCase();
  const senha = elSenha.value.trim();
  const perfil = elPerfil.value.trim().toLowerCase();

  const materiasProf = getCheckedValues("materiasProf");
  const materiasAluno = getCheckedValues("materiasAluno");

  const ano = elAno?.value || "";
  const turma = elTurma?.value || "";
  const statusFinalAno = elStatusFinalAno?.value || "em_andamento";

  setMsg("");

  if (!nome || !email || !senha || !perfil) {
    setMsg("Preencha nome, email, senha e perfil.", "err");
    return;
  }

  if (perfil === "professor" && materiasProf.length === 0) {
    setMsg("Professor precisa ter pelo menos 1 matéria.", "err");
    return;
  }

  if (perfil === "aluno") {
    if (!ano || !turma) {
      setMsg("Aluno precisa ter ano e turma.", "err");
      return;
    }
    if (materiasAluno.length === 0) {
      setMsg("Aluno precisa estar em pelo menos 1 matéria.", "err");
      return;
    }
  }

  const oldText = btnCriar.innerText;
  btnCriar.disabled = true;
  btnCriar.innerText = "Criando...";

  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setMsg("Já existe um usuário com esse email.", "err");
      return;
    }

    const payload = {
      nome,
      email,
      senha,
      perfil,
      createdAt: serverTimestamp(),
      materias: perfil === "professor" ? materiasProf : [],
      materiasAluno: perfil === "aluno" ? materiasAluno : [],
      ano: perfil === "aluno" ? ano : "",
      turma: perfil === "aluno" ? turma : "",
      statusFinalAno: perfil === "aluno" ? statusFinalAno : "em_andamento",
    };

    await addDoc(collection(db, "users"), payload);

    setMsg("Usuário criado com sucesso ✅", "ok");
    sairModoEdicao();
    await carregarLista();
  } catch (e) {
    console.error(e);
    setMsg("Erro ao salvar no banco (verifique Rules / conexão).", "err");
  } finally {
    btnCriar.disabled = false;
    btnCriar.innerText = oldText;
  }
});

/* ====== SALVAR EDIÇÃO ====== */
btnSalvar.addEventListener("click", async () => {
  if (!editId) return;

  const nome = elNome.value.trim();
  const email = elEmail.value.trim().toLowerCase();
  const senha = elSenha.value.trim();
  const perfil = elPerfil.value.trim().toLowerCase();

  const materiasProf = getCheckedValues("materiasProf");
  const materiasAluno = getCheckedValues("materiasAluno");

  const ano = elAno?.value || "";
  const turma = elTurma?.value || "";
  const statusFinalAno = elStatusFinalAno?.value || "em_andamento";

  setMsg("");

  if (!nome || !email || !senha || !perfil) {
    setMsg("Preencha nome, email, senha e perfil.", "err");
    return;
  }

  if (perfil === "professor" && materiasProf.length === 0) {
    setMsg("Professor precisa ter pelo menos 1 matéria.", "err");
    return;
  }

  if (perfil === "aluno") {
    if (!ano || !turma) {
      setMsg("Aluno precisa ter ano e turma.", "err");
      return;
    }
    if (materiasAluno.length === 0) {
      setMsg("Aluno precisa estar em pelo menos 1 matéria.", "err");
      return;
    }
  }

  const oldText = btnSalvar.innerText;
  btnSalvar.disabled = true;
  btnSalvar.innerText = "Salvando...";

  try {
    const atual = USERS_CACHE.find((x) => x.id === editId);
    if (atual && atual.email !== email) {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setMsg("Já existe um usuário com esse email.", "err");
        return;
      }
    }

    const payload = {
      nome,
      email,
      senha,
      perfil,
      materias: perfil === "professor" ? materiasProf : [],
      materiasAluno: perfil === "aluno" ? materiasAluno : [],
      ano: perfil === "aluno" ? ano : "",
      turma: perfil === "aluno" ? turma : "",
      statusFinalAno: perfil === "aluno" ? statusFinalAno : "em_andamento",
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "users", editId), payload);

    setMsg("Alterações salvas ✅", "ok");
    sairModoEdicao();
    await carregarLista();
  } catch (e) {
    console.error(e);
    setMsg("Erro ao salvar edição (verifique Rules / conexão).", "err");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerText = oldText;
  }
});

/* ====== INIT ====== */
atualizarVisibilidadeCampos();
carregarLista();
