import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
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

const filtroMateria = document.getElementById("filtroMateria");
const filtroTipo = document.getElementById("filtroTipo");
const busca = document.getElementById("busca");

const btnRecarregar = document.getElementById("btnRecarregar");
const btnSair = document.getElementById("btnSair");

const playerTitulo = document.getElementById("playerTitulo");
const playerMeta = document.getElementById("playerMeta");
// OBS: iframePlayer pode deixar, mas a gente não depende mais dele pra trocar de aula
const iframePlayer = document.getElementById("player");
const btnMarcarAssistido = document.getElementById("btnMarcarAssistido");

const listaAulas = document.getElementById("listaAulas");
const countAulas = document.getElementById("countAulas");

const progressMaterias = document.getElementById("progressMaterias");

const nextBox = document.getElementById("nextBox");
const nextTitle = document.getElementById("nextTitle");
const nextMeta = document.getElementById("nextMeta");
const btnIrProxima = document.getElementById("btnIrProxima");

const mascotFace = document.getElementById("mascotFace");
const mascotText = document.getElementById("mascotText");

const confettiLayer = document.getElementById("confettiLayer");

/* =========================
   ESTADO
========================= */
let USER = null;
let USER_DOC_ID = null;

let AULAS = [];
let modoChip = "tudo";

let AULA_ATUAL = null;

let assistidasSet = new Set();
let pontos = 0;
let streak = 0;

/* =========================
   MAPAS INFANTIS
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
  "Você consegue! Começa pela próxima aula sugerida ▶️",
  "Meta do dia: concluir 1 aula e ganhar pontos! 🎯🔥",
  "Tá indo bem! Se cansar, pausa 2 min e volta 🚀"
];

function iconMateria(m) {
  return MATERIA_ICON[m] || "📘";
}

/* =========================
   HELPERS
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      email: (obj.email || "").toString().trim().toLowerCase()
    };
  } catch {
    return null;
  }
}

/* =========================
   NORMALIZAÇÕES DE VÍDEO
========================= */
function normalizarDriveUrl(url) {
  const u = (url || "").trim();
  if (!u) return u;

  // drive file view -> preview (para rodar no iframe)
  // Ex: https://drive.google.com/file/d/ID/view?usp=drive_link
  // => https://drive.google.com/file/d/ID/preview
  if (u.includes("drive.google.com/file/d/") && u.includes("/view")) {
    return u.split("?")[0].replace("/view", "/preview");
  }

  // Já é preview, mantém
  if (u.includes("drive.google.com/file/d/") && u.includes("/preview")) {
    return u.split("?")[0]; // remove params
  }

  return u;
}

function normalizarVideoUrl(url) {
  const u0 = (url || "").trim();
  if (!u0) return "";

  // drive
  const drive = normalizarDriveUrl(u0);
  if (drive !== u0) return drive;

  // youtube
  if (u0.includes("youtu.be/")) {
    const id = u0.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (u0.includes("youtube.com/watch?v=")) {
    const id = u0.split("watch?v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return u0;
}

function isYoutubeEmbed(url) {
  return (url || "").includes("youtube.com/embed/");
}

function isDrivePreview(url) {
  const u = (url || "").toLowerCase();
  return u.includes("drive.google.com/file/d/") && u.includes("/preview");
}

function isVideoFileLink(url) {
  const u = (url || "").toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".ogg");
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return 0;
}

function todayKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(aKey, bKey) {
  const [ay, am, ad] = aKey.split("-").map(Number);
  const [by, bm, bd] = bKey.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

/* =========================
   CONFETE (leve)
========================= */
function burstConfetti() {
  if (!confettiLayer) return;

  const colors = ["#ff5ea8", "#ffd166", "#00d2ff", "#6c5ce7", "#7CFF6B", "#ff7a59"];
  const rect = btnMarcarAssistido?.getBoundingClientRect?.() || {
    left: window.innerWidth / 2,
    top: 120,
    width: 0
  };

  const originX = rect.left + (rect.width || 0) / 2;
  const originY = rect.top + 10;

  const count = 28;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];

    const x = Math.random() * 180 - 90;
    const x2 = Math.random() * 240 - 120;
    const y = -(Math.random() * 120 + 60);

    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--x2", `${x2}px`);
    el.style.setProperty("--y", `${y}px`);
    confettiLayer.appendChild(el);

    setTimeout(() => el.remove(), 950);
  }
}

/* =========================
   MÓDULO (inferência)
========================= */
function inferirModulo(aula) {
  const m = (aula.modulo || "").toString().trim();
  if (m) return m;

  const t = (aula.titulo || "").toString();

  let match = t.match(/m[oó]dulo\s*(\d+)/i);
  if (match?.[1]) return `Módulo ${match[1]}`;

  match = t.match(/parte\s*(\d+)/i);
  if (match?.[1]) return `Parte ${match[1]}`;

  match = t.match(/aula\s*(\d+)/i);
  if (match?.[1]) return `Módulo ${match[1]}`;

  return "Geral";
}

/* =========================
   FIRESTORE: ALUNO
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
    materiasAluno: Array.isArray(data.materiasAluno) ? data.materiasAluno : []
  };
}

/* =========================
   FIRESTORE: PROGRESSO
========================= */
async function carregarProgresso() {
  assistidasSet = new Set();
  pontos = 0;
  streak = 0;

  if (!USER_DOC_ID) return;

  const progressSnap = await getDocs(collection(db, "users", USER_DOC_ID, "progress"));
  progressSnap.forEach((d) => {
    const p = d.data();
    if (p?.assistido === true) assistidasSet.add(d.id);
  });

  const userRef = doc(db, "users", USER_DOC_ID);
  const userDoc = await getDoc(userRef);
  const data = userDoc.exists() ? userDoc.data() : {};
  const stats = data?.stats || {};

  pontos = Number(stats.pontos || 0);
  streak = Number(stats.streak || 0);

  atualizarKPIs();
  atualizarBadges();
}

async function marcarAssistidoNoBanco(aulaId) {
  const progressRef = doc(db, "users", USER_DOC_ID, "progress", aulaId);

  const prev = await getDoc(progressRef);
  if (prev.exists() && prev.data()?.assistido === true) {
    return { jaEra: true };
  }

  await setDoc(
    progressRef,
    {
      assistido: true,
      assistidoAt: serverTimestamp()
    },
    { merge: true }
  );

  const userRef = doc(db, "users", USER_DOC_ID);

  const nowDay = todayKey();

  const userDoc = await getDoc(userRef);
  const data = userDoc.exists() ? userDoc.data() : {};
  const stats = data?.stats || {};

  const lastDay = String(stats.lastDay || "");
  let newStreak = Number(stats.streak || 0);

  if (!lastDay) newStreak = 1;
  else {
    const diff = daysBetween(lastDay, nowDay);
    if (diff === 0) {
      /* same day */
    } else if (diff === 1) newStreak = newStreak + 1;
    else newStreak = 1;
  }

  const newPontos = Number(stats.pontos || 0) + 10;

  await updateDoc(userRef, {
    "stats.pontos": newPontos,
    "stats.streak": newStreak,
    "stats.lastDay": nowDay,
    "stats.updatedAt": serverTimestamp()
  });

  return { jaEra: false, newPontos, newStreak };
}

/* =========================
   FIRESTORE: AULAS (SEM INDEX)
========================= */
async function carregarAulasDoAluno() {
  if (!USER?.ano) {
    setTopInfo("Seu cadastro está sem ANO/SÉRIE. Peça pra secretaria ajustar.");
    setMascot("Ops! Falta o ano/série no seu cadastro. 😕");
    AULAS = [];
    atualizarKPIs();
    render();
    return;
  }

  setTopInfo("Carregando suas aulas...");
  setMascot("Tô juntando as aulas rapidinho... 🧠⚡");

  const q = query(collection(db, "aulas"), where("serie", "==", USER.ano));
  const snap = await getDocs(q);

  AULAS = snap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      titulo: a.titulo || "",
      tipo: (a.tipo || "aula").toLowerCase(),
      materia: a.materia || "",
      serie: a.serie || "",
      videoUrl: normalizarVideoUrl(a.videoUrl || ""),
      createdAt: a.createdAt || null,
      modulo: a.modulo || ""
    };
  });

  AULAS.sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt));

  setTopInfo("Tudo pronto ✅ Bora estudar!");
  setMascot(randomTip());
  montarFiltroMaterias();
  atualizarKPIs();
  render();
}

/* =========================
   UI
========================= */
function montarFiltroMaterias() {
  if (!filtroMateria) return;

  const mats = (USER?.materiasAluno || []).slice();
  filtroMateria.innerHTML =
    `<option value="todas">Todas</option>` +
    mats
      .map(
        (m) =>
          `<option value="${escapeHtml(m)}">${escapeHtml(iconMateria(m))} ${escapeHtml(m)}</option>`
      )
      .join("");

  if (!mats.length) filtroMateria.innerHTML = `<option value="todas">Todas</option>`;
}

function aplicarFiltros(lista) {
  const materiaSel = filtroMateria?.value || "todas";
  const tipoSel = filtroTipo?.value || "todos";
  const termo = (busca?.value || "").trim().toLowerCase();

  let out = lista.slice();

  // aluno vê só matérias dele
  if (Array.isArray(USER?.materiasAluno) && USER.materiasAluno.length) {
    const set = new Set(USER.materiasAluno.map(String));
    out = out.filter((a) => set.has(a.materia));
  }

  if (materiaSel !== "todas") out = out.filter((a) => a.materia === materiaSel);
  if (tipoSel !== "todos") out = out.filter((a) => a.tipo === tipoSel);

  if (termo) {
    out = out.filter(
      (a) =>
        (a.titulo || "").toLowerCase().includes(termo) ||
        (a.materia || "").toLowerCase().includes(termo)
    );
  }

  if (modoChip === "revisao") out = out.filter((a) => a.tipo === "revisao");
  if (modoChip === "simulado") out = out.filter((a) => a.tipo === "simulado");
  return out;
}

function atualizarKPIs() {
  if (elKpiAulas) elKpiAulas.innerText = String(AULAS.length);
  if (elKpiAssistidas) elKpiAssistidas.innerText = String(assistidasSet.size);
  if (elKpiPontos) elKpiPontos.innerText = String(pontos);

  const filtradas = aplicarFiltros(AULAS);
  if (countAulas) countAulas.innerText = `${filtradas.length} aula(s)`;
}

function atualizarBadges() {
  if (elBadgeStreak) elBadgeStreak.innerText = `🔥 Sequência: ${streak}`;
  if (elBadgeMissao) {
    const ok = assistidasSet.size > 0;
    elBadgeMissao.innerText = ok ? `🎯 Missão: concluída ✅` : `🎯 Missão: assistir 1 aula`;
  }
}

function renderProgressoPorMateria() {
  if (!progressMaterias) return;

  const byMat = new Map();

  const aulasDoAluno = AULAS.filter((a) => {
    if (!USER?.materiasAluno?.length) return true;
    return USER.materiasAluno.includes(a.materia);
  });

  for (const a of aulasDoAluno) {
    const mat = a.materia || "Sem matéria";
    if (!byMat.has(mat)) byMat.set(mat, { total: 0, done: 0 });
    const obj = byMat.get(mat);
    obj.total += 1;
    if (assistidasSet.has(a.id)) obj.done += 1;
  }

  const entries = Array.from(byMat.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  if (!entries.length) {
    progressMaterias.innerHTML = `<div style="opacity:.75; font-weight:900; font-size:12px;">Sem matérias ainda.</div>`;
    return;
  }

  progressMaterias.innerHTML = entries
    .map(([mat, info]) => {
      const pct = info.total ? Math.round((info.done / info.total) * 100) : 0;
      const medal =
        pct >= 90 ? "🏆" : pct >= 60 ? "🥇" : pct >= 30 ? "🥈" : pct > 0 ? "🥉" : "✨";

      const frase =
        pct >= 90
          ? "Você tá voando!"
          : pct >= 60
          ? "Tá quase lá!"
          : pct >= 30
          ? "Boa! Continua!"
          : pct > 0
          ? "Começou bem!"
          : "Bora começar!";

      return `
      <div class="progItem">
        <div class="progTop">
          <span>${escapeHtml(iconMateria(mat))} ${escapeHtml(mat)} ${medal}</span>
          <span>${pct}%</span>
        </div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="progHint">${frase} • ${info.done}/${info.total} aulas assistidas</div>
      </div>
    `;
    })
    .join("");
}

function renderNextAula(filtradas) {
  if (!nextBox || !nextTitle || !nextMeta || !btnIrProxima) return;

  const prox = (filtradas || []).find((a) => !assistidasSet.has(a.id)) || null;

  if (!prox) {
    nextBox.style.display = "none";
    return;
  }

  nextBox.style.display = "flex";
  nextTitle.innerText = `✨ Próxima aula sugerida`;
  nextMeta.innerText = `${iconMateria(prox.materia)} ${prox.materia} • ${inferirModulo(prox)} • ${prox.titulo}`;

  btnIrProxima.onclick = () => {
    abrirAula(prox);
    setMascot("Boa! Clica em concluir quando terminar ✅");
  };
}

function agruparPorMateriaEModulo(lista) {
  const map = new Map();

  for (const a of lista) {
    const mat = a.materia || "Sem matéria";
    const mod = inferirModulo(a);

    if (!map.has(mat)) map.set(mat, new Map());
    const modMap = map.get(mat);

    if (!modMap.has(mod)) modMap.set(mod, []);
    modMap.get(mod).push(a);
  }

  for (const [, modMap] of map.entries()) {
    for (const [, arr] of modMap.entries()) {
      arr.sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt));
    }
  }

  return map;
}

function render() {
  const filtradas = aplicarFiltros(AULAS);
  atualizarKPIs();
  atualizarBadges();
  renderProgressoPorMateria();
  renderNextAula(filtradas);

  if (!listaAulas) return;

  if (!filtradas.length) {
    listaAulas.innerHTML = `
      <div style="
        padding:14px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.08);
        color: rgba(255,255,255,.85);
        font-weight:900;
      ">
        Nenhuma aula encontrada com esses filtros 😕
      </div>
    `;
    return;
  }

  const grouped = agruparPorMateriaEModulo(filtradas);
  const materias = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

  listaAulas.innerHTML = materias
    .map((mat, idx) => {
      const modMap = grouped.get(mat);
      const totalMat = Array.from(modMap.values()).reduce((acc, arr) => acc + arr.length, 0);
      const doneMat = Array.from(modMap.values()).reduce(
        (acc, arr) => acc + arr.filter((x) => assistidasSet.has(x.id)).length,
        0
      );
      const pct = totalMat ? Math.round((doneMat / totalMat) * 100) : 0;

      const modulos = Array.from(modMap.keys()).sort((a, b) => {
        const na = parseInt((a.match(/(\d+)/) || [])[1] || "9999", 10);
        const nb = parseInt((b.match(/(\d+)/) || [])[1] || "9999", 10);
        if (na !== nb) return na - nb;
        return a.localeCompare(b, "pt-BR");
      });

      const open = idx === 0 ? "open" : "";
      const medal =
        pct >= 90 ? "🏆" : pct >= 60 ? "🥇" : pct >= 30 ? "🥈" : pct > 0 ? "🥉" : "✨";

      return `
      <details class="section" ${open}>
        <summary>
          <div class="sumLeft">
            <span>${escapeHtml(iconMateria(mat))} ${escapeHtml(mat)} ${medal}</span>
            <span class="badge">${doneMat}/${totalMat} • ${pct}%</span>
          </div>
          <span style="opacity:.8;">▼</span>
        </summary>

        <div class="subSections">
          ${modulos
            .map((mod) => {
              const arr = modMap.get(mod);
              const done = arr.filter((x) => assistidasSet.has(x.id)).length;

              return `
              <div>
                <div class="moduleTitle">
                  <span>📦 ${escapeHtml(mod)}</span>
                  <span style="opacity:.8;">${done}/${arr.length} ✅</span>
                </div>

                <div class="cards">
                  ${arr
                    .map((a) => {
                      const tipo = (a.tipo || "aula").toLowerCase();
                      const tagTipoClass =
                        tipo === "revisao"
                          ? "purple"
                          : tipo === "simulado"
                          ? "yellow"
                          : tipo === "complementar"
                          ? "blue"
                          : "pink";

                      const assistida = assistidasSet.has(a.id);
                      const icon = iconMateria(a.materia);

                      return `
                      <div class="lesson" data-id="${escapeHtml(a.id)}">
                        <p class="t">${escapeHtml(a.titulo)}</p>
                        <p class="d">${assistida ? "✅ Já concluída! Mandou bem!" : "👉 Clique para assistir"}</p>
                        <div class="tags">
                          <span class="tag blue">${escapeHtml(icon)} ${escapeHtml(a.materia)}</span>
                          <span class="tag ${tagTipoClass}">✨ ${escapeHtml(tipo.toUpperCase())}</span>
                          <span class="tag green">🎯 ${escapeHtml(a.serie)}</span>
                        </div>
                        <div class="go">
                          <span>${assistida ? "Perfeito! 🎉" : "Vamos lá 🚀"}</span>
                          <span>▶</span>
                        </div>
                      </div>
                    `;
                    })
                    .join("")}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </details>
    `;
    })
    .join("");

  document.querySelectorAll(".lesson[data-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const aula = filtradas.find((x) => x.id === id) || AULAS.find((x) => x.id === id);
      if (aula) abrirAula(aula);
    });
  });
}

/* =========================
   PLAYER  ✅ FIX TRAVAMENTO + DRIVE
========================= */
function abrirAula(aula) {
  AULA_ATUAL = aula;

  if (playerTitulo) playerTitulo.innerText = `${iconMateria(aula.materia)} ${aula.titulo || "Aula"}`;
  if (playerMeta) playerMeta.innerText = `${aula.materia} • ${inferirModulo(aula)} • ${aula.tipo}`;

  // ✅ sempre pega o container fixo, não depende do iframe antigo
  const box = document.querySelector(".video-box");
  if (!box) return;

  box.innerHTML = "";

  const url = normalizarVideoUrl(aula.videoUrl || "");

  if (!url) {
    box.innerHTML = `<div style="padding:16px; font-weight:900; color:rgba(255,255,255,.85);">
      Essa aula ainda não tem vídeo 😕
    </div>`;
    setMascot("Essa não tem vídeo ainda… escolhe outra por enquanto! 😄");
    return;
  }

  // ✅ YouTube embed OU Drive preview => iframe
  if (isYoutubeEmbed(url) || isDrivePreview(url)) {
    const iframe = document.createElement("iframe");
    iframe.id = "player";
    iframe.src = url;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    box.appendChild(iframe);

    setMascot("Aeee! Assiste e depois clica em ✅ Concluir aula!");
    return;
  }

  // ✅ Link mp4/webm => player
  if (isVideoFileLink(url)) {
    const video = document.createElement("video");
    video.controls = true;
    video.style.width = "100%";
    video.style.height = "420px";
    video.style.display = "block";
    video.style.background = "black";
    video.src = url;
    box.appendChild(video);

    setMascot("Show! Quando terminar, clica em ✅ Concluir aula!");
    return;
  }

  // ✅ Outros links => abre em outra aba
  box.innerHTML = `
    <div style="padding:16px;">
      <div style="font-weight:900; font-size:14px; margin-bottom:8px;">🔗 Vídeo externo</div>
      <div style="color:rgba(255,255,255,.75); font-weight:800; font-size:12px; line-height:1.4;">
        Esse link não roda embutido aqui (alguns sites bloqueiam). Abra em outra aba:
      </div>
      <div style="margin-top:12px;">
        <a href="${escapeHtml(url)}" target="_blank"
          style="display:inline-block; padding:10px 12px; border-radius:16px; font-weight:900;
                 background: rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.14);
                 color:white; text-decoration:none;">
          Abrir vídeo ↗
        </a>
      </div>
    </div>
  `;
  setMascot("Abre o vídeo e depois volta aqui pra marcar como concluída ✅");
}

/* =========================
   EVENTOS
========================= */
if (btnSair) {
  btnSair.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

if (btnRecarregar) {
  btnRecarregar.addEventListener("click", async () => {
    await init();
  });
}

if (filtroMateria) filtroMateria.addEventListener("change", () => render());
if (filtroTipo) filtroTipo.addEventListener("change", () => render());
if (busca) busca.addEventListener("input", () => render());

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    modoChip = chip.getAttribute("data-chip") || "tudo";
    render();
  });
});

if (btnMarcarAssistido) {
  btnMarcarAssistido.addEventListener("click", async () => {
    if (!AULA_ATUAL?.id) {
      setTopInfo("Escolha uma aula primeiro 👇");
      setMascot("Escolhe uma aula aí embaixo e depois conclui ✅");
      return;
    }

    try {
      setTopInfo("Salvando progresso...");
      const r = await marcarAssistidoNoBanco(AULA_ATUAL.id);

      assistidasSet.add(AULA_ATUAL.id);

      await carregarProgresso();
      render();

      if (r.jaEra) {
        setTopInfo("Essa aula já estava concluída ✅");
        setMascot("Essa já tá concluída! Quer fazer outra? 🚀");
      } else {
        burstConfetti();
        setTopInfo("Aula concluída! ✅ +10 pontos!");
        setMascot("BOAAA! 🎉 Você ganhou +10 pontos! Continua assim!");
      }
    } catch (e) {
      console.error(e);
      setTopInfo("Erro ao concluir aula 😕 (verifique Rules / conexão).");
      setMascot("Deu um errinho… mas relaxa! Tenta recarregar 🔄");
    }
  });
}

/* =========================
   INIT
========================= */
async function init() {
  setTopInfo("Carregando seus dados...");
  if (mascotFace)
    mascotFace.innerText = MASCOT_FACES[Math.floor(Math.random() * MASCOT_FACES.length)];
  setMascot("Tô preparando sua sala de aula… ✨");

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

  await carregarProgresso();
  await carregarAulasDoAluno();

  atualizarBadges();
  render();
}

init();
