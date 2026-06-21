"use client";

import axios from "axios";

import { config } from "./config";
import { getJwt } from "./enoki";

export const http = axios.create({
  baseURL: config.apiUrl,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use(async (req) => {
  const jwt = await getJwt().catch(() => null);
  if (jwt) req.headers["Authorization"] = `Bearer ${jwt}`;
  return req;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/";
    }
    const message =
      err.response?.data?.message ??
      err.response?.data?.detail ??
      err.message ??
      "Request failed";
    return Promise.reject(new Error(message));
  },
);
