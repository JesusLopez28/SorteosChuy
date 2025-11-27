import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAPmMzPomA0TSMvdIZD-zPI-MApT-VnsFw",
  authDomain: "sorteoschuy.firebaseapp.com",
  databaseURL: "https://sorteoschuy-default-rtdb.firebaseio.com",
  projectId: "sorteoschuy",
  storageBucket: "sorteoschuy.firebasestorage.app",
  messagingSenderId: "327196237046",
  appId: "1:327196237046:web:6eb602b6c305d8c9e7a0d7",
  measurementId: "G-HJT13MMQTV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
