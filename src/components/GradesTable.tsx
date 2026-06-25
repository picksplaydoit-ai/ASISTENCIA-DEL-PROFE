/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Student, Category, Grade } from "../types";
import { Save, HelpCircle, Edit3, ClipboardList, Check, TrendingUp, AlertCircle, LayoutDashboard, CalendarDays, Edit, X } from "lucide-react";

interface GradesTableProps {
  groupId: string;
}

// Helper to calculate student averages
export function calculateStudentGrades(
  student: Student,
  categories: Category[],
  grades: Grade[],
  attendances: any[] = [],
  requiredAttendancePct: number = 0,
  activities: Activity[] = []
) {
  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const categoryAverages: { [catId: string]: { avg: number; count: number } } = {};

  categories.forEach((cat) => {
    categoryAverages[cat.id] = { avg: 0, count: 0 };
  });

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
    const hasActivities = activities.some(a => a.categoryId === cat.id);
    
    if (data.count > 0) {
      const avg = data.avg / data.count;
      categoryAverages[cat.id].avg = avg;
      finalGrade += avg * (cat.percentage / 100);
      totalWeightUsed += cat.percentage;
    } else {
      categoryAverages[cat.id].avg = 0;
      if (hasActivities) {
        totalWeightUsed += cat.percentage;
      }
    }
  });
  
  let normalizedFinalGrade = 0;
  if (totalWeightUsed > 0) {
    normalizedFinalGrade = (finalGrade / totalWeightUsed) * 100;
  }

  const roundedGrade = Math.round(normalizedFinalGrade * 10) / 10;
  
  let hasDerecho = true;
  let attendancePct = 100;
  
  if (attendances.length > 0 && requiredAttendancePct > 0) {
    const totalClasses = attendances.length;
    
    if (totalClasses > 0) {
      const studentPresentCount = attendances.filter(a => {
        const status = a.records && a.records[student.id];
        return status === true || status === "present" || status === "justified";
      }).length;
      attendancePct = Math.round((studentPresentCount / totalClasses) * 100);
      hasDerecho = attendancePct >= requiredAttendancePct;
    }
  }

  // Apply manual overrides if present
  let effectiveGrade = student.manualFinalGrade !== undefined && student.manualFinalGrade !== null ? student.manualFinalGrade : (hasDerecho ? roundedGrade : 0);
  
  let isPassed = effectiveGrade >= 60;
  let statusText = !hasDerecho ? "SD" : (isPassed ? "Aprobado" : "Reprobado");
  
  if (student.manualStatus) {
    statusText = student.manualStatus;
    isPassed = statusText === "Aprobado";
  }

  return {
    categoryAverages,
    calculatedGrade: roundedGrade,
    finalGrade: effectiveGrade,
    isPassed,
    hasDerecho,
    attendancePct,
    statusText,
    isOverridden: student.manualFinalGrade !== undefined && student.manualFinalGrade !== null || !!student.manualStatus
  };
}

export default function GradesTable({ groupId }: GradesTableProps) {
  const groups = useDocenteStore((state) => state.groups);
  const group = groups.find(g => g.id === groupId);
  const attendances = useDocenteStore((state) => state.attendances).filter(a => a.groupId === groupId);
  
  const allStudents = useDocenteStore((state) => state.students);
  const students = React.useMemo(() =>
    allStudents.filter((s) => s.groupId === groupId),
    [allStudents, groupId]
  );
  const allCategories = useDocenteStore((state) => state.categories);
  const categories = React.useMemo(() =>
    allCategories.filter((c) => c.groupId === groupId),
    [allCategories, groupId]
  );
  const activities = useDocenteStore((state) => state.activities).filter(a => a.groupId === groupId);
  const grades = useDocenteStore((state) => state.grades);
  const saveGrade = useDocenteStore((state) => state.saveGrade);
  const updateStudentOverride = useDocenteStore((state) => state.updateStudentOverride);

  const [activeTab, setActiveTab] = useState<"dashboard" | "matrix" | "attendance" | "activities">("dashboard");

  // Edit Override State
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditGrade, setInlineEditGrade] = useState<string>("");

  // Filtering state
  const [attendanceMonth, setAttendanceMonth] = useState<string>("all");
  const [activitiesCategory, setActivitiesCategory] = useState<string>(categories[0]?.id || "");

  // Derived Attendance Data
  const availableMonths = Array.from(new Set(attendances.map(a => a.date.substring(0, 7)))).sort().reverse();
  const filteredAttendances = attendances.filter(a => attendanceMonth === "all" || a.date.startsWith(attendanceMonth));
  const uniqueDates = Array.from(new Set(filteredAttendances.map(a => a.date))).sort();

  // Derived Activities Data
  const filteredActivities = activities.filter(a => a.categoryId === activitiesCategory);

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);

  // Group metrics
  const groupResults = students.map(s => calculateStudentGrades(s, categories, grades, attendances, group?.requiredAttendancePercentage || 0, activities));
  
  const totalStudents = students.length;
  const approvedCount = groupResults.filter(r => r.statusText === "Aprobado").length;
  const failedCount = groupResults.filter(r => r.statusText === "Reprobado").length;
  const sdCount = groupResults.filter(r => r.statusText === "SD").length;
  
  const avgFinalGrade = totalStudents > 0 
    ? (groupResults.reduce((acc, r) => acc + r.finalGrade, 0) / totalStudents).toFixed(1)
    : "0";
    
  const avgAttendance = totalStudents > 0
    ? (groupResults.reduce((acc, r) => acc + r.attendancePct, 0) / totalStudents).toFixed(0)
    : "0";

  return (
    <div id="grades-table-root" className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-5xl mx-auto">
      {/* Header tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Resultados del Grupo</h3>
          <p className="text-sm text-slate-500">Visualiza el avance ponderado, asistencias y dashboard.</p>
        </div>
        <div className="flex flex-wrap bg-slate-50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "dashboard" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "matrix" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calificaciones</span>
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "activities" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actividades</span>
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "attendance" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Asistencias Detalle</span>
          </button>
        </div>
      </div>

      {/* TAB: DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Promedio Grupo</div>
              <div className="text-3xl font-black text-indigo-900">{avgFinalGrade}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Asistencia Global</div>
              <div className="text-3xl font-black text-emerald-900">{avgAttendance}%</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Aprobados</div>
              <div className="text-3xl font-black text-blue-900">{approvedCount} <span className="text-sm font-medium text-blue-600/70">/ {totalStudents}</span></div>
              <div className="text-[10px] font-semibold text-blue-500 mt-1">{totalStudents > 0 ? Math.round((approvedCount / totalStudents) * 100) : 0}% del grupo</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
              <div className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Reprobados</div>
              <div className="text-3xl font-black text-rose-900">{failedCount} <span className="text-sm font-medium text-rose-600/70">/ {totalStudents}</span></div>
              <div className="text-[10px] font-semibold text-rose-500 mt-1">{totalStudents > 0 ? Math.round((failedCount / totalStudents) * 100) : 0}% del grupo</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Sin Derecho (SD)</div>
              <div className="text-3xl font-black text-amber-900">{sdCount} <span className="text-sm font-medium text-amber-600/70">/ {totalStudents}</span></div>
              <div className="text-[10px] font-semibold text-amber-500 mt-1">{totalStudents > 0 ? Math.round((sdCount / totalStudents) * 100) : 0}% del grupo</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CALIFICACIONES (MATRIX) */}
      {activeTab === "matrix" && (
        <div className="animate-fade-in">
          {totalPercentage !== 100 && (
            <div className="flex items-center gap-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-3 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Atención: Las ponderaciones suman <strong>{totalPercentage}%</strong> en lugar de <strong>100%</strong>.
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
                  <th className="px-4 py-3.5 text-center font-bold text-slate-500 w-24">Asistencia</th>
                  <th className="px-4 py-3.5 text-center font-bold bg-indigo-50/30 text-indigo-950 w-28">
                    Promedio Final
                  </th>
                  <th className="px-4 py-3.5 text-center w-36">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const results = calculateStudentGrades(student, categories, grades, attendances, group?.requiredAttendancePercentage || 0, activities);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-mono font-medium text-slate-500">{student.matricula}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {student.name}
                        {results.isOverridden && <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">Editado M.</span>}
                      </td>
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
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${results.hasDerecho ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {results.attendancePct}%
                        </span>
                      </td>
                      <td 
                        className="px-4 py-3 text-center font-bold bg-indigo-50/10 text-indigo-700 text-sm cursor-pointer hover:bg-indigo-50"
                        title="Doble clic para editar"
                        onDoubleClick={() => {
                          setInlineEditId(student.id);
                          setInlineEditGrade(student.manualFinalGrade !== undefined && student.manualFinalGrade !== null ? student.manualFinalGrade.toString() : results.calculatedGrade.toString());
                        }}
                      >
                        {inlineEditId === student.id ? (
                          <input 
                            type="number"
                            autoFocus
                            className="w-16 p-1 text-center border border-indigo-300 rounded text-sm"
                            value={inlineEditGrade}
                            onChange={e => setInlineEditGrade(e.target.value)}
                            onBlur={async () => {
                              const val = inlineEditGrade === "" ? null : parseFloat(inlineEditGrade);
                              await updateStudentOverride(student.id, val, student.manualStatus);
                              setInlineEditId(null);
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                 const val = inlineEditGrade === "" ? null : parseFloat(inlineEditGrade);
                                 await updateStudentOverride(student.id, val, student.manualStatus);
                                 setInlineEditId(null);
                              } else if (e.key === "Escape") {
                                 setInlineEditId(null);
                              }
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>{results.finalGrade}</span>
                            {student.manualFinalGrade !== undefined && student.manualFinalGrade !== null && <span className="text-[9px] text-indigo-400 leading-none">Manual</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select 
                          value={student.manualStatus || ""}
                          onChange={async (e) => {
                            const val = e.target.value === "" ? null : e.target.value as any;
                            await updateStudentOverride(student.id, student.manualFinalGrade, val);
                          }}
                          className={`inline-flex items-center pl-2 pr-6 py-1 rounded-full text-xs font-bold shadow-sm appearance-none outline-none cursor-pointer text-center bg-no-repeat w-full max-w-[110px] ${
                            results.statusText === "Aprobado"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : results.statusText === "SD" 
                              ? "bg-orange-50 text-orange-700 border border-orange-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                          style={{ backgroundPosition: "right 0.5rem center", backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundSize: "1em" }}
                        >
                          {!student.manualStatus && <option value="">{results.statusText} (Auto)</option>}
                          {student.manualStatus && <option value="">Volver a Auto</option>}
                          <option value="Aprobado">Aprobado</option>
                          <option value="Reprobado">Reprobado</option>
                          <option value="SD">SD</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ASISTENCIAS DETALLE */}
      {activeTab === "attendance" && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-sm text-slate-600 font-medium">Filtro de Mes</div>
            <select
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Todos los meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto shadow-sm bg-white">
            <table className="w-full text-left text-xs text-slate-600 border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="px-4 py-3.5 w-16">Matrícula</th>
                  <th className="px-4 py-3.5 min-w-[150px]">Alumno</th>
                  <th className="px-4 py-3.5 text-center font-bold text-slate-800 bg-slate-100 border-r border-slate-100">%</th>
                  <th className="px-4 py-3.5 text-center font-bold text-slate-800 bg-slate-100 border-r border-slate-100">Asistencias</th>
                  <th className="px-4 py-3.5 text-center font-bold text-slate-800 bg-slate-100 border-r border-slate-100">Faltas</th>
                  <th className="px-4 py-3.5 min-w-[120px] bg-slate-100 border-r border-slate-100">Días de Falta</th>
                  {uniqueDates.map(d => (
                    <th key={d} className="px-2 py-3.5 text-center font-medium whitespace-nowrap min-w-[40px]">
                      {d.substring(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  let presents = 0;
                  let justified = 0;
                  let absents = 0;
                  const absentDays: string[] = [];

                  filteredAttendances.forEach(att => {
                    const status = att.records ? att.records[student.id] : false;
                    if (status === true || status === "present") {
                      presents++;
                    } else if (status === "justified") {
                      justified++;
                      presents++; // Justified counts towards present total
                    } else {
                      absents++;
                      absentDays.push(att.date.substring(5)); // MM-DD
                    }
                  });

                  const totalDays = presents + absents;
                  const pct = totalDays > 0 ? Math.round((presents / totalDays) * 100) : 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-500">{student.matricula}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 truncate max-w-[200px]" title={student.name}>{student.name}</td>
                      <td className="px-4 py-2.5 text-center font-bold bg-slate-50 border-x border-slate-100">
                        <span className={pct >= (group?.requiredAttendancePercentage || 0) ? 'text-emerald-600' : 'text-rose-600'}>{pct}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-emerald-600 bg-slate-50 border-x border-slate-100">
                        {presents} {justified > 0 && <span className="text-amber-500 text-[10px] ml-1" title="Justificadas">({justified})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-rose-600 bg-slate-50 border-r border-slate-100">
                        {absents}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-slate-500 bg-slate-50 border-r border-slate-100 break-words max-w-[150px]">
                        {absentDays.length > 0 ? absentDays.join(", ") : "-"}
                      </td>
                      {uniqueDates.map(d => {
                        const att = filteredAttendances.find(a => a.date === d);
                        const status = att?.records ? att.records[student.id] : undefined;
                        const isPresent = status === true || status === "present";
                        const isJustified = status === "justified";
                        
                        return (
                          <td key={d} className="px-2 py-2.5 text-center">
                            {!att ? <span className="text-slate-300">-</span> : 
                             isPresent ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : 
                             isJustified ? <Minus className="w-3.5 h-3.5 text-amber-500 mx-auto" /> :
                             <X className="w-3.5 h-3.5 text-rose-500 mx-auto" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ACTIVIDADES DETALLE */}
      {activeTab === "activities" && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-sm text-slate-600 font-medium">Filtrar por Rubro</div>
            <select
              value={activitiesCategory}
              onChange={(e) => setActivitiesCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {categories.length === 0 && <option value="">Sin categorías</option>}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.percentage}%)</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto shadow-sm bg-white">
            <table className="w-full text-left text-xs text-slate-600 border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="px-4 py-3.5 w-16">Matrícula</th>
                  <th className="px-4 py-3.5 min-w-[150px]">Alumno</th>
                  {filteredActivities.length === 0 ? (
                    <th className="px-4 py-3.5 font-normal text-slate-400 italic text-center">No hay actividades</th>
                  ) : (
                    filteredActivities.map(act => (
                      <th key={act.id} className="px-4 py-3.5 text-center min-w-[100px]">
                        <div className="font-semibold text-slate-800">{act.name}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {act.type === 'numeric' ? 'Calif (0-100)' : act.type === 'boolean' ? 'Entregado (Sí/No)' : `Trabajos (/${act.totalWorks})`}
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-500">{student.matricula}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 truncate max-w-[200px]" title={student.name}>{student.name}</td>
                      {filteredActivities.length === 0 ? (
                        <td className="px-4 py-2.5 text-center">-</td>
                      ) : (
                        filteredActivities.map(act => {
                          const g = grades.find(x => x.activityId === act.id && x.studentId === student.id);
                          return (
                            <td key={act.id} className="px-4 py-2.5 text-center">
                              {!g ? (
                                <span className="text-[10px] text-slate-400 italic">No entregado</span>
                              ) : act.type === 'numeric' ? (
                                <span className="font-bold text-slate-700">{g.grade}</span>
                              ) : act.type === 'boolean' ? (
                                g.delivered ? 
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Sí</span> : 
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">No</span>
                              ) : (
                                <span className="font-bold text-slate-700">{g.deliveredWorks} <span className="text-slate-400 font-normal">/ {act.totalWorks}</span></span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
