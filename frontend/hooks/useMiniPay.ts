"use client";

import { useEffect, useState } from "react";
import { isMiniPay } from "@/lib/minipay";

export function useMiniPay(): boolean {
  const [miniPay, setMiniPay] = useState(false);

  useEffect(() => {
    setMiniPay(isMiniPay());
  }, []);

  return miniPay;
}
