import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Calendar, Check, X, Search, Save, AlertCircle } from "lucide-react";

interface AttendanceManagerProps {
  groupId: string;
}

export default function AttendanceManager({ groupId }: AttendanceManagerProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
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

  const markAttendance = useDocenteStore((state) => state.markAttendance);
  const [records, setRecords] = useState<Record<string, boolean>>({});

  // Sync state with store
  React.useEffect(() => {
    if (attendanceRecord) {
      setRecords(attendanceRecord.records);
    } else {
      // By default everyone present
      const initial: Record<string, boolean> = {};
      students.forEach(s => initial[s.id] = true);
      setRecords(initial);
    }
  }, [attendanceRecord, students]);

  const handleToggle = (studentId: string) => {
    setRecords(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSave = async () => {
    await markAttendance(groupId, date, records);
    alert("Asistencia guardada exitosamente.");
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.matricula.includes(search));

  const presentCount = Object.values(records).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">Control de Asistencia</h3>
            <p className="text-xs text-slate-500">Registra y consulta las faltas de tus alumnos.</p>
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
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition">
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          <div className="flex items-center gap-4 text-sm font-medium flex-wrap">
            <span className="text-slate-600">Total: {students.length}</span>
            <span className="text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4"/> Asistencias: {presentCount}</span>
            <span className="text-rose-600 flex items-center gap-1"><X className="w-4 h-4"/> Faltas: {absentCount}</span>
            
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
              <button onClick={() => {
                const updated: Record<string, boolean> = {};
                students.forEach(s => updated[s.id] = true);
                setRecords(updated);
              }} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition">
                Todos Presentes
              </button>
              <button onClick={() => {
                const updated: Record<string, boolean> = {};
                students.forEach(s => updated[s.id] = false);
                setRecords(updated);
              }} className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded transition">
                Todos Faltas
              </button>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alumno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="p-3">Matrícula</th>
                <th className="p-3">Alumno</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No se encontraron alumnos.</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-mono text-xs text-slate-500">{s.matricula}</td>
                    <td className="p-3 font-medium text-slate-800">{s.name}</td>
                    <td className="p-3 text-center">
                      {records[s.id] ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                          <Check className="w-3 h-3" /> Presente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold">
                          <X className="w-3 h-3" /> Falta
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleToggle(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${records[s.id] ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {records[s.id] ? 'Marcar Falta' : 'Marcar Presente'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
