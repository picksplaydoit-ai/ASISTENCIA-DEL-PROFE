/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Student, Category, Grade } from "../types";
import { Save, HelpCircle, Edit3, ClipboardList, Check, TrendingUp, AlertCircle } from "lucide-react";

interface GradesTableProps {
  groupId: string;
}

// Helper to calculate student averages
export function calculateStudentGrades(
  student: Student,
  categories: Category[],
  grades: Grade[]
) {
  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const categoryAverages: { [catId: string]: { avg: number; count: number } } = {};

  // Initialize averages for all categories
  categories.forEach((cat) => {
    categoryAverages[cat.id] = { avg: 0, count: 0 };
  });

  // Group and sum grades by category
  studentGrades.forEach((g) => {
    if (categoryAverages[g.categoryId]) {
      categoryAverages[g.categoryId].avg += g.grade;
      categoryAverages[g.categoryId].count += 1;
    }
  });

  let finalGrade = 0;
  let totalWeightUsed = 0;

  categories.forEach((cat) => {
    const data = categoryAverages[cat.id];
    if (data.count > 0) {
      const avg = data.avg / data.count;
      categoryAverages[cat.id].avg = avg;
      finalGrade += avg * (cat.percentage / 100);
      totalWeightUsed += cat.percentage;
    } else {
      categoryAverages[cat.id].avg = 0;
    }
  });

  return {
    categoryAverages,
    finalGrade: Math.round(finalGrade * 10) / 10,
    isPassed: finalGrade >= 60,
  };
}

export default function GradesTable({ groupId }: GradesTableProps) {
  const students = useDocenteStore((state) =>
    state.students.filter((s) => s.groupId === groupId)
  );
  const categories = useDocenteStore((state) =>
    state.categories.filter((c) => c.groupId === groupId)
  );
  const grades = useDocenteStore((state) => state.grades);
  const saveGrade = useDocenteStore((state) => state.saveGrade);

  const [activeTab, setActiveTab] = useState<"matrix" | "capture">("matrix");

  // State for the capture flow
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activityName, setActivityName] = useState("");
  const [capturedScores, setCapturedScores] = useState<{ [studentId: string]: string }>({});
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);

  // Initialize scores for student capture
  const handleStartCapture = () => {
    if (!selectedCategoryId) return;
    const scores: { [studentId: string]: string } = {};
    students.forEach((s) => {
      // Find if there is an existing grade for this exact activity and category
      const existing = grades.find(
        (g) =>
          g.studentId === s.id &&
          g.categoryId === selectedCategoryId &&
          g.activityName.trim().toLowerCase() === activityName.trim().toLowerCase()
      );
      scores[s.id] = existing ? existing.grade.toString() : "";
    });
    setCapturedScores(scores);
    setCaptureMessage(null);
  };

  const handleScoreChange = (studentId: string, value: string) => {
    // Validate value to be between 0 and 100
    if (value === "") {
      setCapturedScores((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }
    const score = parseFloat(value);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      setCapturedScores((prev) => ({ ...prev, [studentId]: value }));
    }
  };

  const handleSaveAllGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !activityName.trim()) {
      setCaptureMessage("Defina la categoría y el nombre de la actividad.");
      return;
    }

    try {
      for (const studentId of Object.keys(capturedScores)) {
        const val = capturedScores[studentId];
        if (val !== "") {
          const score = parseFloat(val);
          await saveGrade(studentId, selectedCategoryId, activityName, score);
        }
      }
      setCaptureMessage("¡Calificaciones guardadas con éxito!");
      setTimeout(() => setCaptureMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setCaptureMessage("Error al guardar calificaciones.");
    }
  };

  return (
    <div id="grades-table-root" className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-5xl mx-auto">
      {/* Header tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Control de Calificaciones</h3>
          <p className="text-sm text-slate-500">Visualiza el avance ponderado o registra nuevas evaluaciones.</p>
        </div>
        <div className="flex bg-slate-50 p-1 rounded-lg self-start">
          <button
            id="tab-matrix"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "matrix" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Vista General (Promedios)
          </button>
          <button
            id="tab-capture"
            onClick={() => {
              setActiveTab("capture");
              if (categories.length > 0 && !selectedCategoryId) {
                setSelectedCategoryId(categories[0].id);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "capture" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Capturar Notas
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <p className="mb-2">Por favor, cree al menos una categoría de evaluación antes de capturar calificaciones.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <p>Importe o registre alumnos en este grupo antes de capturar sus calificaciones.</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERALL MATRIX */}
          {activeTab === "matrix" && (
            <div>
              {totalPercentage !== 100 && (
                <div id="matrix-percentage-warning" className="flex items-center gap-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-3 text-xs mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Atención: Las ponderaciones de sus categorías de evaluación suman <strong>{totalPercentage}%</strong> en lugar de <strong>100%</strong>. Los promedios ponderados no se verán de forma correcta hasta que ajuste el total de categorías a 100%.
                  </span>
                </div>
              )}

              <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto shadow-sm bg-white">
                <table className="w-full text-left text-xs text-slate-600 border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3.5 w-16">Matrícula</th>
                      <th className="px-4 py-3.5">Alumno</th>
                      {categories.map((cat) => (
                        <th key={cat.id} className="px-4 py-3.5 text-center font-semibold">
                          <div>{cat.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">Pond: {cat.percentage}%</div>
                        </th>
                      ))}
                      <th className="px-4 py-3.5 text-center font-bold bg-indigo-50/30 text-indigo-950 w-28">
                        Promedio Final
                      </th>
                      <th className="px-4 py-3.5 text-center w-28">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => {
                      const results = calculateStudentGrades(student, categories, grades);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-mono font-medium text-slate-500">{student.matricula}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                          {categories.map((cat) => {
                            const avgVal = results.categoryAverages[cat.id]?.avg || 0;
                            const count = results.categoryAverages[cat.id]?.count || 0;
                            return (
                              <td key={cat.id} className="px-4 py-3 text-center">
                                {count > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{avgVal.toFixed(1)}</span>
                                    <span className="text-[9px] text-slate-400">({count} act)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center font-bold bg-indigo-50/10 text-indigo-700 text-sm">
                            {results.finalGrade}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                                results.isPassed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}
                            >
                              {results.isPassed ? "Aprobado" : "Reprobado"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GRADE CAPTURE PANEL */}
          {activeTab === "capture" && (
            <div id="grades-capture-section">
              <form onSubmit={handleSaveAllGrades} className="space-y-6">
                <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Categoría de Evaluación
                    </label>
                    <select
                      id="select-category-capture"
                      value={selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        setActivityName("");
                        setCapturedScores({});
                      }}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Activity name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Nombre de la Actividad / Examen
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="input-activity-name"
                        type="text"
                        value={activityName}
                        onChange={(e) => setActivityName(e.target.value)}
                        placeholder="Ej: Tarea 1, Examen Mensual..."
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        id="btn-load-capture"
                        type="button"
                        onClick={handleStartCapture}
                        disabled={!activityName.trim() || !selectedCategoryId}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition shrink-0"
                      >
                        Iniciar Captura
                      </button>
                    </div>
                  </div>
                </div>

                {/* Captured List */}
                {Object.keys(capturedScores).length > 0 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Capturando notas para: <span className="text-indigo-600 normal-case font-semibold">"{activityName}"</span>
                      </h4>
                      <div className="text-[10px] text-slate-400">Presiona Tab para moverte entre alumnos</div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white max-h-[400px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600 border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="px-4 py-3 w-32">Matrícula</th>
                            <th className="px-4 py-3">Alumno</th>
                            <th className="px-4 py-3 text-right w-44">Calificación (0 - 100)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/30 transition">
                              <td className="px-4 py-3 font-mono font-medium text-slate-500">{student.matricula}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <input
                                    id={`input-grade-${student.id}`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={capturedScores[student.id] || ""}
                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                    placeholder="S/N"
                                    className="w-24 text-right text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-700 focus:border-indigo-500"
                                  />
                                  <span className="text-slate-400 font-normal w-4">/100</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {captureMessage && (
                      <div
                        id="capture-status-message"
                        className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                          captureMessage.includes("éxito")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {captureMessage.includes("éxito") ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>{captureMessage}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        id="btn-cancel-capture"
                        type="button"
                        onClick={() => {
                          setCapturedScores({});
                          setActivityName("");
                        }}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
                      >
                        Limpiar
                      </button>
                      <button
                        id="btn-save-grades-submit"
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        Guardar Calificaciones
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
