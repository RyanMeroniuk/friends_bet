import React from "react";
import SectionCard from "./SectionCard";

export default function HowItWorksCard() {
  return (
    <SectionCard title="How it works">
      <ul className="fb-list">
        <li>🎯 Find friends' groups</li>
        <li>🔑 Get an invite code</li>
        <li>💰 Place friendly bets</li>
        <li>🏆 Track your wins</li>
      </ul>
    </SectionCard>
  );
}
