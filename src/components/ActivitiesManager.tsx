import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { ActivityType, Activity, Grade } from "../types";
import { Plus, Edit2, Trash2, Search, Target, Users, BookOpen, Calculator, CheckCircle, Check, X } from "lucide-react";
import { getMexicoCityDateString } from "../lib/dateUtils";

export default function ActivitiesManager({ groupId }: { groupId: string }) {
  const categories = useDocenteStore(state => state.categories).filter(c => c.groupId === groupId);
  const activities = useDocenteStore(state => state.activities).filter(a => a.groupId === groupId);
  const students = useDocenteStore(state => state.students).filter(s => s.groupId === groupId).sort((a,b) => a.name.localeCompare(b.name));
  const teams = useDocenteStore(state => state.teams).filter(t => t.groupId === groupId);
  const allGrades = useDocenteStore(state => state.grades);
  const createActivity = useDocenteStore(state => state.createActivity);
  const updateActivity = useDocenteStore(state => state.updateActivity);
  const deleteActivity = useDocenteStore(state => state.deleteActivity);
  const deleteAllActivities = useDocenteStore(state => state.deleteAllActivities);
  const saveGrade = useDocenteStore(state => state.saveGrade);
  
  const [showModal, setShowModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [type, setType] = useState<ActivityType>("numeric");
  const [totalWorks, setTotalWorks] = useState(10);
  const [isTeamActivity, setIsTeamActivity] = useState(false);
  const [date, setDate] = useState(getMexicoCityDateString());

  // Grading Modal State
  const [gradingActivity, setGradingActivity] = useState<Activity | null>(null);
  const [capturedScores, setCapturedScores] = useState<Record<string, any>>({});
  
  // Filter state
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  const filteredActivities = activities.filter(a => filterCategoryId === "all" || a.categoryId === filterCategoryId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId) return;
    if (editingActivityId) {
      await updateActivity(editingActivityId, name, type, type === "total" ? totalWorks : 0, isTeamActivity, date);
    } else {
      await createActivity(groupId, categoryId, name, type, type === "total" ? totalWorks : 0, isTeamActivity, date);
    }
    setShowModal(false);
    setEditingActivityId(null);
    setName("");
  };

  const openCreateModal = () => {
    setName("");
    setCategoryId(categories[0]?.id || "");
    setType("numeric");
    setTotalWorks(10);
    setIsTeamActivity(false);
    setDate(getMexicoCityDateString());
    setEditingActivityId(null);
    setShowModal(true);
  };

  const openEditModal = (act: Activity) => {
    setName(act.name);
    setCategoryId(act.categoryId);
    setType(act.type);
    setTotalWorks(act.totalWorks || 10);
    setIsTeamActivity(act.isTeamActivity || false);
    setDate(act.date || getMexicoCityDateString());
    setEditingActivityId(act.id);
    setShowModal(true);
  };

  const openGrading = (act: Activity) => {
    const scores: Record<string, any> = {};
    if (act.isTeamActivity) {
      teams.forEach(t => {
        // Find if any student in team has a grade
        const firstStudent = t.studentIds[0];
        const grade = allGrades.find(g => g.activityId === act.id && g.studentId === firstStudent);
        if (grade) {
          if (act.type === 'numeric') scores[t.id] = grade.grade?.toString() || "";
          else if (act.type === 'boolean') scores[t.id] = !!grade.delivered;
          else if (act.type === 'total') scores[t.id] = grade.deliveredWorks?.toString() || "0";
        } else {
          scores[t.id] = act.type === 'boolean' ? false : "";
        }
      });
    } else {
      students.forEach(s => {
        const grade = allGrades.find(g => g.activityId === act.id && g.studentId === s.id);
        if (grade) {
          if (act.type === 'numeric') scores[s.id] = grade.grade?.toString() || "";
          else if (act.type === 'boolean') scores[s.id] = !!grade.delivered;
          else if (act.type === 'total') scores[s.id] = grade.deliveredWorks?.toString() || "0";
        } else {
          scores[s.id] = act.type === 'boolean' ? false : "";
        }
      });
    }
    setCapturedScores(scores);
    setGradingActivity(act);
  };

  const handleSaveGrades = async () => {
    if (!gradingActivity) return;
    
    const isNum = gradingActivity.type === 'numeric';
    const isBool = gradingActivity.type === 'boolean';
    const isTot = gradingActivity.type === 'total';

    const saveForStudent = async (studentId: string, val: any) => {
      let numericGrade = 0;
      let delivered = false;
      let deliveredWorks = 0;

      if (isNum) {
        if (val === "") return; // Skip
        numericGrade = parseFloat(val);
        if (isNaN(numericGrade)) return;
      } else if (isBool) {
        delivered = !!val;
        numericGrade = delivered ? 100 : 0;
      } else if (isTot) {
        if (val === "") return;
        deliveredWorks = parseInt(val);
        if (isNaN(deliveredWorks)) return;
        const total = gradingActivity.totalWorks || 1;
        numericGrade = Math.min(100, Math.round((deliveredWorks / total) * 100));
      }

      await saveGrade(
        studentId, 
        gradingActivity.categoryId, 
        gradingActivity.name, 
        numericGrade, 
        gradingActivity.id,
        delivered,
        deliveredWorks
      );
    };

    if (gradingActivity.isTeamActivity) {
      for (const t of teams) {
        const val = capturedScores[t.id];
        for (const sId of t.studentIds) {
          await saveForStudent(sId, val);
        }
      }
    } else {
      for (const s of students) {
        const val = capturedScores[s.id];
        await saveForStudent(s.id, val);
      }
    }
    setGradingActivity(null);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-800">Gestor de Actividades</h3>
          <p className="text-xs text-slate-500">Define las actividades a calificar en cada categoría.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={async () => {
              if (activities.length === 0) return;
              if (confirm("¿Estás seguro de que deseas eliminar TODAS las actividades de este grupo? Las calificaciones asociadas se perderán.")) {
                await deleteAllActivities(groupId);
              }
            }}
            disabled={activities.length === 0}
            className="w-full sm:w-auto flex justify-center items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Eliminar Todas
          </button>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="w-full sm:w-auto text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button onClick={openCreateModal} className="w-full sm:w-auto flex justify-center items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0">
            <Plus className="w-4 h-4"/> Nueva Actividad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredActivities.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-100">
            No hay actividades en esta vista.
          </div>
        ) : (
          filteredActivities.map(act => {
            const cat = categories.find(c => c.id === act.categoryId);
            return (
              <div key={act.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                    <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">{cat?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(act)} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-md transition">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => openGrading(act)} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-semibold rounded transition">
                      Calificar
                    </button>
                    <button onClick={() => deleteActivity(act.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md transition">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
                  <div className="flex items-center gap-1.5"><CalendarIcon date={act.date} /> {act.date}</div>
                  <div className="flex items-center gap-1.5">
                    {act.isTeamActivity ? <Users className="w-3.5 h-3.5 text-blue-500"/> : <Target className="w-3.5 h-3.5 text-slate-400"/>}
                    {act.isTeamActivity ? "Por Equipos" : "Individual"}
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 mt-1">
                    <Calculator className="w-3.5 h-3.5"/> 
                    Tipo: <strong className="text-slate-700">
                      {act.type === 'numeric' ? 'Calificación 0-100' : 
                       act.type === 'boolean' ? 'Entregado / No Entregado' : 
                       `Trabajos Totales (${act.totalWorks})`}
                    </strong>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingActivityId ? "Editar Actividad" : "Nueva Actividad"}</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg" placeholder="Ej. Ensayo 1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2 rounded-lg">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Calificación</label>
                <select value={type} onChange={e => setType(e.target.value as ActivityType)} className="w-full border p-2 rounded-lg">
                  <option value="numeric">Numérica (0 a 100)</option>
                  <option value="boolean">Entregado / No Entregado</option>
                  <option value="total">Trabajos Totales (porcentaje base a N trabajos)</option>
                </select>
              </div>
              {type === "total" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cantidad Total de Trabajos</label>
                  <input required type="number" min="1" value={totalWorks} onChange={e => setTotalWorks(parseInt(e.target.value))} className="w-full border p-2 rounded-lg" />
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="teamAct" checked={isTeamActivity} onChange={e => setIsTeamActivity(e.target.checked)} className="rounded" />
                <label htmlFor="teamAct" className="text-sm font-medium text-slate-700">Es actividad por equipos</label>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Guardar Actividad</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gradingActivity && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-500"/>
              Calificar: {gradingActivity.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded border">
              Tipo: {gradingActivity.type === 'numeric' ? '0 a 100' : gradingActivity.type === 'boolean' ? 'Entregado / No Entregado' : `Trabajos (Máx ${gradingActivity.totalWorks})`}
            </p>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto border rounded-lg mb-4">
              <table className="w-full text-sm text-left min-w-[280px]">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="p-3 text-slate-500 font-bold">{gradingActivity.isTeamActivity ? "Equipo" : "Alumno"}</th>
                    <th className="p-3 text-slate-500 font-bold text-right w-40">Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gradingActivity.isTeamActivity ? (
                    teams.map(t => {
                      const teamStudents = students.filter(s => t.studentIds.includes(s.id));
                      const sampleStudent = teamStudents.length > 0 ? teamStudents[0].name.split(" ").slice(-2).join(" ") : "Sin alumnos";
                      
                      return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">
                          {t.name}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {t.studentIds.length} integrantes (Ej. {sampleStudent})
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <GradeInput type={gradingActivity.type} val={capturedScores[t.id]} setVal={(v: any) => setCapturedScores(prev => ({...prev, [t.id]: v}))} max={gradingActivity.totalWorks} />
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">
                          {s.name}
                        </td>
                        <td className="p-3 text-right">
                          <GradeInput type={gradingActivity.type} val={capturedScores[s.id]} setVal={(v: any) => setCapturedScores(prev => ({...prev, [s.id]: v}))} max={gradingActivity.totalWorks} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t mt-auto">
              <button onClick={() => setGradingActivity(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSaveGrades} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition">Guardar Calificaciones</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GradeInput({ type, val, setVal, max }: { type: ActivityType, val: any, setVal: (v: any) => void, max?: number }) {
  if (type === 'boolean') {
    return (
      <div className="flex justify-end w-full">
        <button 
          onClick={() => setVal(!val)} 
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${val ? 'bg-emerald-500 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          {val ? <Check className="w-5 h-5"/> : <X className="w-5 h-5"/>}
        </button>
      </div>
    )
  }
  if (type === 'total') {
    return (
      <div className="flex items-center justify-end w-full gap-2">
        <input 
          type="number" 
          min="0" 
          max={max} 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          className="w-16 sm:w-20 border border-slate-200 rounded-lg p-2 text-center text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
        />
        <span className="text-xs sm:text-sm text-slate-400 font-bold">/ {max}</span>
      </div>
    )
  }
  return (
    <div className="flex justify-end w-full">
      <input 
        type="number" 
        min="0" 
        max="100" 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        className="w-20 sm:w-24 border border-slate-200 rounded-lg p-2 text-center text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
        placeholder="0-100" 
      />
    </div>
  );
}

function CalendarIcon({ date }: { date: string }) {
  return <BookOpen className="w-3.5 h-3.5 text-emerald-500" />;
}
