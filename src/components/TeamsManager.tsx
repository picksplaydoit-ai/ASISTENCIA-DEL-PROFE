import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Users, Shuffle, Plus, Trash2, X } from "lucide-react";
import { Student } from "../types";

export default function TeamsManager({ groupId }: { groupId: string }) {
  const students = useDocenteStore(state => state.students).filter(s => s.groupId === groupId);
  const teams = useDocenteStore(state => state.teams).filter(t => t.groupId === groupId);
  const createTeam = useDocenteStore(state => state.createTeam);
  const deleteTeam = useDocenteStore(state => state.deleteTeam);

  const [teamSize, setTeamSize] = useState(3);
  
  // Manual Create State
  const [showManualModal, setShowManualModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const handleRandomize = async () => {
    if (!confirm("¿Generar equipos aleatorios? Esto borrará los equipos actuales.")) return;
    
    // Delete existing teams
    for (const team of teams) {
      await deleteTeam(team.id);
    }

    // Shuffle students
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    
    let currentTeamIndex = 1;
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const chunk = shuffled.slice(i, i + teamSize);
      await createTeam(groupId, `Equipo ${currentTeamIndex}`, chunk.map(s => s.id));
      currentTeamIndex++;
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || selectedStudents.length === 0) return;
    await createTeam(groupId, newTeamName.trim(), selectedStudents);
    setShowManualModal(false);
    setNewTeamName("");
    setSelectedStudents([]);
  };

  const toggleStudentSelection = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(prev => prev.filter(s => s !== id));
    } else {
      setSelectedStudents(prev => [...prev, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Equipos de Trabajo</h3>
          <p className="text-xs text-slate-500">Genera equipos aleatorios o manuales para asignar calificaciones grupales.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowManualModal(true)} 
            className="w-full sm:w-auto flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0"
          >
            <Plus className="w-4 h-4"/> Manual
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto border-l sm:pl-3 border-slate-200">
            <input 
              type="number" 
              min="2" 
              max="10" 
              value={teamSize} 
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              className="w-16 border border-slate-200 rounded-lg p-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-500/20" 
              title="Integrantes por equipo"
            />
            <button onClick={handleRandomize} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
              <Shuffle className="w-4 h-4"/> Azar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-100">
            No hay equipos creados.
          </div>
        ) : (
          teams.map((team, idx) => {
            const teamStudents = team.studentIds.map(id => students.find(s => s.id === id)).filter(Boolean) as Student[];
            return (
              <div key={team.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <div className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-xs">{idx + 1}</div>
                    {team.name}
                  </h4>
                  <button onClick={() => deleteTeam(team.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md transition">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  {teamStudents.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="text-slate-300">•</span> {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })
        )}
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Crear Equipo Manual</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleManualCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="mb-4 shrink-0">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Equipo</label>
                <input 
                  type="text" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Ej. Los Halcones"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="flex-1 overflow-auto border rounded-lg p-2 mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2 px-1">Seleccionar Integrantes ({selectedStudents.length})</label>
                <div className="space-y-1">
                  {students.map(s => {
                    const isSelected = selectedStudents.includes(s.id);
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => toggleStudentSelection(s.id)}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition ${isSelected ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={!newTeamName || selectedStudents.length === 0} className="px-4 py-2 bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">Crear Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal Check icon since it wasn't imported from lucide-react initially in this context
function Check(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
