import { useState } from "react";
import { Mde } from "../components/mde";

export default function Home() {
  const [mde, setMde] = useState("Hello *world*");
  return (
    <>
      <h2>MDE Example</h2>
      <div style={{ display: "flex" }}>
        <textarea
          style={{ flex: 1, padding: 4, margin: 20, minHeight: 400 }}
          onChange={(e) => {
            setMde(e.target.value);
          }}
          value={mde}
        />

        <div style={{ flex: 1, margin: 20 }}>
          <Mde mde={mde} />
        </div>
      </div>
    </>
  );
}
