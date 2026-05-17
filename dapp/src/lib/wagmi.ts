"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia, baseSepolia, hardhat } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName:     "GameFi Economy",
  projectId:   "YOUR_WALLETCONNECT_PROJECT_ID", // replace with real ID
  chains:      [arbitrumSepolia, baseSepolia, hardhat],
  ssr:         true,
});
