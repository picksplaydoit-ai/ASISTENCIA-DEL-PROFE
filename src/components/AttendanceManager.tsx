import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Calendar, Check, X, Minus, Search, Save, MessageSquare, Sparkles, Tag, Download } from "lucide-react";
import { getMexicoCityDateString } from "../lib/dateUtils";
import { exportGroupReportToExcel } from "../lib/exportExcel";

interface AttendanceManagerProps {
  groupId: string;
}

const COMMON_DAY_EVENTS = [
  "Feria de Ciencias",
  "Evento Deportivo",
  "Suspensión Oficial",
  "Consejo Técnico",
  "Concurso Académico",
  "Actividad Cívica",
  "Simulacro",
  "Festival Escolar"
];

const STUDENT_NOTE_PRESETS = [
  "Justificante médico",
  "Permiso de dirección",
  "Comisión deportiva",
  "Retardo",
  "Evento escolar",
  "Problema de salud"
];

export default function AttendanceManager({ groupId }: AttendanceManagerProps) {
  const [date, setDate] = useState(getMexicoCityDateString());
  const [search, setSearch] = useState("");

  const allStudents = useDocenteStore((state) => state.students);
  const students = React.useMemo(() =>
    allStudents.filter((s) => s.groupId === groupId).sort((a, b) => a.name.localeCompare(b.name)),
    [allStudents, groupId]
  );
  
  const allAttendances = useDocenteStore((state) => state.attendances);
  const attendanceRecord = React.useMemo(() =>
    allAttendances.find((a) => a.groupId === groupId && a.date === date),
    [allAttendances, groupId, date]
  );

  const groups = useDocenteStore((state) => state.groups);
  const group = React.useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const allCategories = useDocenteStore((state) => state.categories);
  const categories = React.useMemo(() => allCategories.filter((c) => c.groupId === groupId), [allCategories, groupId]);
  const grades = useDocenteStore((state) => state.grades);
  const activities = useDocenteStore((state) => state.activities);

  const handleExportExcel = () => {
    exportGroupReportToExcel({
      group,
      students,
      categories,
      grades,
      attendances: allAttendances.filter((a) => a.groupId === groupId),
      activities: activities.filter((a) => a.groupId === groupId),
    });
  };

  const markAttendance = useDocenteStore((state) => state.markAttendance);
  const [records, setRecords] = useState<Record<string, boolean | "present" | "absent" | "justified">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [dayObservation, setDayObservation] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with store
  React.useEffect(() => {
    if (attendanceRecord) {
      setDayObservation(attendanceRecord.dayObservation || "");
      setNotes(attendanceRecord.notes || {});
      if (attendanceRecord.records) {
        const merged: Record<string, boolean | "present" | "absent" | "justified"> = { ...attendanceRecord.records };
        students.forEach(s => {
          if (merged[s.id] === undefined) {
            merged[s.id] = "present";
          }
        });
        setRecords(merged);
      }
    } else {
      // By default everyone present
      const initial: Record<string, "present"> = {};
      students.forEach(s => initial[s.id] = "present");
      setRecords(initial);
      setNotes({});
      setDayObservation("");
    }
  }, [attendanceRecord, students]);

  const setStatus = (studentId: string, status: "present" | "absent" | "justified") => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const setStudentNote = (studentId: string, note: string) => {
    setNotes(prev => ({ ...prev, [studentId]: note }));
  };

  const appendStudentNote = (studentId: string, preset: string) => {
    setNotes(prev => {
      const current = prev[studentId] ? prev[studentId].trim() : "";
      if (!current) return { ...prev, [studentId]: preset };
      if (current.includes(preset)) return prev;
      return { ...prev, [studentId]: `${current}, ${preset}` };
    });
  };

  const applyDayObservationToAll = () => {
    if (!dayObservation.trim()) return;
    const updatedNotes: Record<string, string> = { ...notes };
    students.forEach(s => {
      updatedNotes[s.id] = dayObservation.trim();
    });
    setNotes(updatedNotes);
  };

  const getStatus = (studentId: string): "present" | "absent" | "justified" => {
    const val = records[studentId];
    if (val === "justified") return "justified";
    if (val === true || val === "present") return "present";
    return "absent";
  };

  const handleSave = async () => {
    await markAttendance(groupId, date, records, notes, dayObservation);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.matricula.includes(search));

  const presentCount = students.filter(s => getStatus(s.id) === "present").length;
  const justifiedCount = students.filter(s => getStatus(s.id) === "justified").length;
  const absentCount = students.filter(s => getStatus(s.id) === "absent").length;

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Control de Asistencia</h3>
            <p className="text-xs text-slate-500">Registra asistencias, faltas, justificaciones y observaciones por evento.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {/* Export Excel button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200/80 transition active:scale-95 shrink-0"
              title="Descargar reporte completo en Excel con asistencias, faltas y observaciones"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
            {/* Save button also here for desktop */}
            <button onClick={handleSave} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition active:scale-95">
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>

        {/* Day Observation / Event Banner */}
        <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-3.5 mb-5 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Evento u Observación General del Día (opcional):</span>
            </div>
            {dayObservation.trim() && (
              <button 
                type="button"
                onClick={applyDayObservationToAll}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                title="Copiar esta nota en la columna de observaciones de todos los alumnos"
              >
                <span>Copiar evento a todos los alumnos</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text"
              value={dayObservation}
              onChange={(e) => setDayObservation(e.target.value)}
              placeholder="Ej. Feria de Ciencias, Torneo Deportivo, Suspensión oficial, Simulacro..."
              className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {dayObservation && (
              <button
                type="button"
                onClick={() => setDayObservation("")}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 bg-white border border-indigo-100 rounded-lg self-end sm:self-auto"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Quick presets for day event */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mr-1">Sugerencias:</span>
            {COMMON_DAY_EVENTS.map(event => (
              <button
                key={event}
                type="button"
                onClick={() => setDayObservation(event)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition active:scale-95 ${
                  dayObservation === event 
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold" 
                    : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-medium"
                }`}
              >
                {event}
              </button>
            ))}
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Asistencia y observaciones guardadas exitosamente para la fecha {date}.</span>
          </div>
        )}

        <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <span className="text-slate-600">Total: {students.length}</span>
            <span className="text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4"/> Asis: {presentCount}</span>
            <span className="text-amber-600 flex items-center gap-1"><Minus className="w-4 h-4"/> Justif: {justifiedCount}</span>
            <span className="text-rose-600 flex items-center gap-1"><X className="w-4 h-4"/> Faltas: {absentCount}</span>
            
            <div className="flex items-center gap-2 sm:border-l border-slate-200 sm:pl-4 mt-2 sm:mt-0">
              <button onClick={() => {
                const updated: Record<string, "present"> = {};
                students.forEach(s => updated[s.id] = "present");
                setRecords(updated);
              }} className="flex-1 sm:flex-none justify-center flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-sm">
                <Check className="w-3.5 h-3.5"/> Todos ✅
              </button>
              <button onClick={() => {
                const updated: Record<string, "absent"> = {};
                students.forEach(s => updated[s.id] = "absent");
                setRecords(updated);
              }} className="flex-1 sm:flex-none justify-center flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-100 bg-rose-50 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-sm">
                <X className="w-3.5 h-3.5"/> Todos ❌
              </button>
            </div>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alumno por nombre o matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="p-3 w-56 sm:w-64">Alumno</th>
                <th className="p-3 text-center w-36">Estado de Asistencia</th>
                <th className="p-3">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Observaciones / Evento</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">No se encontraron alumnos.</td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const status = getStatus(s.id);
                  const currentNote = notes[s.id] || "";
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-medium text-slate-800 text-xs sm:text-sm">
                        <div className="font-semibold text-slate-800">{s.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{s.matricula}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => setStatus(s.id, "present")}
                            title="Presente"
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${status === 'present' ? 'bg-emerald-500 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setStatus(s.id, "justified")}
                            title="Falta Justificada"
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${status === 'justified' ? 'bg-amber-500 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setStatus(s.id, "absent")}
                            title="Falta"
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${status === 'absent' ? 'bg-rose-500 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <div className="relative">
                            <input
                              type="text"
                              value={currentNote}
                              onChange={(e) => setStudentNote(s.id, e.target.value)}
                              placeholder={
                                status === "justified" 
                                  ? "Escribe motivo de justificante o evento..." 
                                  : status === "absent"
                                  ? "Motivo de inasistencia o evento..."
                                  : "Nota u observación opcional..."
                              }
                              className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 transition ${
                                status === "justified" && !currentNote
                                  ? "border-amber-300 bg-amber-50/30 focus:ring-amber-400"
                                  : status === "absent" && !currentNote
                                  ? "border-slate-200 bg-slate-50/50 focus:ring-rose-400"
                                  : "border-slate-200 bg-white focus:ring-indigo-400"
                              }`}
                            />
                            {currentNote && (
                              <button
                                type="button"
                                onClick={() => setStudentNote(s.id, "")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                                title="Borrar nota"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {/* Quick preset chips */}
                          <div className="flex flex-wrap items-center gap-1">
                            {STUDENT_NOTE_PRESETS.slice(0, 4).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => appendStudentNote(s.id, preset)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Save Button on Mobile */}
      <div className="fixed bottom-6 left-0 right-0 px-4 sm:hidden z-50 flex justify-center">
        <button 
          onClick={handleSave} 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-full shadow-xl transition active:scale-95"
        >
          <Save className="w-5 h-5" />
          Guardar Asistencia
        </button>
      </div>
    </div>
  );
}

