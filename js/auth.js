import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const btn = document.getElementById("btnEntrar");
const msg = document.getElementById("msg");

btn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value.trim();

  msg.innerText = "";

  if (!email || !senha) {
    msg.innerText = "Preencha email e senha.";
    return;
  }

  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      msg.innerText = "Usuário ou senha inválidos.";
      return;
    }

    const docUser = snap.docs[0];
    const user = docUser.data();

    const senhaBanco = String(user.senha ?? "").trim();
    if (senha !== senhaBanco) {
      msg.innerText = "Usuário ou senha inválidos.";
      return;
    }

    const perfil = String(user.perfil ?? user.role ?? "").trim().toLowerCase();

    // ✅ Guarda nome + email + perfil (aluno.js usa nome)
    localStorage.setItem(
      "meta10_user",
      JSON.stringify({ email, perfil, nome: user.nome || "" })
    );

    if (perfil === "aluno") {
      window.location.href = "aluno/home.html"; // ✅ HOME primeiro
      return;
    }

    if (perfil === "professor") {
      window.location.href = "professor/dashboard.html";
      return;
    }

    if (perfil === "secretaria") {
      window.location.href = "secretaria/dashboard.html";
      return;
    }

    msg.innerText = "Seu usuário está sem perfil válido no banco.";
  } catch (err) {
    console.error("ERRO FIRESTORE:", err);
    msg.innerText = "Erro ao conectar com banco.";
  }
});
