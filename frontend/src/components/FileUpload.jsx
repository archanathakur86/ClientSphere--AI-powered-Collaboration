import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { UploadCloud, Loader2 } from "lucide-react";

const STYLES = `
@keyframes fuPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes fuShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
.fu-drag { animation: fuPulse 1.6s ease-in-out infinite; }
.fu-shimmer {
  background: linear-gradient(90deg, #f1ece4 0%, #f6dccb 50%, #f1ece4 100%);
  background-size: 200% 100%;
  animation: fuShimmer 1.6s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

export default function FileUpload({ projectId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const uploadFile = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await api.post(`/projects/${projectId}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploaded = res.data.file;
      toast.success(uploaded.version > 1 ? `Uploaded as new version v${uploaded.version}` : "File uploaded");
      // `_justUploaded` tells the file card to auto-run the AI review for new versions of code files
      onUploaded({ ...uploaded, _justUploaded: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFile = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    uploadFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="relative">
      <style>{STYLES}</style>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) inputRef.current?.click();
        }}
        className={`rounded-[32px] border-2 border-dashed px-8 py-10 text-center transition-all duration-300 cursor-pointer ${
          dragging
            ? "border-[#c4673f] bg-[#f6dccb]/40 fu-drag"
            : "border-[#d9d1c4] bg-[#ffffff] hover:border-[#c4673f] hover:bg-[#fdf6f1]"
        } ${uploading ? "cursor-wait" : ""}`}
      >
        <input ref={inputRef} type="file" onChange={handleFile} disabled={uploading} className="hidden" />

        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-colors ${
            dragging ? "bg-[#c4673f]" : "bg-[#f6dccb]"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-7 h-7 text-[#a4502d] animate-spin" />
          ) : (
            <UploadCloud className={`w-7 h-7 ${dragging ? "text-[#faf7f2]" : "text-[#a4502d]"}`} />
          )}
        </div>

        <p className="text-3xl mt-6" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
          {uploading ? "Uploading to cloud storage…" : dragging ? "Drop it here" : "Drop a file, or click to browse"}
        </p>
        <p className="mt-3 text-sm text-[#6b655e] max-w-lg mx-auto leading-relaxed">
          Up to 10MB. Upload a file with the same name again to save a new version, and AI will compare it with the
          previous one.
        </p>

        {uploading && <div className="fu-shimmer h-1.5 rounded-full mt-6 max-w-xs mx-auto" />}
      </div>
    </div>
  );
}