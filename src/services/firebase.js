import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCz6lZFiRx0OjMm-XPcBNMvrIe-vkdu58",
  authDomain: "my-orcamentos.firebaseapp.com",
  projectId: "my-orcamentos",
  storageBucket: "my-orcamentos.firebasestorage.app",
  messagingSenderId: "1086199209505",
  appId: "1:1086199209505:web:b42ee0afa3d7ef41238d60"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
