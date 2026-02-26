// js/guard.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const roleEsperado = document.body.dataset.role; // aluno | professor | secretaria

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  // Confere role real no banco
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await signOut(auth);
    window.location.href = "../index.html";
    return;
  }

  const data = snap.data();
  const role = data.role;

  if (roleEsperado && role !== roleEsperado) {
    // Se entrou com role errado, joga pro dashboard correto
    if (role === "professor") window.location.href = "../professor/dashboard.html";
    else if (role === "secretaria") window.location.href = "../secretaria/dashboard.html";
    else window.location.href = "../aluno/dashboard.html";
  }

  // opcional: mostrar nome/email em algum lugar
  const el = document.getElementById("userEmail");
  if (el) el.textContent = user.email || "";
});
