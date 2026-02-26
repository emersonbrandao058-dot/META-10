// js/logout.js
import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const btnSair = document.getElementById("btnSair");
btnSair?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../index.html";
});
