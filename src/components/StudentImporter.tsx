/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Student } from "../types";
import { Upload, Clipboard, Download, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface StudentImporterProps {
  groupId: string;
  onImportComplete?: () => void;
}

export default function StudentImporter({ groupId, onImportComplete }: StudentImporterProps) {
  const importStudents = useDocenteStore((state) => state.importStudents);
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [previewList, setPreviewList] = useState<{ name: string; matricula: string }[]>([]);
  const [importedStudents, setImportedStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse lines into Name and Matricula
  const parseRawText = (text: string) => {
    setError(null);
    const lines = text.split("\n");
    const parsed: { name: string; matricula: string }[] = [];

    // Skip header common names
    const isHeader = (line: string) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("alumno") ||
        lower.includes("nombre") ||
        lower.includes("matricula") ||
        lower.includes("matrícula") ||
        lower.includes("student") ||
        lower.includes("id")
      );
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Detect header and skip
      if (parsed.length === 0 && isHeader(trimmed)) {
        return;
      }

      // Support comma, semicolon, or tab separation
      let parts: string[] = [];
      if (trimmed.includes("\t")) {
        parts = trimmed.split("\t");
      } else if (trimmed.includes(",")) {
        parts = trimmed.split(",");
      } else if (trimmed.includes(";")) {
        parts = trimmed.split(";");
      } else {
        // Fallback space separated or single value
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace !== -1) {
          parts = [trimmed.substring(0, lastSpace).trim(), trimmed.substring(lastSpace).trim()];
        } else {
          parts = [trimmed];
        }
      }

      if (parts.length >= 2) {
        const name = parts[0].trim().replace(/^["']|["']$/g, ""); // clean quotes
        const matricula = parts[1].trim().replace(/^["']|["']$/g, "");
        if (name && matricula) {
          parsed.push({ name, matricula });
        }
      } else if (parts.length === 1 && parts[0]) {
        // If single item, treat as Name and assign temporary matricula or vice versa
        const val = parts[0].trim();
        parsed.push({ name: val, matricula: "TEMP_" + Math.floor(1000 + Math.random() * 9000) });
      }
    });

    if (parsed.length === 0) {
      setError("No se encontraron datos válidos. Asegúrese de incluir Alumno y Matrícula separados por coma o tabulaciones.");
    } else {
      setPreviewList(parsed);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        parseRawText(text);
      }
    };
    reader.onerror = () => {
      setError("Error al leer el archivo seleccionado.");
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setError("Por favor, pegue texto válido en el campo.");
      return;
    }
    parseRawText(pasteText);
  };

  const executeImport = async () => {
    if (previewList.length === 0) return;
    setImporting(true);
    try {
      const result = await importStudents(groupId, previewList);
      setImportedStudents(result);
      setPreviewList([]);
      setPasteText("");
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al procesar la importación.");
    } finally {
      setImporting(false);
    }
  };

  // Export to Excel-compatible CSV with Spanish accents support
  const exportAccessCodesCSV = () => {
    if (importedStudents.length === 0) return;

    const headers = ["Alumno", "Matricula", "CodigoAcceso"];
    const rows = importedStudents.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.matricula}"`,
      `"${s.accessCode}"`,
    ]);

    const csvContent =
      "\uFEFF" + // UTF-8 BOM
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Accesos_Alumnos_Grupo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImporter = () => {
    setPreviewList([]);
    setImportedStudents([]);
    setError(null);
    setPasteText("");
  };

  return (
    <div id="student-importer-root" className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Importación Masiva de Alumnos</h3>
          <p className="text-sm text-slate-500">
            Sube un archivo CSV o pega los datos desde Excel. Se generará un código de acceso único para cada alumno de forma automática.
          </p>
        </div>
        {(previewList.length > 0 || importedStudents.length > 0) && (
          <button
            id="btn-reset-importer"
            onClick={resetImporter}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        )}
      </div>

      {error && (
        <div id="importer-error" className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-100 rounded-lg p-4 mb-6 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Select or Paste */}
      {previewList.length === 0 && importedStudents.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Drag & Drop File Section */}
          <div
            id="drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition text-center ${
              dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-3 bg-slate-50 text-slate-500 rounded-full mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Arrastra tu archivo aquí</p>
            <p className="text-xs text-slate-400 mb-3">Soporta archivos CSV o de texto separado por comas</p>
            <button
              id="btn-select-file"
              type="button"
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
            >
              Seleccionar Archivo
            </button>
          </div>

          {/* Copy-Paste Text Area */}
          <div className="flex flex-col border border-slate-200 rounded-xl p-5 bg-slate-50/30">
            <div className="flex items-center gap-2 text-slate-700 mb-3 font-medium text-sm">
              <Clipboard className="w-4 h-4 text-slate-500" />
              <span>Copiar y pegar de Excel / Sheets</span>
            </div>
            <textarea
              id="txt-paste-area"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Alumno,Matricula&#10;Juan Pérez,23001&#10;Ana López,23002&#10;Luis García,23003"
              rows={5}
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              id="btn-process-paste"
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Procesar datos pegados
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview parsed data */}
      {previewList.length > 0 && (
        <div id="importer-preview-section">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-700 font-medium text-sm">
              Alumnos detectados: <span className="font-bold text-indigo-600">{previewList.length}</span>
            </div>
          </div>

          <div className="border border-slate-100 rounded-lg overflow-hidden max-h-60 overflow-y-auto mb-6">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Nombre Completo (Alumno)</th>
                  <th className="px-4 py-2.5">Matrícula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewList.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{item.name}</td>
                    <td className="px-4 py-2 font-mono">{item.matricula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              id="btn-cancel-preview"
              onClick={() => setPreviewList([])}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-import"
              onClick={executeImport}
              disabled={importing}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {importing ? "Registrando..." : "Confirmar e Importar Alumnos"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Show imported results with Access Codes & Excel export */}
      {importedStudents.length > 0 && (
        <div id="importer-results-section" className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">¡Importación Exitosa!</h4>
                <p className="text-xs text-emerald-600">Se han registrado {importedStudents.length} alumnos con códigos de acceso creados.</p>
              </div>
            </div>
            <button
              id="btn-export-excel"
              onClick={exportAccessCodesCSV}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar Códigos a Excel
            </button>
          </div>

          <div className="border border-slate-200/60 rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white mb-4">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200/60 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Matrícula</th>
                  <th className="px-4 py-2.5">Alumno</th>
                  <th className="px-4 py-2.5">Código de Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {importedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-mono font-medium text-slate-800">{student.matricula}</td>
                    <td className="px-4 py-2 text-slate-700">{student.name}</td>
                    <td className="px-4 py-2 font-mono text-indigo-600 font-bold bg-indigo-50/20">{student.accessCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Descarga la lista anterior y compártela de forma privada con los alumnos para que puedan ingresar usando su matrícula y código.
          </p>
        </div>
      )}
    </div>
  );
}
