"use client";

import NavChart from "@/components/funds/nav-chart";
import SipCalculator from "@/components/funds/sip-calculator";
import type { NavPoint } from "@/lib/funds/types";

type FundAnalysisProps = {
  navHistory: NavPoint[];
};

// The interactive part of the fund page. The NAV history crosses from the
// server to the browser once, here, and is shared by the chart and calculator.
const FundAnalysis = ({ navHistory }: FundAnalysisProps) => {
  return (
    <div className="flex flex-col gap-6">
      <NavChart navHistory={navHistory} />
      <SipCalculator navHistory={navHistory} />
    </div>
  );
};

export default FundAnalysis;
