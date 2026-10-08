import { useId } from "react";
import "./assistant.css";

export type MascotState = "idle" | "greeting" | "open" | "thinking" | "success" | "error";

export default function JellyMascot({ state = "idle", className = "" }: { state?: MascotState; className?: string }) {
  const id = useId().replace(/:/g, "");
  const happy = state === "success" || state === "open" || state === "greeting";

  return (
    <svg viewBox="0 0 180 190" className={`jelly-mascot ${className}`} data-state={state} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="35" y1="43" x2="132" y2="156" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A3B2FF" /><stop offset=".36" stopColor="#6478FF" /><stop offset=".72" stopColor="#465FFF" /><stop offset="1" stopColor="#2933B6" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="40" y1="76" x2="131" y2="123" gradientUnits="userSpaceOnUse"><stop stopColor="#C7D9FF" /><stop offset=".5" stopColor="#8298FF" /><stop offset="1" stopColor="#4A58C3" /></linearGradient>
        <linearGradient id={`${id}-visor`} x1="58" y1="70" x2="106" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#263066" /><stop offset="1" stopColor="#0D1435" /></linearGradient>
        <linearGradient id={`${id}-hand`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#91A7FF" /><stop offset="1" stopColor="#465FFF" /></linearGradient>
        <radialGradient id={`${id}-shadow`}><stop stopColor="#465FFF" stopOpacity=".26" /><stop offset="1" stopColor="#465FFF" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-shine`} cx=".3" cy=".2" r=".85"><stop stopColor="white" stopOpacity=".62" /><stop offset=".65" stopColor="white" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse className="jelly-shadow" cx="90" cy="173" rx="58" ry="11" fill={`url(#${id}-shadow)`} />
      <g className="jelly-float">
        <g className="jelly-antenna">
          <path d="M89 51V34Q89 26 79 26H69" fill="none" stroke="#7186EE" strokeWidth="5" strokeLinecap="round" />
          <path d="M89 35Q89 25 101 25H111" fill="none" stroke="#91BCF8" strokeWidth="4" strokeLinecap="round" />
          <circle className="jelly-node-left" cx="67" cy="26" r="7" fill="#36BFFA" stroke="#CEFAFF" strokeWidth="2" />
          <circle className="jelly-node-right" cx="114" cy="25" r="6" fill="#B0F4FF" stroke="#36BFFA" strokeWidth="2" />
          <circle cx="65" cy="24" r="2" fill="white" />
        </g>
        <g className="jelly-hand-left"><path d="M38 96C22 88 13 96 18 110C22 124 34 122 40 111Z" fill={`url(#${id}-hand)`} /><path d="M22 99L24 107" stroke="#D5DDFF" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" /></g>
        <g className="jelly-hand-right"><path d="M142 96C158 88 167 96 162 110C158 124 146 122 140 111Z" fill={`url(#${id}-hand)`} /><path d="M156 98L153 105" stroke="#D5DDFF" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" /></g>
        <g className="jelly-body">
          <path d="M90 46C57 46 39 63 36 94C32 121 40 147 60 154C73 159 76 151 89 153C105 156 112 160 127 152C145 143 148 122 145 96C141 63 124 46 90 46Z" fill={`url(#${id}-body)`} stroke="#A5B6FF" strokeOpacity=".65" strokeWidth="1.5" />
          <path d="M90 46C57 46 39 63 36 94C32 121 40 147 60 154C73 159 76 151 89 153C105 156 112 160 127 152C145 143 148 122 145 96C141 63 124 46 90 46Z" fill={`url(#${id}-shine)`} />
          <path d="M49 68Q62 51 83 52" stroke="white" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M127 137Q132 131 134 121" stroke="#A8BAFF" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="43" y="70" width="94" height="60" rx="26" fill={`url(#${id}-rim)`} />
          <rect x="47" y="74" width="86" height="52" rx="22" fill={`url(#${id}-visor)`} />
          <path d="M57 82Q80 76 111 81" stroke="white" strokeOpacity=".1" strokeWidth="3" strokeLinecap="round" fill="none" />
          <g className="jelly-face" fill="none" stroke="#79EDFF" strokeWidth="5" strokeLinecap="round">
            {state === "thinking" ? <g className="jelly-thinking-dots" fill="#79EDFF" stroke="none"><circle cx="69" cy="99" r="4" /><circle cx="90" cy="99" r="4" /><circle cx="111" cy="99" r="4" /></g> : state === "error" ? <><path d="M64 93L74 98M106 98L116 93" strokeWidth="3" /><path d="M69 101V106M111 101V106" /><path d="M81 115Q90 108 99 115" strokeWidth="2.5" /></> : <>
              <g className={happy ? "jelly-happy-eyes" : "jelly-eyes"}>{happy ? <><path d="M61 99Q69 86 77 99" /><path d="M103 99Q111 86 119 99" /></> : <><path d="M69 92V102" /><path d="M111 92V102" /></>}</g>
              <path d={happy ? "M79 109Q90 122 101 109" : "M82 111Q90 117 98 111"} strokeWidth="2.5" />
              {happy && <g stroke="none" fill="#F3A7EA" opacity=".65"><ellipse cx="60" cy="109" rx="4" ry="2" /><ellipse cx="120" cy="109" rx="4" ry="2" /></g>}
            </>}
          </g>
          <path d="M83 141L87 145L98 135" fill="none" stroke="#BFF5FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
          <circle cx="119" cy="140" r="3" fill={state === "error" ? "#FBBF24" : "#7EF6E5"} />
        </g>
        {state === "success" && <g className="jelly-sparkles" fill="#36BFFA"><path d="M153 51L155 57L161 59L155 61L153 67L151 61L145 59L151 57Z" /><path d="M29 58L31 62L35 64L31 66L29 70L27 66L23 64L27 62Z" /></g>}
      </g>
    </svg>
  );
}
