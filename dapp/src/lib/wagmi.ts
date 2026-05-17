"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia, hardhat } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName:   "GameFi Economy",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "fallback",
  chains:    [arbitrumSepolia, hardhat],
  ssr:       true,
});
