/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { calculateStudentGrades } from "./GradesTable";
import { LogIn, LogOut, GraduationCap, Key, FileText, User, RefreshCw, Calendar, CheckCircle2, XCircle, LayoutDashboard, ClipboardList, Check, Minus, X } from "lucide-react";

export default function StudentPortal() {
  const activeStudent = useDocenteStore((state) => state.activeStudent);
  const activeStudentGroup = useDocenteStore((state) => state.activeStudentGroup);
  const activeStudentCategories = useDocenteStore((state) => state.activeStudentCategories);
  const activeStudentGrades = useDocenteStore((state) => state.activeStudentGrades);
  const accessStudentPortal = useDocenteStore((state) => state.accessStudentPortal);
  const logoutStudent = useDocenteStore((state) => state.logoutStudent);

  const activeStudentActivities = useDocenteStore((state) => state.activeStudentActivities);
  const activeStudentAttendances = useDocenteStore((state) => state.activeStudentAttendances);

  // Form input states
  const [matricula, setMatricula] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"general" | "activities" | "attendances">("general");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const mat = matricula.trim();
    const code = accessCode.trim();

    if (!mat || !code) {
      setError("Ambos campos son requeridos.");
      return;
    }

    setLoading(true);
    try {
      const result = await accessStudentPortal(mat, code);
      if (!result.success) {
        setError(result.error || "Matrícula o código de acceso incorrectos.");
      }
    } catch (err) {
      console.error(err);
      setError("Error al procesar la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  // If not logged in, show the login portal
  if (!activeStudent) {
    return (
      <div id="student-login-container" className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          {/* Top banner visual element */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600" />

          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Portal de Consulta Alumnos</h2>
            <p className="text-sm text-slate-400 mt-1">
              Ingresa tus credenciales únicas para ver tus calificaciones y estatus en tiempo real.
            </p>
          </div>

          {error && (
            <div id="portal-login-error" className="flex items-center gap-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl p-3.5 text-xs mb-6">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="student-matricula" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Matrícula del Alumno
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej: 23001"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="student-access-code" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Código de Acceso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="student-access-code"
                  type="password"
                  autoComplete="current-password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Ej: A7K9P4X2"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                  required
                />
              </div>
            </div>

            <button
              id="btn-student-portal-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition duration-150 flex items-center justify-center gap-1.5"
            >
              {loading ? "Verificando..." : "Ingresar al Portal"}
              <LogIn className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-50 pt-4">
            <p className="text-[10px] text-slate-400 italic">
              * El código es único y te lo proporciona tu profesor. No se requiere registro de cuenta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If logged in, show student grades report
  const results = calculateStudentGrades(activeStudent, activeStudentCategories, activeStudentGrades, activeStudentAttendances, activeStudentGroup?.requiredAttendancePercentage || 0, activeStudentActivities);
  const totalPercentage = activeStudentCategories.reduce((sum, c) => sum + c.percentage, 0);

  return (
    <div id="student-report-root" className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner details */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Portal del Alumno (Consulta Activa)
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-1">{activeStudent.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
              <span className="font-mono">Matrícula: {activeStudent.matricula}</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                Grupo: {activeStudentGroup?.name || "Cargando..."}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                Ciclo: {activeStudentGroup?.schoolYear || "-"}
              </span>
            </div>
          </div>
        </div>

        <button
          id="btn-logout-portal"
          onClick={logoutStudent}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl shadow-sm transition shrink-0 self-start sm:self-center w-full sm:w-auto"
        >
          Cerrar Sesión
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "general" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Resumen
        </button>
        <button
          onClick={() => setActiveTab("activities")}
          className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "activities" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Actividades
        </button>
        <button
          onClick={() => setActiveTab("attendances")}
          className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "attendances" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4" /> Asistencias
        </button>
      </div>

      {activeTab === "general" && (
        <div className="space-y-6 animate-fade-in">
          {/* Primary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* GPA Badge */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-44">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promedio Final</div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-800 tracking-tight">{results.finalGrade}</span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>
              <div className="text-xs text-slate-500">
                Calculado proporcionalmente según rubricas.
              </div>
            </div>

            {/* Status Card */}
            <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-44 ${
              results.statusText === "Aprobado" ? "bg-emerald-50/50 border-emerald-100" : 
              results.statusText === "SD" ? "bg-orange-50/50 border-orange-100" : "bg-rose-50/50 border-rose-100"
            }`}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estatus Académico</div>
              <div className="my-2 flex items-center gap-3">
                {results.statusText === "Aprobado" && <CheckCircle2 className="w-10 h-10 text-emerald-600" />}
                {results.statusText === "Reprobado" && <XCircle className="w-10 h-10 text-rose-600" />}
                {results.statusText === "SD" && <XCircle className="w-10 h-10 text-orange-600" />}
                <div>
                  <div className={`text-xl font-bold ${
                    results.statusText === "Aprobado" ? "text-emerald-800" : 
                    results.statusText === "SD" ? "text-orange-800" : "text-rose-800"
                  }`}>{results.statusText}</div>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-slate-600">
                {results.isOverridden ? "Este estatus fue asignado manualmente por el profesor." : "Calculado automáticamente."}
              </div>
            </div>

            {/* Attendance Card */}
            <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-44 ${
              results.hasDerecho ? "bg-blue-50/50 border-blue-100" : "bg-rose-50/50 border-rose-100"
            }`}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asistencias</div>
              <div className="my-2 flex items-baseline gap-2">
                <span className={`text-5xl font-black tracking-tight ${results.hasDerecho ? "text-blue-800" : "text-rose-800"}`}>{results.attendancePct}%</span>
              </div>
              <div className="text-xs text-slate-500">
                Mínimo requerido: <span className="font-bold">{activeStudentGroup?.requiredAttendancePercentage}%</span>
              </div>
            </div>
          </div>

          {totalPercentage !== 100 && (
            <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-xl p-4 text-xs font-medium">
              * Su profesor aún está configurando los porcentajes de evaluación para este grupo (total actual: {totalPercentage}%). Su promedio final puede variar en el transcurso.
            </div>
          )}
        </div>
      )}

      {activeTab === "activities" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-800">Rúbrica y Actividades Detalladas</h3>
            <p className="text-xs text-slate-400">Desglose de calificaciones por categoría de evaluación.</p>
          </div>

          {/* Rubric Summary */}
          {activeStudentCategories.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {activeStudentCategories.map((cat) => (
                <div key={`rubric-${cat.id}`} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                  <span className="font-bold text-slate-700 text-sm truncate" title={cat.name}>{cat.name}</span>
                  <span className="text-2xl font-black text-indigo-600 mt-1">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          )}

          {activeStudentCategories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No se han definido categorías de evaluación para este grupo escolar todavía.
            </div>
          ) : (
            <div className="space-y-6">
              {activeStudentCategories.map((cat) => {
                const catGrades = activeStudentGrades.filter((g) => g.categoryId === cat.id);
                const catResults = results.categoryAverages[cat.id];
                const avgScore = catResults?.avg || 0;
                const count = catResults?.count || 0;

                return (
                  <div key={cat.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    {/* Category header inside dashboard */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                        <span className="text-[10px] text-indigo-700 font-bold ml-2.5 uppercase tracking-wide bg-indigo-100 px-2 py-0.5 rounded">
                          Valor: {cat.percentage}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Promedio</span>
                        <span className="text-sm font-black text-indigo-600">{count > 0 ? avgScore.toFixed(1) : "N/A"}</span>
                      </div>
                    </div>

                    {/* Grades in category list */}
                    {catGrades.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs italic">
                        Sin calificaciones.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {catGrades.map((grade) => (
                          <div key={grade.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition text-sm">
                            <div>
                              <div className="font-semibold text-slate-700">{grade.activityName}</div>
                              <div className="text-[10px] text-slate-400">Fecha: {grade.date}</div>
                            </div>
                            <div className="font-bold text-slate-800 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm font-mono text-xs">
                              {grade.grade} <span className="text-[9px] text-slate-400 font-normal">/100</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "attendances" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-800">Detalle de Asistencias</h3>
            <p className="text-xs text-slate-400">Registro histórico de pases de lista.</p>
          </div>

          {activeStudentAttendances.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No se han registrado pases de lista todavía.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {activeStudentAttendances.sort((a, b) => b.date.localeCompare(a.date)).map((att) => {
                const status = att.records ? att.records[activeStudent.id] : undefined;
                return (
                  <div key={att.id} className="border border-slate-100 rounded-lg p-3 text-center shadow-sm flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-600 mb-2">{att.date}</span>
                    {(status === true || status === "present") && <Check className="w-5 h-5 text-emerald-500" title="Presente" />}
                    {status === "absent" && <X className="w-5 h-5 text-rose-500" title="Falta" />}
                    {status === "justified" && <Minus className="w-5 h-5 text-amber-500" title="Justificada" />}
                    {status === undefined && <X className="w-5 h-5 text-rose-500" title="Falta (No Registrado)" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
