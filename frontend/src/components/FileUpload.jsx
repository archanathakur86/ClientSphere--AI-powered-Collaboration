import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { UploadCloud, FileCode, Info } from "lucide-react";

export default function FileUpload({ projectId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
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

  return (
    <div className="card p-6 space-y-3 border-indigo-500/20 shadow-md">
      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
        <UploadCloud className="w-4 h-4" />
        <span>Upload Project Asset or Code File</span>
      </div>

      <div className="border-2 border-dashed border-slate-800 dark:border-slate-800 light:border-slate-300 hover:border-indigo-500/60 rounded-2xl p-6 text-center transition-all bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50">
        <input
          ref={inputRef}
          type="file"
          id="file-upload-input"
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white dark:text-white light:text-slate-900">
            {uploading ? "Uploading to Cloud Storage..." : "Click to select or drop file"}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
            Supports code, images, docs (max 10MB)
          </span>
        </label>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 leading-relaxed pt-1">
        <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <span>
          Tip: Uploading a file with the same name will automatically bump its version number (v2, v3...) and run an instant AI code diff & risk analysis.
        </span>
      </div>
    </div>
  );
}