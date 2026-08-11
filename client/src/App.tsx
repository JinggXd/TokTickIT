import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState(""); // ★ เพิ่มใหม่ — เก็บข้อความ error ไว้แสดงตอน Offline

  async function handleCheck() {
    setState("loading"); // ← บรรทัดนี้มีอยู่แล้วในไฟล์เดิม

    // ★ ทั้ง try/catch block นี้คือของใหม่ทั้งหมด
    // เดิมฟังก์ชันจบแค่บรรทัด setState("loading") ด้านบน ไม่ทำอะไรต่อ
    try {
      const result = await checkSystem();       // ★ เรียก API จริง (เดิมไม่มีการเรียกเลย)
      setCategories(result.categories);          // ★ เก็บผลลัพธ์ (categories ยังว่างเพราะรอ Issue 4)
      setState("success");                       // ★ สำเร็จ → เปลี่ยนสถานะเป็น success
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong"); // ★ เก็บข้อความ error
      setState("error");                          // ★ ล้มเหลว → เปลี่ยนสถานะเป็น error
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      {/* ปุ่มนี้มีอยู่แล้วในไฟล์เดิม ไม่ได้แก้ */}
      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* ★ Block นี้ทั้งหมดคือของใหม่ — เดิมมีแค่คอมเมนต์ TODO(Issue 4) ตรงนี้ ไม่มีโค้ดแสดงผลจริง */}
      {state === "success" && (
        <div className="mt-4">
          <p className="fw-bold text-success">System Status: Online</p>
        </div>
      )}

      {/* ★ Block นี้ก็ใหม่เหมือนกัน แสดงตอน backend เรียกไม่ติด */}
      {state === "error" && (
        <div className="mt-4">
          <p className="fw-bold text-danger">System Status: Offline</p>
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}