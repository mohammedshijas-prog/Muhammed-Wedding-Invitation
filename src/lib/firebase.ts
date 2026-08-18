"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const database = getDatabase(firebaseApp);
