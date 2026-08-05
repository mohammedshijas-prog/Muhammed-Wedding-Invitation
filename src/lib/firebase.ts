"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBlpcJh3Z9yiwub6lVyx4Mvd1xMNOXPZmQ",
  authDomain: "muahmmed-wedding-invitation.firebaseapp.com",
  databaseURL: "https://muahmmed-wedding-invitation-default-rtdb.firebaseio.com",
  projectId: "muahmmed-wedding-invitation",
  storageBucket: "muahmmed-wedding-invitation.firebasestorage.app",
  messagingSenderId: "167161255457",
  appId: "1:167161255457:web:5d9505bc8c2ba1ad09f560",
  measurementId: "G-M86CW5NTM7",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const database = getDatabase(firebaseApp);
