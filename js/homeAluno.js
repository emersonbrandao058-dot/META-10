import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */
const elSubTop = document.getElementById("subTop");
const elOla = document.getElementById("ola");
const elBadgeTurma = document.getElementById("badgeTurma");
const elBadgeMaterias = document.getElementById("badgeMaterias");
const elBadgeStreak = document.getElementById("badgeStreak");
const elBadgeMissao = document.getElementById("badgeMissao");

const elKpiAulas = document.getElementById("kpiAulas");
const elKpiAssistidas = document.getElementById("kpiAssistidas");
const elKpiPontos = document.getElementById("kpiPontos");

const mascotFace = document.getElementById("mascotFace");
const mascotText = document.getElementById("mascotText");

const btnSair = document.getElementById("btnSair");
const btnIrAulas = document.getElementById("btnIrAulas");

const qAulas = document.getElementById("qAulas");
const qQuestoes = document.getElementById("qQuestoes");
const qMateriais = document.getElementById("qMateriais");
const qDesempenho = document.getElementById("qDesempenho");
const qConfig = document.getElementById("qConfig");

/* =========================
   ESTADO
========================= */
let USER = null;
let USER_DOC_ID = null;

let totalAulas = 0;
let assistidas = 0;
let pontos = 0;
let streak = 0;

/* =========================
   MAPAS / TIPS
========================= */
const MATERIA_ICON = {
  "Matemática": "🧮",
  "Português": "✍️",
  "Ciências": "🔬",
  "História": "🏛️",
  "Geografia": "🗺️",
  "Inglês": "🗣️",
  "Redação": "📝",
  "Artes": "🎨"
};

const MASCOT_FACES = ["🦊", "🐼", "🐯", "🦄", "🐸", "🐙", "🐵", "🐰"];
const MASCOT_TIPS = [
  "Bora! Uma aula hoje já te deixa mais forte! 💪✨",
  "Dica do mascote: assista e depois faça um mini-resumo 🧠📝",
  "Meta do dia: concluir 1 aula e ganhar pontos! 🎯🔥",
  "Se cansar, pausa 2 min e volta 🚀",
  "Você tá no caminho certo! Continua 😄"
];

function iconMateria(m) {
  return MATERIA_ICON[m] || "📘";
}

function setTopInfo(texto) {
  if (elSubTop) elSubTop.innerText = texto || "";
}

function setMascot(texto) {
  if (mascotFace && mascotFace.innerText.trim() === "") {
    mascotFace.innerText = MASCOT_FACES[Math.floor(Math.random() * MASCOT_FACES.length)];
  }
  if (mascotText) mascotText.innerText = texto || "";
}

function randomTip() {
  return MASCOT_TIPS[Math.floor(Math.random() * MASCOT_TIPS.length)];
}

function getUserLogado() {
  const raw = localStorage.getItem("meta10_user");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return {
      nome: (obj.nome || "").toString(),
      email: (obj.email || "").toString().trim().toLowerCase(),
      perfil: (obj.perfil || "").toString().trim().toLowerCase()
    };
  } catch {
    return null;
  }
}

/* =========================
   FIRESTORE: USER
========================= */
async function carregarDadosAluno(email) {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  USER_DOC_ID = snap.docs[0].id;
  const data = snap.docs[0].data();

  return {
    nome: data.nome || "",
    email: data.email || "",
    perfil: (data.perfil || "").toLowerCase(),
    ano: data.ano || "",
    turma: data.turma || "",
    materiasAluno: Array.isArray(data.materiasAluno) ? data.materiasAluno : [],
    stats: data.stats || {}
  };
}

/* =========================
   FIRESTORE: KPIs
========================= */
async function carregarKPIs() {
  totalAulas = 0;
  assistidas = 0;
  pontos = 0;
  streak = 0;

  // total de aulas do ano do aluno
  if (USER?.ano) {
    const qA = query(collection(db, "aulas"), where("serie", "==", USER.ano));
    const snapA = await getDocs(qA);
    totalAulas = snapA.size;
  }

  // assistidas (subcoleção progress)
  if (USER_DOC_ID) {
    const progSnap = await getDocs(collection(db, "users", USER_DOC_ID, "progress"));
    progSnap.forEach((d) => {
      const p = d.data();
      if (p?.assistido === true) assistidas += 1;
    });

    // stats
    const userRef = doc(db, "users", USER_DOC_ID);
    const userDoc = await getDoc(userRef);
    const data = userDoc.exists() ? userDoc.data() : {};
    const stats = data?.stats || {};

    pontos = Number(stats.pontos || 0);
    streak = Number(stats.streak || 0);
  }

  // UI
  if (elKpiAulas) elKpiAulas.innerText = String(totalAulas);
  if (elKpiAssistidas) elKpiAssistidas.innerText = String(assistidas);
  if (elKpiPontos) elKpiPontos.innerText = String(pontos);

  if (elBadgeStreak) elBadgeStreak.innerText = `🔥 Sequência: ${streak}`;
  if (elBadgeMissao) {
    const ok = assistidas > 0;
    elBadgeMissao.innerText = ok ? `🎯 Missão: concluída ✅` : `🎯 Missão: assistir 1 aula`;
  }
}

/* =========================
   ATALHOS
========================= */
function bindAtalhos() {
  const goAulas = () => (window.location.href = "./dashboard.html");

  // Como você ainda não tem páginas separadas, deixei as 4 como "em breve".
  // Depois que você criar questoes.html / materiais.html etc, a gente troca aqui.
  const emBreve = (nome) => alert(`${nome}: em breve ✅\n(Por enquanto, use Videoaulas)`);

  if (btnIrAulas) btnIrAulas.onclick = goAulas;
  if (qAulas) qAulas.onclick = goAulas;

  if (qQuestoes) qQuestoes.onclick = () => emBreve("Questões");
  if (qMateriais) qMateriais.onclick = () => emBreve("Materiais");
  if (qDesempenho) qDesempenho.onclick = () => emBreve("Desempenho");
  if (qConfig) qConfig.onclick = () => emBreve("Configurações");
}

/* =========================
   SAIR
========================= */
function bindSair() {
  if (!btnSair) return;
  btnSair.addEventListener("click", () => {
    // mantém como você já fazia: voltar pro login
    window.location.href = "../index.html";
  });
}

/* =========================
   INIT
========================= */
async function init() {
  setTopInfo("Carregando seus dados...");
  if (mascotFace) mascotFace.innerText = MASCOT_FACES[Math.floor(Math.random() * MASCOT_FACES.length)];
  setMascot("Tô preparando sua Home… ✨");

  const base = getUserLogado();
  if (!base?.email) {
    setTopInfo("Você não está logado. Volte pro login.");
    setMascot("Volta pro login pra eu te reconhecer 😄");
    return;
  }

  const aluno = await carregarDadosAluno(base.email);

  if (!aluno) {
    setTopInfo("Aluno não encontrado no banco. Peça pra secretaria cadastrar.");
    setMascot("Não te achei no banco… pede pra secretaria cadastrar! 🧾");
    return;
  }

  if (aluno.perfil !== "aluno") {
    setTopInfo("Esse usuário não é aluno. Entre com uma conta de aluno.");
    setMascot("Essa conta não é de aluno… tenta outra! 😅");
    return;
  }

  USER = aluno;

  if (elOla) elOla.innerText = `Olá, ${USER.nome?.split(" ")[0] || "aluno"}! 👋`;
  if (elBadgeTurma) elBadgeTurma.innerText = `🏫 Turma ${USER.ano || "—"}-${USER.turma || "—"}`;

  const mats = USER.materiasAluno || [];
  if (elBadgeMaterias) {
    const pretty = mats.slice(0, 3).map((m) => `${iconMateria(m)} ${m}`).join(", ");
    elBadgeMaterias.innerText = `📚 Matérias ${pretty || "—"}${mats.length > 3 ? "..." : ""}`;
  }

  await carregarKPIs();

  setTopInfo("Tudo pronto ✅ Bora estudar!");
  setMascot(randomTip());

  bindAtalhos();
  bindSair();
}

init();
